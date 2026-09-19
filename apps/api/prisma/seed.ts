import { PrismaClient, type SkillLevel } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Round 2 sports catalog (25 sports).
const ACTIVITIES = [
  "Tennis", "Padel", "Badminton", "Squash", "Table Tennis",
  "Volleyball", "Basketball", "Football", "Running", "Cycling",
  "Swimming", "Gym / Fitness", "Yoga", "Pilates", "Boxing",
  "Martial Arts", "Skiing", "Snowboarding", "Ice Skating", "Golf",
  "Climbing", "Dancing", "Chess", "Hiking", "Rowing",
];

const CHALLENGES: Record<string, string[]> = {
  Tennis: ["Play a full set without a single double fault.", "Try only backhand returns for the first 10 minutes."],
  Running: ["Negative-split your run: second half faster than the first.", "Find a new route neither of you has run before."],
  Cycling: ["Take turns leading a paceline for the whole ride.", "Climb the biggest hill on your route twice."],
  Chess: ["Play a game where you announce your plan out loud before each move.", "Try a blitz rematch — 5 minutes each."],
  Basketball: ["First to 11, but every basket must be assisted.", "H-O-R-S-E before your main game."],
  Yoga: ["Teach each other one pose the other doesn't know.", "10 minutes of partner stretching to close the session."],
  Swimming: ["Pick a stroke neither of you usually swims for one set.", "Race an underwater length."],
  Climbing: ["Try a route two grades below your max, focus purely on footwork.", "Spot each other on a new problem."],
  Football: ["Play a round of keep-uppy before kickoff — most touches wins.", "First to 3 goals, no shooting from outside the box."],
  Dancing: ["Teach each other a move from a style you don't usually dance.", "Freestyle for one full song, no repeats."],
};

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// Round 2: 10 fully-populated seed profiles so the Explore feed isn't empty on first launch.
const DEMO_PROFILES: { name: string; age: number; sports: [string, SkillLevel][] }[] = [
  { name: "Anna Kowalska", age: 27, sports: [["Tennis", "intermediate"]] },
  { name: "Piotr Nowak", age: 34, sports: [["Running", "advanced"], ["Cycling", "intermediate"]] },
  { name: "Zofia Wisniewski", age: 23, sports: [["Yoga", "beginner"]] },
  { name: "Jakub Wojcik", age: 39, sports: [["Football", "advanced"], ["Basketball", "intermediate"]] },
  { name: "Maria Kaminski", age: 30, sports: [["Climbing", "intermediate"]] },
  { name: "Tomasz Lewandowski", age: 25, sports: [["Padel", "beginner"], ["Squash", "beginner"]] },
  { name: "Aleksandra Zielinski", age: 36, sports: [["Chess", "pro"]] },
  { name: "Michal Szymanski", age: 22, sports: [["Boxing", "intermediate"]] },
  { name: "Karolina Wozniak", age: 32, sports: [["Swimming", "advanced"], ["Table Tennis", "beginner"]] },
  { name: "Adam Dabrowski", age: 40, sports: [["Hiking", "intermediate"]] },
];

