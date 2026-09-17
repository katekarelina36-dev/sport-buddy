import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthedRequest } from "../lib/auth.js";
import { notify } from "../lib/notify.js";

export const activityRequestsRouter = Router();
activityRequestsRouter.use(requireAuth);

// F7: create an Activity Request; unique (requester, post, pending) blocks
// duplicates, and re-submitting the same tuple is idempotent (survives retries).
activityRequestsRouter.post("/", async (req: AuthedRequest, res) => {
  const schema = z.object({ postId: z.string(), slotId: z.string() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { postId, slotId } = parsed.data;

  const existing = await prisma.activityRequest.findFirst({
    where: { requesterId: req.userId!, postId, status: "pending" },
  });
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
});

// F8: pending queue for the Activity Post owner.
activityRequestsRouter.get("/pending", async (req: AuthedRequest, res) => {
  const requests = await prisma.activityRequest.findMany({
    where: { status: "pending", post: { authorId: req.userId! } },
    include: { requester: { include: { profile: true } }, slot: true, activity: true, post: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(requests);
});

// F8: approve — transactional: request -> approved, slot -> filled, chat created
// (reopening a previously-closed chat with the same pair instead of duplicating),
// post -> inactive once all slots are filled, notification dispatched async.
activityRequestsRouter.post("/:id/approve", async (req: AuthedRequest, res) => {
  const request = await prisma.activityRequest.findUniqueOrThrow({
    where: { id: req.params.id },
    include: { post: true },
  });
  if (request.post.authorId !== req.userId) {
    res.status(403).json({ error: "Not the post owner" });
    return;
  }

  const [userAId, userBId] = [request.post.authorId, request.requesterId].sort();

  const chat = await prisma.$transaction(async (tx) => {
    await tx.activityRequest.update({ where: { id: request.id }, data: { status: "approved", decidedAt: new Date() } });
    await tx.activityPostSlot.update({ where: { id: request.slotId }, data: { isFilled: true } });

    const remainingOpenSlots = await tx.activityPostSlot.count({ where: { postId: request.postId, isFilled: false } });
    if (remainingOpenSlots === 0) {
      await tx.activityPost.update({ where: { id: request.postId }, data: { status: "inactive" } });
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
  if (request.post.authorId !== req.userId) {
    res.status(403).json({ error: "Not the post owner" });
    return;
  }
  await prisma.activityRequest.update({ where: { id: request.id }, data: { status: "rejected", decidedAt: new Date() } });
  notify(request.requesterId, "activity_request_rejected", { message: "Your activity request was declined." });
  res.json({ ok: true });
});
