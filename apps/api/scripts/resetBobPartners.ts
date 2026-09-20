// One-time script: wipes every chat, training session, and activity request
// between Bob and a named list of partners — used to free up "max
// participants" slots so a fresh Activity Request can be approved again
// while manually testing, without waiting for real users to free up.
//
// Usage: tsx scripts/resetBobPartners.ts

import { prisma } from "../src/lib/prisma.js";

const REQUESTER_EMAIL = "bob@example.com";
const PARTNER_EMAILS = ["krzysztof@example.com", "tomasz@example.com", "radoslaw@example.com"];

async function run() {
  const bob = await prisma.user.findUniqueOrThrow({ where: { email: REQUESTER_EMAIL } });
  const partners = await prisma.user.findMany({ where: { email: { in: PARTNER_EMAILS } } });

  for (const partner of partners) {
    const [userAId, userBId] = [bob.id, partner.id].sort();
    const chat = await prisma.chat.findUnique({ where: { userAId_userBId: { userAId, userBId } } });

    if (chat) {
      const trainings = await prisma.trainingSession.findMany({ where: { chatId: chat.id }, select: { id: true } });
      const trainingIds = trainings.map((t) => t.id);

      await prisma.trainingChallenge.deleteMany({ where: { trainingId: { in: trainingIds } } });
      await prisma.message.deleteMany({ where: { chatId: chat.id } });
      await prisma.trainingSession.deleteMany({ where: { chatId: chat.id } });
      await prisma.chatSport.deleteMany({ where: { chatId: chat.id } });
      await prisma.chatRead.deleteMany({ where: { chatId: chat.id } });
      await prisma.chat.delete({ where: { id: chat.id } });
      console.log(`✓ Deleted chat + ${trainingIds.length} training session(s) between Bob and ${partner.email}`);
    } else {
      console.log(`– No chat found between Bob and ${partner.email}`);
    }

    const { count } = await prisma.activityRequest.deleteMany({
      where: {
        OR: [
          { requesterId: bob.id, targetUserId: partner.id },
          { requesterId: partner.id, targetUserId: bob.id },
        ],
      },
    });
    console.log(`✓ Deleted ${count} activity request(s) between Bob and ${partner.email}`);
  }

  console.log("\nDone. Bob can now send a fresh request to any of these partners.");
}

run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
