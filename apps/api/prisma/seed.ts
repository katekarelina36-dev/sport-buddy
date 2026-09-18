import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ACTIVITIES = [
  "Tennis", "Running", "Cycling", "Chess", "Basketball",
  "Yoga", "Swimming", "Climbing", "Football", "Dance",
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
  Dance: ["Teach each other a move from a style you don't usually dance.", "Freestyle for one full song, no repeats."],
};

async function main() {
  for (const [i, name] of ACTIVITIES.entries()) {
    const activity = await prisma.activity.upsert({
      where: { id: name.toLowerCase() },
      update: {},
      create: { id: name.toLowerCase(), name, sortOrder: i, isActive: true },
    });
    for (const content of CHALLENGES[name] ?? []) {
      await prisma.challenge.create({ data: { activityId: activity.id, content } });
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
        create: {
          displayName: "Alice",
          city: "Warsaw",
          dateOfBirth: new Date("1996-04-12"),
          bio: "Weekend tennis player, always up for a rally.",
          onboardingCompletedAt: new Date(),
        },
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
        create: {
          displayName: "Bob",
          city: "Warsaw",
          dateOfBirth: new Date("1999-11-02"),
          bio: "Training for a 10k, love an early run.",
          onboardingCompletedAt: new Date(),
        },
      },
      permissions: { create: { locationGranted: true, calendarGranted: false, pushGranted: true } },
    },
  });

  const tennis = await prisma.activity.findUniqueOrThrow({ where: { id: "tennis" } });
  const running = await prisma.activity.findUniqueOrThrow({ where: { id: "running" } });

  await prisma.userActivity.upsert({
    where: { userId_activityId: { userId: alice.id, activityId: tennis.id } },
    update: {},
    create: { userId: alice.id, activityId: tennis.id, level: "intermediate", isPreferred: true },
  });
  await prisma.userActivity.upsert({
    where: { userId_activityId: { userId: bob.id, activityId: running.id } },
    update: {},
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

  console.log(`Seeded ${ACTIVITIES.length} activities and demo users ${alice.email}, ${bob.email} (password: password123)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
