import type { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import { env } from "../lib/env.js";

interface AuthedSocket extends Socket {
  userId?: string;
}

let ioInstance: Server | null = null;

// F11: real-time messaging over WebSocket, <300ms send/receive target; falls
// back to REST (routes/chats.ts) + push when the socket is unavailable.
export function attachChatGateway(io: Server): void {
  ioInstance = io;

  io.use((socket: AuthedSocket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) throw new Error("missing token");
      const payload = jwt.verify(token, env.jwtSecret) as { sub: string };
      socket.userId = payload.sub;
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket: AuthedSocket) => {
    // Bug fix batch 3, section 7: a per-user room so the API can push
    // updates (e.g. the pending-requests badge count) outside of any chat.
    socket.join(userRoomFor(socket.userId!));

    socket.on("chat:join", (chatId: string) => {
      socket.join(roomFor(chatId));
    });

    socket.on("chat:message", async (payload: { chatId: string; body: string }) => {
      const message = await prisma.message.create({
        data: { chatId: payload.chatId, senderId: socket.userId!, body: payload.body, type: "text" },
      });
      await prisma.chat.update({ where: { id: payload.chatId }, data: { lastMessageAt: new Date() } });
      io.to(roomFor(payload.chatId)).emit("chat:message", message);
    });

    // Communities: same real-time pattern as 1:1 chat, scoped to a community room.
    socket.on("community:join", (communityId: string) => {
      socket.join(communityRoomFor(communityId));
    });

    socket.on("community:message", async (payload: { communityId: string; body: string }) => {
      const message = await prisma.communityMessage.create({
        data: { communityId: payload.communityId, senderId: socket.userId!, body: payload.body, type: "text" },
        include: { sender: { include: { profile: true } } },
      });
      io.to(communityRoomFor(payload.communityId)).emit("community:message", message);
    });
  });
}

export function emitToUser(userId: string, event: string, payload: unknown): void {
  ioInstance?.to(userRoomFor(userId)).emit(event, payload);
}

export function emitToCommunity(communityId: string, event: string, payload: unknown): void {
  ioInstance?.to(communityRoomFor(communityId)).emit(event, payload);
}

function roomFor(chatId: string): string {
  return `chat:${chatId}`;
}

function communityRoomFor(communityId: string): string {
  return `community:${communityId}`;
}

function userRoomFor(userId: string): string {
  return `user:${userId}`;
}
