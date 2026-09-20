// One-time script: approves specific pending Activity Requests directly in
// the DB, mirroring the exact same logic as POST /activity-requests/:id/approve
// (chat create/reuse, ChatSport, Round 7 Fix 3 auto-schedule, system message,
// notification) — used to seed a test scenario without tapping through the
// UI as every recipient. Real-time socket pushes (the live badge update) are
// skipped since this runs outside the API server process; recipients will
// see the correct state on their next app refresh/restart.
//
// Usage: tsx scripts/approvePendingRequests.ts

import { prisma } from "../src/lib/prisma.js";
import { notify } from "../src/lib/notify.js";

const REQUESTER_EMAIL = "bob@example.com";
const RECIPIENT_EMAILS = ["radoslaw@example.com", "tomasz@example.com", "marcin@example.com", "alice@example.com", "krzysztof@example.com"];

function nextOccurrence(dayOfWeek: number, startTime: string): Date {
  const [hours, minutes] = startTime.split(":").map(Number);
  const result = new Date();
  result.setHours(hours, minutes, 0, 0);
  let daysUntil = (dayOfWeek - result.getDay() + 7) % 7;
  if (daysUntil === 0 && result.getTime() <= Date.now()) daysUntil = 7;
  result.setDate(result.getDate() + daysUntil);
  return result;
}

async function approve(request: {
  id: string;
  requesterId: string;
  targetUserId: string | null;
  activityId: string;
  selectedDayOfWeek: number | null;
  selectedStartTime: string | null;
  activity: { name: string };
}) {
  const recipientId = request.targetUserId!;
  const [userAId, userBId] = [recipientId, request.requesterId].sort();

  const { chat, autoScheduled } = await prisma.$transaction(async (tx) => {
    await tx.activityRequest.update({ where: { id: request.id }, data: { status: "approved", decidedAt: new Date() } });

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
              create: { type: "template", body: "Hey! I think we can do this activity together — which time would you prefer?" },
            },
          },
        });

    let autoScheduled: { scheduledAt: Date; isFirst: boolean } | null = null;
    if (request.selectedDayOfWeek != null && request.selectedStartTime) {
      const alreadyScheduled = await tx.trainingSession.findFirst({
        where: { chatId: chat.id, activityId: request.activityId, status: "scheduled" },
      });
      if (!alreadyScheduled) {
        const priorCompleted = await tx.trainingSession.findFirst({ where: { chatId: chat.id, status: "completed" } });
        const scheduledAt = nextOccurrence(request.selectedDayOfWeek, request.selectedStartTime);
        await tx.trainingSession.create({
          data: {
            chatId: chat.id,
            hostId: recipientId,
            participantId: request.requesterId,
            activityId: request.activityId,
            scheduledAt,
            isFirstBetweenUsers: !priorCompleted,
          },
        });
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
}

async function main() {
  const requester = await prisma.user.findUniqueOrThrow({ where: { email: REQUESTER_EMAIL } });
  const recipients = await prisma.user.findMany({ where: { email: { in: RECIPIENT_EMAILS } }, include: { profile: true } });
  const recipientIds = new Set(recipients.map((r) => r.id));

  const pending = await prisma.activityRequest.findMany({
    where: { requesterId: requester.id, status: "pending", targetUserId: { in: [...recipientIds] } },
    include: { activity: true },
  });

  if (pending.length === 0) {
    console.log(`No pending requests found from ${REQUESTER_EMAIL} to any of: ${RECIPIENT_EMAILS.join(", ")}`);
    return;
  }

  for (const request of pending) {
    const recipient = recipients.find((r) => r.id === request.targetUserId);
    await approve(request);
    console.log(`✓ Approved: Bob → ${recipient?.profile?.displayName ?? recipient?.email} (${request.activity.name})`);
  }

  console.log(`Done. Approved ${pending.length} request(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
