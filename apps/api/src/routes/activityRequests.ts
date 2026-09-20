import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthedRequest } from "../lib/auth.js";
import { notify } from "../lib/notify.js";
import { emitToUser } from "../sockets/chat.js";

export const activityRequestsRouter = Router();
activityRequestsRouter.use(requireAuth);

const createSchema = z.union([
  z.object({ postId: z.string(), slotId: z.string() }),
  z.object({
    targetUserId: z.string(),
    activityId: z.string(),
    // F7 (Round 2): the specific day+time the requester picked from the
    // target's availability calendar, shown back to them in F8.
    selectedDayOfWeek: z.number().min(0).max(6).optional(),
    selectedStartTime: z.string().optional(),
    selectedEndTime: z.string().optional(),
  }),
]);

// F7 (legacy post flow) + F3/F4 (direct flow, sent from a discovered profile
// straight to that person for a sport, no Activity Post involved). Unique
// constraints on (requester, post, pending) and (requester, target, activity,
// pending) block duplicates; re-submitting the same tuple is idempotent.
activityRequestsRouter.post("/", async (req: AuthedRequest, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  if ("postId" in parsed.data) {
    const { postId, slotId } = parsed.data;
    const existing = await prisma.activityRequest.findFirst({ where: { requesterId: req.userId!, postId, status: "pending" } });
    if (existing) {
      res.status(200).json(existing);
      return;
    }
    const post = await prisma.activityPost.findUniqueOrThrow({ where: { id: postId } });
    const request = await prisma.activityRequest.create({
      data: { requesterId: req.userId!, postId, slotId, activityId: post.activityId, status: "pending" },
    });
    notify(post.authorId, "activity_request_received", { message: "You have a new activity request." }, `/requests`);
    broadcastPendingCount(post.authorId);
    res.status(201).json(request);
    return;
  }

  const { targetUserId, activityId, selectedDayOfWeek, selectedStartTime, selectedEndTime } = parsed.data;
  const existing = await prisma.activityRequest.findFirst({
    where: { requesterId: req.userId!, targetUserId, activityId, status: "pending" },
  });
  if (existing) {
    res.status(200).json(existing);
    return;
  }
  const request = await prisma.activityRequest.create({
    data: { requesterId: req.userId!, targetUserId, activityId, selectedDayOfWeek, selectedStartTime, selectedEndTime, status: "pending" },
  });
  notify(targetUserId, "activity_request_received", { message: "You have a new activity request." }, `/requests`);
  broadcastPendingCount(targetUserId);
  res.status(201).json(request);
});

function recipientId(request: { post: { authorId: string } | null; targetUserId: string | null }): string {
  return request.post?.authorId ?? request.targetUserId!;
}

// Round 7, Fix 3: the requester's selected day+time (F7) already IS the
// concrete slot to auto-schedule on approval — reused instead of adding a
// separate requestedDate/requestedTime pair, since it's the same information.
function nextOccurrence(dayOfWeek: number, startTime: string): Date {
  const [hours, minutes] = startTime.split(":").map(Number);
  const result = new Date();
  result.setHours(hours, minutes, 0, 0);
  let daysUntil = (dayOfWeek - result.getDay() + 7) % 7;
  if (daysUntil === 0 && result.getTime() <= Date.now()) daysUntil = 7;
  result.setDate(result.getDate() + daysUntil);
  return result;
}

// Bug fix batch 3, section 7: pending-count badge, pushed to the recipient's
// socket room in real time and available here as the poll/on-open fallback.
async function pendingCountFor(userId: string): Promise<number> {
  return prisma.activityRequest.count({ where: { status: "pending", OR: [{ post: { authorId: userId } }, { targetUserId: userId }] } });
}

async function broadcastPendingCount(userId: string): Promise<void> {
  emitToUser(userId, "requests:count", await pendingCountFor(userId));
}

activityRequestsRouter.get("/pending/count", async (req: AuthedRequest, res) => {
  res.json({ count: await pendingCountFor(req.userId!) });
});

