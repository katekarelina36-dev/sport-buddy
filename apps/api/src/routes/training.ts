import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthedRequest } from "../lib/auth.js";
import { calendarDriver } from "../lib/calendar.js";
import { notify } from "../lib/notify.js";
import { enqueue } from "../lib/queue.js";

export const trainingRouter = Router();
trainingRouter.use(requireAuth);

const scheduleSchema = z.object({
  chatId: z.string(),
  activityId: z.string(),
  scheduledAt: z.string().datetime(),
  locationText: z.string().optional(),
  isRecurring: z.boolean().default(false),
  recurrenceRule: z.string().optional(), // e.g. "FREQ=WEEKLY;COUNT=8"
});

// F12: create an Event ("Schedule Event"). Calendar sync is async — the API
// returns immediately with calendarSyncStatus="pending" and the client shows a
// non-blocking success state; the sync result lands via a follow-up read.
// F13: a challenge card is selected + attached synchronously in the same request.
trainingRouter.post("/", async (req: AuthedRequest, res) => {
  const parsed = scheduleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { chatId, activityId, scheduledAt, locationText, isRecurring, recurrenceRule } = parsed.data;

  const chat = await prisma.chat.findUniqueOrThrow({ where: { id: chatId } });
  if (chat.isClosed) {
    res.status(409).json({ error: "Chat is closed; cannot schedule further events" });
    return;
  }

  const training = await prisma.trainingSession.create({
    data: {
      chatId,
      hostId: req.userId!,
      participantId: chat.userAId === req.userId ? chat.userBId : chat.userAId,
      activityId,
      scheduledAt: new Date(scheduledAt),
      locationText,
      isRecurring,
      recurrenceRule,
    },
  });

  // F13: random challenge from the activity's pool, posted synchronously as a system message.
  const pool = await prisma.challenge.findMany({ where: { activityId, isActive: true } });
  if (pool.length > 0) {
    const challenge = pool[Math.floor(Math.random() * pool.length)];
    await prisma.trainingChallenge.create({ data: { trainingId: training.id, challengeId: challenge.id } });
    await prisma.message.create({
      data: { chatId, type: "system", body: `Challenge: ${challenge.content}` },
    });
  }

  // F12: calendar sync is async so it never blocks the "Event scheduled" success state.
  enqueue(async () => {
    const result = await calendarDriver.createEvent({
      userId: training.hostId,
      provider: "google",
      title: `Sport Buddy: ${activityId}`,
      startAt: training.scheduledAt,
      location: locationText,
    });
    await prisma.trainingSession.update({
      where: { id: training.id },
      data: { calendarSyncStatus: result.status, externalCalendarEventId: result.externalEventId },
    });
  });

  notify(training.participantId, "training_created", { message: "A new event was scheduled." }, `/chat/${chatId}`);
  res.status(201).json(training);
});

const rescheduleSchema = z.object({
  scheduledAt: z.string().datetime(),
  locationText: z.string().optional(),
});

// Bug fix batch, section 5: tapping the chat's sticky banner re-opens the
// Schedule Event sheet "in edit mode" for the currently-scheduled Event.
trainingRouter.patch("/:id", async (req: AuthedRequest, res) => {
  const parsed = rescheduleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const training = await prisma.trainingSession.update({
    where: { id: req.params.id },
    data: { scheduledAt: new Date(parsed.data.scheduledAt), locationText: parsed.data.locationText },
  });
  res.json(training);
});

trainingRouter.post("/:id/cancel", async (req: AuthedRequest, res) => {
  await prisma.trainingSession.update({ where: { id: req.params.id }, data: { status: "cancelled" } });
  res.json({ ok: true });
});

const completeSchema = z.object({
  didHappen: z.boolean(),
  wouldPlayAgain: z.boolean(),
  reasonIfNo: z.string().optional(),
});

async function closeChatOnce(chatId: string): Promise<void> {
  const chat = await prisma.chat.findUniqueOrThrow({ where: { id: chatId } });
  if (chat.isClosed) return;
  await prisma.$transaction([
    prisma.chat.update({ where: { id: chatId }, data: { isClosed: true } }),
    prisma.message.create({ data: { chatId, type: "system", body: "This chat has been closed." } }),
  ]);
}

// Bug fix batch 2, Bug 1: "Did this session take place?" / "Would you play
// again?" now applies to every completed Event, not just the first — a
// unilateral "No" closes the chat right away (no reason to wait for the
// other side); a "Yes" either resolves immediately (if the other side has
// already answered) or leaves the Event "scheduled" with this user's answer
// recorded, so the client can show "waiting for them to confirm" (Case C).
trainingRouter.post("/:id/complete", async (req: AuthedRequest, res) => {
  const parsed = completeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const training = await prisma.trainingSession.findUniqueOrThrow({ where: { id: req.params.id } });
  const isHost = training.hostId === req.userId;
  const { didHappen, wouldPlayAgain, reasonIfNo } = parsed.data;

  const updated = await prisma.trainingSession.update({
    where: { id: training.id },
    data: isHost
      ? { completedByUserA: true, didHappenA: didHappen, wouldPlayAgainA: wouldPlayAgain, reasonNoA: reasonIfNo }
      : { completedByUserB: true, didHappenB: didHappen, wouldPlayAgainB: wouldPlayAgain, reasonNoB: reasonIfNo },
  });

  const otherAlreadyResponded = isHost ? updated.completedByUserB : updated.completedByUserA;

  if (!wouldPlayAgain) {
    // Case B: this user alone can end it.
    await prisma.trainingSession.update({ where: { id: training.id }, data: { status: "completed", completedAt: new Date() } });
    await closeChatOnce(training.chatId);
  } else if (otherAlreadyResponded) {
    const bothHappened = Boolean(updated.didHappenA && updated.didHappenB);
    const bothWantToContinue = Boolean(updated.wouldPlayAgainA && updated.wouldPlayAgainB);
    await prisma.trainingSession.update({ where: { id: training.id }, data: { status: "completed", completedAt: new Date() } });

    if (bothHappened) {
      // Event-driven counter update (outbox-style): increment via queued job, not inline read-modify-write.
      enqueue(async () => {
        await prisma.userProfile.update({ where: { userId: training.hostId }, data: { successfulTrainingsCount: { increment: 1 } } });
        await prisma.userProfile.update({ where: { userId: training.participantId }, data: { successfulTrainingsCount: { increment: 1 } } });
      });
    }
    if (!bothWantToContinue) {
      await closeChatOnce(training.chatId);
    }
  }
  // else: Case C — this user said yes, the other hasn't answered yet; the
  // Event stays "scheduled" and completedByUser{A,B} alone signals the wait.

  res.json(await prisma.trainingSession.findUniqueOrThrow({ where: { id: training.id } }));
});
