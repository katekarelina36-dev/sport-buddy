import type { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import { env } from "../lib/env.js";

interface AuthedSocket extends Socket {
  userId?: string;
}

// F11: real-time messaging over WebSocket, <300ms send/receive target; falls
// back to REST (routes/chats.ts) + push when the socket is unavailable.
export function attachChatGateway(io: Server): void {
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
  });
}

function roomFor(chatId: string): string {
  return `chat:${chatId}`;
}