const DAYS_OF_WEEK = [0, 1, 2, 3, 4, 5, 6];
function randomDays(min: number, max: number): number[] {
  const count = min + Math.floor(Math.random() * (max - min + 1));
  const shuffled = [...DAYS_OF_WEEK].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
function randomHour(): number {
  return 7 + Math.floor(Math.random() * (21 - 7));
}

async function main() {
  for (const [i, name] of ACTIVITIES.entries()) {
    const activity = await prisma.activity.upsert({
      where: { id: slug(name) },
      update: {},
      create: { id: slug(name), name, sortOrder: i, isActive: true },
    });
    const existingChallenges = await prisma.challenge.count({ where: { activityId: activity.id } });
    if (existingChallenges === 0) {
      for (const content of CHALLENGES[name] ?? []) {
        await prisma.challenge.create({ data: { activityId: activity.id, content } });
      }
    }
  }

  const passwordHash = await bcrypt.hash("password123", 10);
  const alice = await prisma.user.upsert({
    where: { email: "alice@example.com" },
    update: {},
    create: {
      email: "alice@example.com",
      passwordHash,
      profile: {
        create: { displayName: "Alice", city: "Warsaw", dateOfBirth: new Date("1996-04-12"), bio: "Weekend tennis player, always up for a rally.", onboardingCompletedAt: new Date() },
      },
      permissions: { create: { locationGranted: true, calendarGranted: false, pushGranted: true } },
    },
  });
  const bob = await prisma.user.upsert({
    where: { email: "bob@example.com" },
    update: {},
    create: {
      email: "bob@example.com",
      passwordHash,
      profile: {
        create: { displayName: "Bob", city: "Warsaw", dateOfBirth: new Date("1999-11-02"), bio: "Training for a 10k, love an early run.", onboardingCompletedAt: new Date() },
      },
      permissions: { create: { locationGranted: true, calendarGranted: false, pushGranted: true } },
    },
  });
  await prisma.userProfile.update({ where: { userId: alice.id }, data: { city: "Warsaw", dateOfBirth: new Date("1996-04-12") } });
  await prisma.userProfile.update({ where: { userId: bob.id }, data: { city: "Warsaw", dateOfBirth: new Date("1999-11-02") } });

  const tennis = await prisma.activity.findUniqueOrThrow({ where: { id: "tennis" } });
  const running = await prisma.activity.findUniqueOrThrow({ where: { id: "running" } });
  await prisma.userActivity.upsert({
    where: { userId_activityId: { userId: alice.id, activityId: tennis.id } },
    update: { level: "intermediate", isPreferred: true },
    create: { userId: alice.id, activityId: tennis.id, level: "intermediate", isPreferred: true },
  });
  await prisma.userActivity.upsert({
    where: { userId_activityId: { userId: bob.id, activityId: running.id } },
    update: { level: "beginner", isPreferred: true },
    create: { userId: bob.id, activityId: running.id, level: "beginner", isPreferred: true },
  });
  await prisma.userAvailability.createMany({
    data: [
      { userId: alice.id, activityId: tennis.id, dayOfWeek: 2, startTime: "18:00", endTime: "20:00", recurring: true },
      { userId: alice.id, activityId: tennis.id, dayOfWeek: 4, startTime: "18:00", endTime: "20:00", recurring: true },
      { userId: bob.id, activityId: running.id, dayOfWeek: 6, startTime: "08:00", endTime: "10:00", recurring: true },
    ],
    skipDuplicates: true,
  });

  // Round 2: 10 additional fully-populated demo profiles for the Explore feed.
  for (let i = 0; i < DEMO_PROFILES.length; i++) {
    const demo = DEMO_PROFILES[i];
    const email = `${slug(demo.name)}@example.com`;
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - demo.age);

    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        passwordHash,
        profile: {
          create: {
            displayName: demo.name,
            city: "Warsaw",
            dateOfBirth: dob,
            photoUrl: `https://i.pravatar.cc/150?img=${i + 1}`,
            onboardingCompletedAt: new Date(),
          },
        },
        permissions: { create: { locationGranted: true, calendarGranted: false, pushGranted: true } },
      },
    });
    await prisma.userProfile.update({
      where: { userId: user.id },
      data: { city: "Warsaw", dateOfBirth: dob, photoUrl: `https://i.pravatar.cc/150?img=${i + 1}` },
    });

    for (const [sportName, level] of demo.sports) {
      const activity = await prisma.activity.findUniqueOrThrow({ where: { id: slug(sportName) } });
      await prisma.userActivity.upsert({
        where: { userId_activityId: { userId: user.id, activityId: activity.id } },
        update: { level, isPreferred: true },
        create: { userId: user.id, activityId: activity.id, level, isPreferred: true },
      });

      const days = randomDays(2, 4);
      await prisma.userAvailability.deleteMany({ where: { userId: user.id, activityId: activity.id } });
      await prisma.userAvailability.createMany({
        data: days.map((dayOfWeek) => {
          const startHour = randomHour();
          return {
            userId: user.id,
            activityId: activity.id,
            dayOfWeek,
            startTime: `${String(startHour).padStart(2, "0")}:00`,
            endTime: `${String(Math.min(startHour + 2, 22)).padStart(2, "0")}:00`,
            recurring: true,
          };
        }),
      });
    }
  }

  // More seed data: chats already existing between users, so the Chats tab
  // isn't empty on first launch, plus a fleshed-out Alice/Bob history.
  async function findDemoUser(name: string) {
    return prisma.user.findUniqueOrThrow({ where: { email: `${slug(name)}@example.com` } });
  }

  async function seedApprovedChat(opts: { requesterId: string; recipientId: string; activityId: string; greeting: string }): Promise<string> {
    const { requesterId, recipientId, activityId, greeting } = opts;
    const [userAId, userBId] = [requesterId, recipientId].sort();
    const existingChat = await prisma.chat.findUnique({ where: { userAId_userBId: { userAId, userBId } } });
    const existingSport = existingChat
      ? await prisma.chatSport.findUnique({ where: { chatId_activityId: { chatId: existingChat.id, activityId } } })
      : null;
    if (existingChat && existingSport) return existingChat.id;

    const request = await prisma.activityRequest.create({
      data: { requesterId, targetUserId: recipientId, activityId, status: "approved", decidedAt: new Date() },
    });

    if (existingChat) {
      await prisma.chatSport.create({ data: { chatId: existingChat.id, activityId, activityRequestId: request.id } });
      return existingChat.id;
    }

    const chat = await prisma.chat.create({
      data: {
        userAId,
        userBId,
        originatingRequestId: request.id,
        sports: { create: { activityId, activityRequestId: request.id } },
        messages: { create: { type: "template", body: greeting } },
      },
    });
    return chat.id;
  }

  // A couple of pre-existing chats among the Round 2 demo profiles, matched
  // on the sport they already share with Alice/Bob, so the Chats list has
  // more than one conversation to show.
  const annaKowalska = await findDemoUser("Anna Kowalska");
  const piotrNowak = await findDemoUser("Piotr Nowak");
  await seedApprovedChat({
    requesterId: alice.id,
    recipientId: annaKowalska.id,
    activityId: tennis.id,
    greeting: "Hey! Fancy a tennis match this week?",
  });
  await seedApprovedChat({
    requesterId: bob.id,
    recipientId: piotrNowak.id,
    activityId: running.id,
    greeting: "Hey! I'm training for a 10k too, want to run together sometime?",
  });

  // Alice & Bob: matched on both Tennis and Volleyball, with a shared history
  // of 3 completed sessions per sport, leaving both sports free to schedule a
  // new Event (nothing is left "scheduled").
  const volleyball = await prisma.activity.findUniqueOrThrow({ where: { id: "volleyball" } });

  for (const [user, activityId] of [
    [alice, tennis.id],
    [alice, volleyball.id],
    [bob, tennis.id],
    [bob, volleyball.id],
  ] as const) {
    await prisma.userActivity.upsert({
      where: { userId_activityId: { userId: user.id, activityId } },
      update: { level: "intermediate", isPreferred: true },
      create: { userId: user.id, activityId, level: "intermediate", isPreferred: true },
    });
  }
  await prisma.userAvailability.deleteMany({ where: { userId: { in: [alice.id, bob.id] }, activityId: volleyball.id } });
  await prisma.userAvailability.createMany({
    data: [
      { userId: alice.id, activityId: volleyball.id, dayOfWeek: 3, startTime: "19:00", endTime: "21:00", recurring: true },
      { userId: bob.id, activityId: volleyball.id, dayOfWeek: 3, startTime: "19:00", endTime: "21:00", recurring: true },
    ],
  });

  const aliceBobChatId = await seedApprovedChat({
    requesterId: bob.id,
    recipientId: alice.id,
    activityId: tennis.id,
    greeting: "Hey! I think we can do this activity together — which time would you prefer?",
  });
  await seedApprovedChat({
    requesterId: alice.id,
    recipientId: bob.id,
    activityId: volleyball.id,
    greeting: "Hey! I think we can do this activity together — which time would you prefer?",
  });

  async function seedCompletedHistory(chatId: string, activityId: string, count: number) {
    const existing = await prisma.trainingSession.count({ where: { chatId, activityId, status: "completed" } });
    for (let i = existing; i < count; i++) {
      const anyPriorCompleted = await prisma.trainingSession.findFirst({ where: { chatId, status: "completed" } });
      const scheduledAt = new Date();
      scheduledAt.setDate(scheduledAt.getDate() - (count - i) * 14);
      await prisma.trainingSession.create({
        data: {
          chatId,
          hostId: i % 2 === 0 ? alice.id : bob.id,
          participantId: i % 2 === 0 ? bob.id : alice.id,
          activityId,
          scheduledAt,
          status: "completed",
          completedAt: scheduledAt,
          isFirstBetweenUsers: !anyPriorCompleted,
          completedByUserA: true,
          completedByUserB: true,
          didHappenA: true,
          didHappenB: true,
          wouldPlayAgainA: true,
          wouldPlayAgainB: true,
        },
      });
    }
  }
  await seedCompletedHistory(aliceBobChatId, tennis.id, 3);
  await seedCompletedHistory(aliceBobChatId, volleyball.id, 3);

  for (const user of [alice, bob]) {
    const completedCount = await prisma.trainingSession.count({
      where: { status: "completed", OR: [{ hostId: user.id }, { participantId: user.id }] },
    });
    await prisma.userProfile.update({
      where: { userId: user.id },
      data: { completedTrainingsCount: completedCount, communityUnlockNotified: completedCount >= 3 },
    });
  }

  console.log(`Seeded ${ACTIVITIES.length} activities, 2 core demo users + ${DEMO_PROFILES.length} Round 2 profiles (password: password123)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
