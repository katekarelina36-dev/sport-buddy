import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";
import { pushDriver } from "./push.js";
import { enqueue } from "./queue.js";

// F16: notification dispatch decoupled from the triggering transaction via the
// in-process queue (swap `queue.ts` for a real broker without touching call sites).
export function notify(userId: string, type: string, payload: Record<string, unknown>, deepLink?: string): void {
  enqueue(async () => {
    await prisma.notification.create({ data: { userId, type, payload: payload as Prisma.InputJsonValue } });
    await pushDriver.send({
      userId,
      title: titleFor(type),
      body: bodyFor(type, payload),
      deepLink,
    });
  });
}

function titleFor(type: string): string {
  const titles: Record<string, string> = {
    activity_request_received: "New activity request",
    activity_request_approved: "Request approved",
    activity_request_rejected: "Request declined",
    waitlist_match_found: "We found you a match",
    training_created: "Event scheduled",
    training_reminder: "Upcoming event",
    challenge_sent: "New challenge card",
  };
  return titles[type] ?? "Sport Buddy";
}

function bodyFor(type: string, payload: Record<string, unknown>): string {
  return typeof payload.message === "string" ? payload.message : "Open the app to see what's new.";
}
