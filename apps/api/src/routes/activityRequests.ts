import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthedRequest } from "../lib/auth.js";
import { notify } from "../lib/notify.js";

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
  res.status(201).json(request);
});

function recipientId(request: { post: { authorId: string } | null; targetUserId: string | null }): string {
  return request.post?.authorId ?? request.targetUserId!;
}

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

// F8: approve — transactional: request -> approved, (post flow only) slot ->
// filled + post inactive once full, chat created (reopening a previously-
// closed chat with the same pair instead of duplicating), notification async.
activityRequestsRouter.post("/:id/approve", async (req: AuthedRequest, res) => {
  const request = await prisma.activityRequest.findUniqueOrThrow({
    where: { id: req.params.id },
    include: { post: true },
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

  const chat = await prisma.$transaction(async (tx) => {
    await tx.activityRequest.update({ where: { id: request.id }, data: { status: "approved", decidedAt: new Date() } });

    if (request.postId && request.slotId) {
      await tx.activityPostSlot.update({ where: { id: request.slotId }, data: { isFilled: true } });
      const remainingOpenSlots = await tx.activityPostSlot.count({ where: { postId: request.postId, isFilled: false } });
      if (remainingOpenSlots === 0) {
        await tx.activityPost.update({ where: { id: request.postId }, data: { status: "inactive" } });
      }
    }

    const existingChat = await tx.chat.findFirst({
      where: { userAId, userBId, activityId: request.activityId },
    });
    if (existingChat) {
      return tx.chat.update({ where: { id: existingChat.id }, data: { isClosed: false } });
    }

    return tx.chat.create({
      data: {
        userAId,
        userBId,
        activityId: request.activityId,
        originatingRequestId: request.id,
        messages: {
          create: {
            type: "template",
            body: "Hey! I think we can do this activity together — which time would you prefer?",
          },
        },
      },
    });
  });

  notify(request.requesterId, "activity_request_approved", { message: "Your activity request was approved!" }, `/chat/${chat.id}`);
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
  res.json({ ok: true });
});
