import { io, type Socket } from "socket.io-client";
import { API_BASE_URL, getToken } from "./client";

let socket: Socket | null = null;

// F11: real-time chat transport; REST (src/api/client.ts -> /chats/:id/messages)
// is the fallback path when the socket is unavailable.
export async function getChatSocket(): Promise<Socket> {
  if (socket?.connected) return socket;
  const token = await getToken();
  socket = io(API_BASE_URL, { auth: { token } });
  return socket;
}
