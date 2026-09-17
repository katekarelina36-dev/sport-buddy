import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthedRequest } from "../lib/auth.js";

export const chatsRouter = Router();
chatsRouter.use(requireAuth);

// F10: only chats from approved requests exist at all; sorted by recency.
chatsRouter.get("/", async (req: AuthedRequest, res) => {
  const chats = await prisma.chat.findMany({
    where: { OR: [{ userAId: req.userId! }, { userBId: req.userId! }] },
    include: {
      userA: { include: { profile: true } },
      userB: { include: { profile: true } },
      activity: true,
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      reads: { where: { userId: req.userId! } },
    },
    orderBy: { lastMessageAt: "desc" },
  });

  const withUnread = await Promise.all(
    chats.map(async (chat) => {
      const lastReadAt = chat.reads[0]?.lastReadAt ?? new Date(0);
      const unreadCount = await prisma.message.count({ where: { chatId: chat.id, createdAt: { gt: lastReadAt } } });
      return { ...chat, unreadCount };
    })
  );

  res.json(withUnread);
});

// F11: chat detail + paginated history (last 30, lazy-load older).
chatsRouter.get("/:id", async (req: AuthedRequest, res) => {
  const cursor = req.query.cursor as string | undefined;
  const chat = await prisma.chat.findUniqueOrThrow({
    where: { id: req.params.id },
    include: {
      userA: { include: { profile: true } },
      userB: { include: { profile: true } },
      activity: true,
      trainingSessions: { include: { challenge: { include: { challenge: true } } }, orderBy: { scheduledAt: "desc" } },
    },
  });
  const messages = await prisma.message.findMany({
    where: { chatId: chat.id },
    orderBy: { createdAt: "desc" },
    take: 30,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  res.json({ chat, messages: messages.reverse() });
});

chatsRouter.post("/:id/read", async (req: AuthedRequest, res) => {
  await prisma.chatRead.upsert({
    where: { chatId_userId: { chatId: req.params.id, userId: req.userId! } },
    update: { lastReadAt: new Date() },
    create: { chatId: req.params.id, userId: req.userId!, lastReadAt: new Date() },
  });
  res.json({ ok: true });
});

const sendMessageSchema = z.object({ body: z.string().min(1) });

// REST fallback for sending a message when the socket connection is unavailable
// (spec: "fallback to push+poll if socket unavailable"). Real-time path is
// sockets/chat.ts.
chatsRouter.post("/:id/messages", async (req: AuthedRequest, res) => {
  const parsed = sendMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const message = await prisma.message.create({
    data: { chatId: req.params.id, senderId: req.userId!, body: parsed.data.body, type: "text" },
  });
  await prisma.chat.update({ where: { id: req.params.id }, data: { lastMessageAt: new Date() } });
  res.status(201).json(message);
});