// F8: pending queue for whoever the request was sent to (post owner, or the
// directly-targeted user).
activityRequestsRouter.get("/pending", async (req: AuthedRequest, res) => {
  const requests = await prisma.activityRequest.findMany({
    where: { status: "pending", OR: [{ post: { authorId: req.userId! } }, { targetUserId: req.userId! }] },
    include: { requester: { include: { profile: true } }, slot: true, activity: true, post: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(requests);
});

// F8: "sent" queue for the requester — their own requests, pending or approved
// (rejected ones simply aren't returned, so they fall out of this tab on their own).
// Approved requests carry the chatId the approval created/reopened, so the client
// can offer a "Start a chat" CTA straight from here. Covers both the post flow
// and the direct-to-user flow, since either can be the recipient here.
activityRequestsRouter.get("/sent", async (req: AuthedRequest, res) => {
  const requests = await prisma.activityRequest.findMany({
    where: { requesterId: req.userId!, status: { in: ["pending", "approved"] } },
    include: {
      post: { include: { author: { include: { profile: true } } } },
      targetUser: { include: { profile: true } },
      slot: true,
      activity: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const withChat = await Promise.all(
    requests.map(async (request) => {
      if (request.status !== "approved") return { ...request, chatId: null };
      const [userAId, userBId] = [recipientId(request), request.requesterId].sort();
      // One chat per pair (bug fix batch 3, section 1) — no longer scoped by sport.
      const chat = await prisma.chat.findUnique({
        where: { userAId_userBId: { userAId, userBId } },
        select: { id: true },
      });
      return { ...request, chatId: chat?.id ?? null };
    }),
  );

  res.json(withChat);
});

// F8: approve — transactional: request -> approved, (post flow only) slot ->
// filled + post inactive once full, chat created (reopening a previously-
// closed chat with the same pair instead of duplicating), notification async.
activityRequestsRouter.post("/:id/approve", async (req: AuthedRequest, res) => {
  const request = await prisma.activityRequest.findUniqueOrThrow({
    where: { id: req.params.id },
    include: { post: true, activity: true },
  });
  if (recipientId(request) !== req.userId) {
    res.status(403).json({ error: "Not the request recipient" });
    return;
  }

  // Direct flow only (F3/F4): cap approvals at the recipient's own
  // "how many partners" setting for this sport. Each approval still gets its
  // own 1:1 chat with the recipient (a single shared group chat needs the
  // chat_participants restructuring tracked separately for Communities).
  if (request.targetUserId) {
    const post = await prisma.activityPost.findUnique({
      where: { authorId_activityId: { authorId: request.targetUserId, activityId: request.activityId } },
    });
    const maxParticipants = post?.maxParticipants ?? 1;
    const approvedCount = await prisma.activityRequest.count({
      where: { targetUserId: request.targetUserId, activityId: request.activityId, status: "approved" },
    });
    if (approvedCount >= maxParticipants) {
      res.status(409).json({ error: "This activity is full" });
      return;
    }
  }

  const [userAId, userBId] = [recipientId(request), request.requesterId].sort();

  // Bug fix batch 3, section 1: exactly one chat per pair — a second sport
  // between the same two people adds a ChatSport row to that same chat
  // instead of creating a new thread.
  const { chat, autoScheduled } = await prisma.$transaction(async (tx) => {
    await tx.activityRequest.update({ where: { id: request.id }, data: { status: "approved", decidedAt: new Date() } });

    if (request.postId && request.slotId) {
      await tx.activityPostSlot.update({ where: { id: request.slotId }, data: { isFilled: true } });
      const remainingOpenSlots = await tx.activityPostSlot.count({ where: { postId: request.postId, isFilled: false } });
      if (remainingOpenSlots === 0) {
        await tx.activityPost.update({ where: { id: request.postId }, data: { status: "inactive" } });
      }
    }

    const existingChat = await tx.chat.findUnique({ where: { userAId_userBId: { userAId, userBId } } });
    const chat = existingChat
      ? await (async () => {
          await tx.chatSport.upsert({
            where: { chatId_activityId: { chatId: existingChat.id, activityId: request.activityId } },
            update: {},
            create: { chatId: existingChat.id, activityId: request.activityId, activityRequestId: request.id },
          });
          return tx.chat.update({ where: { id: existingChat.id }, data: { isClosed: false } });
        })()
      : await tx.chat.create({
          data: {
            userAId,
            userBId,
            originatingRequestId: request.id,
            sports: { create: { activityId: request.activityId, activityRequestId: request.id } },
            messages: {
              create: {
                type: "template",
                body: "Hey! I think we can do this activity together — which time would you prefer?",
              },
            },
          },
        });

    // Round 7, Fix 3: the request already carries a specific day+time (F7) —
    // auto-create the Event on approval instead of leaving the chat with
    // nothing scheduled, unless this sport is already scheduled in this chat.
    let autoScheduled: { scheduledAt: Date; isFirst: boolean } | null = null;
    if (request.selectedDayOfWeek != null && request.selectedStartTime) {
      const alreadyScheduled = await tx.trainingSession.findFirst({
        where: { chatId: chat.id, activityId: request.activityId, status: "scheduled" },
      });
      if (!alreadyScheduled) {
        const priorCompleted = await tx.trainingSession.findFirst({ where: { chatId: chat.id, status: "completed" } });
        const scheduledAt = nextOccurrence(request.selectedDayOfWeek, request.selectedStartTime);
        const training = await tx.trainingSession.create({
          data: {
            chatId: chat.id,
            hostId: recipientId(request),
            participantId: request.requesterId,
            activityId: request.activityId,
            scheduledAt,
            isFirstBetweenUsers: !priorCompleted,
          },
        });

        // Same as F13 in training.ts's manual "Schedule Event" flow — this
        // auto-created Event was skipping it, so a request's first session
        // never got a challenge card while every later, manually-scheduled
        // one did.
        const pool = await tx.challenge.findMany({ where: { activityId: request.activityId, isActive: true } });
        if (pool.length > 0) {
          const challenge = pool[Math.floor(Math.random() * pool.length)];
          await tx.trainingChallenge.create({ data: { trainingId: training.id, challengeId: challenge.id } });
          await tx.message.create({
            data: { chatId: chat.id, type: "system", body: `Challenge: ${challenge.content}`, trainingId: training.id },
          });
        }

        autoScheduled = { scheduledAt, isFirst: !priorCompleted };
      }
    }

    return { chat, autoScheduled };
  });

  if (autoScheduled) {
    const weekday = autoScheduled.scheduledAt.toLocaleDateString([], { weekday: "long" });
    const dateLabel = autoScheduled.scheduledAt.toLocaleDateString([], { day: "numeric", month: "short" });
    const timeLabel = autoScheduled.scheduledAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const lead = autoScheduled.isFirst ? "your first" : "a";
    await prisma.message.create({
      data: {
        chatId: chat.id,
        type: "system",
        body: `You've scheduled ${lead} ${request.activity.name} session! 🎾 ${weekday} ${dateLabel} · ${timeLabel}`,
      },
    });
  }

  notify(request.requesterId, "activity_request_approved", { message: "Your activity request was approved!" }, `/chat/${chat.id}`);
  broadcastPendingCount(req.userId!);
  res.json({ request: { ...request, status: "approved" }, chat });
});

// F8: decline — request removed from queue, requester notified.
activityRequestsRouter.post("/:id/reject", async (req: AuthedRequest, res) => {
  const request = await prisma.activityRequest.findUniqueOrThrow({
    where: { id: req.params.id },
    include: { post: true },
  });
  if (recipientId(request) !== req.userId) {
    res.status(403).json({ error: "Not the request recipient" });
    return;
  }
  await prisma.activityRequest.update({ where: { id: request.id }, data: { status: "rejected", decidedAt: new Date() } });
  notify(request.requesterId, "activity_request_rejected", { message: "Your activity request was declined." });
  broadcastPendingCount(req.userId!);
  res.json({ ok: true });
});
