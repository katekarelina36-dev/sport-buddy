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

// Round 8: "N weeks ago, on this weekday, at this time" — used for the
// Alice/Bob completed-session history so the dates read as a real past.
function weeksAgoOnWeekday(weeksAgo: number, weekday: number, hour: number, minute: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - weeksAgo * 7);
  d.setDate(d.getDate() + (weekday - d.getDay()));
  d.setHours(hour, minute, 0, 0);
  return d;
}

// Round 8: "next <weekday> at this time" — used for club events.
function nextWeekday(weekday: number, hour: number, minute: number): Date {
  const now = new Date();
  const d = new Date(now);
  d.setHours(hour, minute, 0, 0);
  let daysUntil = (weekday - now.getDay() + 7) % 7;
  if (daysUntil === 0 && d.getTime() <= now.getTime()) daysUntil = 7;
  d.setDate(d.getDate() + daysUntil);
  return d;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

interface SportSlot {
  activityName: string;
  level: SkillLevel;
  slots: { dayOfWeek: number; startTime: string; endTime: string }[];
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

  async function createUser(opts: {
    email: string;
    displayName: string;
    dateOfBirth: string;
    photoUrl: string;
    completedTrainingsCount?: number;
    communityUnlockNotified?: boolean;
  }) {
    const user = await prisma.user.upsert({
      where: { email: opts.email },
      update: {},
      create: {
        email: opts.email,
        passwordHash,
        profile: {
          create: {
            displayName: opts.displayName,
            city: "Warsaw",
            dateOfBirth: new Date(opts.dateOfBirth),
            photoUrl: opts.photoUrl,
            onboardingCompletedAt: new Date(),
          },
        },
        permissions: { create: { locationGranted: true, calendarGranted: false, pushGranted: true } },
      },
    });
    await prisma.userProfile.update({
      where: { userId: user.id },
      data: {
        city: "Warsaw",
        dateOfBirth: new Date(opts.dateOfBirth),
        photoUrl: opts.photoUrl,
        completedTrainingsCount: opts.completedTrainingsCount ?? 0,
        communityUnlockNotified: opts.communityUnlockNotified ?? false,
      },
    });
    return user;
  }

  // Round 8, Step 3: every non-power-user also gets an auto-generated
  // ActivityPost per sport (mirroring what PUT /availability?activityId=
  // does live), so they show up in the Explore feed / discover results.
  async function addSport(userId: string, sport: SportSlot) {
    const activity = await prisma.activity.findUniqueOrThrow({ where: { id: slug(sport.activityName) } });
    await prisma.userActivity.upsert({
      where: { userId_activityId: { userId, activityId: activity.id } },
      update: { level: sport.level, isPreferred: true },
      create: { userId, activityId: activity.id, level: sport.level, isPreferred: true },
    });
    await prisma.userAvailability.deleteMany({ where: { userId, activityId: activity.id } });
    await prisma.userAvailability.createMany({
      data: sport.slots.map((s) => ({ userId, activityId: activity.id, ...s, recurring: true })),
    });
    await prisma.activityPost.upsert({
      where: { authorId_activityId: { authorId: userId, activityId: activity.id } },
      update: { level: sport.level, status: "active" },
      create: { authorId: userId, activityId: activity.id, level: sport.level, status: "active", autoGenerated: true, maxParticipants: 1 },
    });
    return activity;
  }

  // ---------------------------------------------------------------------
  // Step 2: Alice & Bob — power users with a rich shared history.
  // ---------------------------------------------------------------------
  const alice = await createUser({
    email: "alice@example.com",
    displayName: "Alice",
    dateOfBirth: "1995-03-12",
    photoUrl: "https://i.pravatar.cc/150?img=1",
    completedTrainingsCount: 8,
    communityUnlockNotified: true,
  });
  const bob = await createUser({
    email: "bob@example.com",
    displayName: "Bob",
    dateOfBirth: "1993-07-24",
    photoUrl: "https://i.pravatar.cc/150?img=3",
    completedTrainingsCount: 8,
    communityUnlockNotified: true,
  });

  const tennis = await addSport(alice.id, {
    activityName: "Tennis",
    level: "intermediate",
    slots: [
      { dayOfWeek: 1, startTime: "18:00", endTime: "20:00" },
      { dayOfWeek: 3, startTime: "18:00", endTime: "20:00" },
      { dayOfWeek: 5, startTime: "17:00", endTime: "19:00" },
    ],
  });
  const dancing = await addSport(alice.id, {
    activityName: "Dancing",
    level: "beginner",
    slots: [
      { dayOfWeek: 2, startTime: "19:00", endTime: "21:00" },
      { dayOfWeek: 4, startTime: "19:00", endTime: "21:00" },
    ],
  });
  await addSport(bob.id, {
    activityName: "Tennis",
    level: "intermediate",
    slots: [
      { dayOfWeek: 1, startTime: "18:00", endTime: "20:00" },
      { dayOfWeek: 3, startTime: "18:00", endTime: "20:00" },
    ],
  });
  await addSport(bob.id, {
    activityName: "Dancing",
    level: "beginner",
    slots: [
      { dayOfWeek: 2, startTime: "19:00", endTime: "21:00" },
      { dayOfWeek: 4, startTime: "19:00", endTime: "21:00" },
    ],
  });

  const [aliceBobUserAId, aliceBobUserBId] = [alice.id, bob.id].sort();
  let aliceBobChat = await prisma.chat.findUnique({ where: { userAId_userBId: { userAId: aliceBobUserAId, userBId: aliceBobUserBId } } });
  if (!aliceBobChat) {
    aliceBobChat = await prisma.chat.create({
      data: {
        userAId: aliceBobUserAId,
        userBId: aliceBobUserBId,
        sports: { create: [{ activityId: tennis.id }, { activityId: dancing.id }] },
      },
    });

    const tennisDates = [
      weeksAgoOnWeekday(4, 1, 18, 0),
      weeksAgoOnWeekday(3, 3, 18, 0),
      weeksAgoOnWeekday(2, 1, 18, 0),
      weeksAgoOnWeekday(1, 3, 18, 0),
    ];
    const dancingDates = [
      weeksAgoOnWeekday(4, 2, 19, 0),
      weeksAgoOnWeekday(3, 4, 19, 0),
      weeksAgoOnWeekday(2, 2, 19, 0),
      weeksAgoOnWeekday(1, 4, 19, 0),
    ];

    for (const [i, scheduledAt] of tennisDates.entries()) {
      const completedAt = new Date(scheduledAt);
      completedAt.setHours(20, 0, 0, 0);
      await prisma.trainingSession.create({
        data: {
          chatId: aliceBobChat.id,
          hostId: alice.id,
          participantId: bob.id,
          activityId: tennis.id,
          scheduledAt,
          status: "completed",
          completedAt,
          isFirstBetweenUsers: i === 0,
          completedByUserA: true,
          completedByUserB: true,
          didHappenA: true,
          didHappenB: true,
          wouldPlayAgainA: true,
          wouldPlayAgainB: true,
        },
      });
    }
    for (const scheduledAt of dancingDates) {
      const completedAt = new Date(scheduledAt);
      completedAt.setHours(21, 0, 0, 0);
      await prisma.trainingSession.create({
        data: {
          chatId: aliceBobChat.id,
          hostId: alice.id,
          participantId: bob.id,
          activityId: dancing.id,
          scheduledAt,
          status: "completed",
          completedAt,
          isFirstBetweenUsers: false,
          completedByUserA: true,
          completedByUserB: true,
          didHappenA: true,
          didHappenB: true,
          wouldPlayAgainA: true,
          wouldPlayAgainB: true,
        },
      });
    }

    const dateLabel = (d: Date) => d.toLocaleDateString([], { day: "numeric", month: "short" });
    const messages: { senderId?: string; type: "text" | "system"; body: string }[] = [
      { senderId: alice.id, type: "text", body: "Hey! Want to play tennis together?" },
      { senderId: bob.id, type: "text", body: "Sure! When works for you?" },
      { senderId: alice.id, type: "text", body: "How about Monday at 6pm?" },
      { senderId: bob.id, type: "text", body: "Perfect, see you there!" },
      { type: "system", body: `Tennis session completed · ${dateLabel(tennisDates[0])}` },
      { senderId: bob.id, type: "text", body: "Great game! Want to do it again?" },
      { senderId: alice.id, type: "text", body: "Definitely! Same time Wednesday?" },
      { type: "system", body: `Tennis session completed · ${dateLabel(tennisDates[1])}` },
      { senderId: alice.id, type: "text", body: "Also, want to try dancing together on Tuesday?" },
      { senderId: bob.id, type: "text", body: "Why not! Let's do it." },
      { type: "system", body: `Dancing session completed · ${dateLabel(dancingDates[0])}` },
      { type: "system", body: `Tennis session completed · ${dateLabel(tennisDates[2])}` },
      { type: "system", body: `Dancing session completed · ${dateLabel(dancingDates[1])}` },
      { type: "system", body: `Tennis session completed · ${dateLabel(tennisDates[3])}` },
      { type: "system", body: `Dancing session completed · ${dateLabel(dancingDates[3])}` },
      { senderId: alice.id, type: "text", body: "Ready for the next session? Tap Schedule Event to plan it." },
    ];
    const messageBaseTime = weeksAgoOnWeekday(4, 1, 17, 0).getTime();
    await prisma.message.createMany({
      data: messages.map((m, i) => ({
        chatId: aliceBobChat!.id,
        senderId: m.senderId,
        type: m.type,
        body: m.body,
        createdAt: new Date(messageBaseTime + i * 30 * 60 * 1000),
      })),
    });
  }

  // ---------------------------------------------------------------------
  // Step 3: 10 additional users, each with 3 sports + activity posts.
  // ---------------------------------------------------------------------
  const marta = await createUser({ email: "marta@example.com", displayName: "Marta", dateOfBirth: "1998-05-20", photoUrl: "https://i.pravatar.cc/150?img=5", completedTrainingsCount: 1 });
  await addSport(marta.id, { activityName: "Running", level: "beginner", slots: [{ dayOfWeek: 1, startTime: "07:00", endTime: "08:00" }, { dayOfWeek: 3, startTime: "07:00", endTime: "08:00" }] });
  await addSport(marta.id, { activityName: "Yoga", level: "beginner", slots: [{ dayOfWeek: 2, startTime: "08:00", endTime: "09:00" }, { dayOfWeek: 4, startTime: "08:00", endTime: "09:00" }] });
  await addSport(marta.id, { activityName: "Cycling", level: "intermediate", slots: [{ dayOfWeek: 6, startTime: "10:00", endTime: "12:00" }] });

  const piotr = await createUser({ email: "piotr@example.com", displayName: "Piotr", dateOfBirth: "1990-11-03", photoUrl: "https://i.pravatar.cc/150?img=7", completedTrainingsCount: 2 });
  await addSport(piotr.id, { activityName: "Football", level: "intermediate", slots: [{ dayOfWeek: 2, startTime: "18:00", endTime: "20:00" }, { dayOfWeek: 4, startTime: "18:00", endTime: "20:00" }] });
  await addSport(piotr.id, { activityName: "Basketball", level: "beginner", slots: [{ dayOfWeek: 6, startTime: "14:00", endTime: "16:00" }] });
  await addSport(piotr.id, { activityName: "Swimming", level: "intermediate", slots: [{ dayOfWeek: 1, startTime: "07:00", endTime: "08:00" }, { dayOfWeek: 3, startTime: "07:00", endTime: "08:00" }] });

  const karolina = await createUser({ email: "karolina@example.com", displayName: "Karolina", dateOfBirth: "1996-08-15", photoUrl: "https://i.pravatar.cc/150?img=9", completedTrainingsCount: 1 });
  await addSport(karolina.id, { activityName: "Dancing", level: "intermediate", slots: [{ dayOfWeek: 1, startTime: "19:00", endTime: "21:00" }, { dayOfWeek: 3, startTime: "19:00", endTime: "21:00" }] });
  await addSport(karolina.id, { activityName: "Pilates", level: "beginner", slots: [{ dayOfWeek: 2, startTime: "07:00", endTime: "08:00" }, { dayOfWeek: 4, startTime: "07:00", endTime: "08:00" }] });
  await addSport(karolina.id, { activityName: "Tennis", level: "beginner", slots: [{ dayOfWeek: 6, startTime: "10:00", endTime: "12:00" }] });

  const tomasz = await createUser({ email: "tomasz@example.com", displayName: "Tomasz", dateOfBirth: "1988-02-28", photoUrl: "https://i.pravatar.cc/150?img=11", completedTrainingsCount: 2 });
  await addSport(tomasz.id, { activityName: "Chess", level: "advanced", slots: [{ dayOfWeek: 1, startTime: "20:00", endTime: "22:00" }, { dayOfWeek: 5, startTime: "20:00", endTime: "22:00" }] });
  await addSport(tomasz.id, { activityName: "Hiking", level: "intermediate", slots: [{ dayOfWeek: 6, startTime: "09:00", endTime: "13:00" }] });
  await addSport(tomasz.id, { activityName: "Badminton", level: "intermediate", slots: [{ dayOfWeek: 3, startTime: "18:00", endTime: "20:00" }] });

  const natalia = await createUser({ email: "natalia@example.com", displayName: "Natalia", dateOfBirth: "1999-12-01", photoUrl: "https://i.pravatar.cc/150?img=13", completedTrainingsCount: 0 });
  await addSport(natalia.id, { activityName: "Volleyball", level: "beginner", slots: [{ dayOfWeek: 2, startTime: "18:00", endTime: "20:00" }, { dayOfWeek: 4, startTime: "18:00", endTime: "20:00" }] });
  await addSport(natalia.id, { activityName: "Running", level: "intermediate", slots: [{ dayOfWeek: 1, startTime: "07:00", endTime: "08:00" }, { dayOfWeek: 3, startTime: "07:00", endTime: "08:00" }] });
  await addSport(natalia.id, { activityName: "Gym / Fitness", level: "beginner", slots: [{ dayOfWeek: 1, startTime: "07:00", endTime: "08:00" }, { dayOfWeek: 3, startTime: "07:00", endTime: "08:00" }, { dayOfWeek: 5, startTime: "07:00", endTime: "08:00" }] });

  const marcin = await createUser({ email: "marcin@example.com", displayName: "Marcin", dateOfBirth: "1992-04-10", photoUrl: "https://i.pravatar.cc/150?img=15", completedTrainingsCount: 5, communityUnlockNotified: true });
  await addSport(marcin.id, { activityName: "Tennis", level: "advanced", slots: [{ dayOfWeek: 1, startTime: "18:00", endTime: "20:00" }, { dayOfWeek: 3, startTime: "18:00", endTime: "20:00" }, { dayOfWeek: 5, startTime: "18:00", endTime: "20:00" }] });
  await addSport(marcin.id, { activityName: "Padel", level: "intermediate", slots: [{ dayOfWeek: 6, startTime: "10:00", endTime: "12:00" }] });
  await addSport(marcin.id, { activityName: "Running", level: "intermediate", slots: [{ dayOfWeek: 2, startTime: "07:00", endTime: "08:00" }, { dayOfWeek: 4, startTime: "07:00", endTime: "08:00" }] });

  const ewa = await createUser({ email: "ewa@example.com", displayName: "Ewa", dateOfBirth: "1994-09-22", photoUrl: "https://i.pravatar.cc/150?img=17", completedTrainingsCount: 4, communityUnlockNotified: true });
  await addSport(ewa.id, { activityName: "Dancing", level: "advanced", slots: [{ dayOfWeek: 2, startTime: "19:00", endTime: "21:00" }, { dayOfWeek: 4, startTime: "19:00", endTime: "21:00" }] });
  await addSport(ewa.id, { activityName: "Yoga", level: "intermediate", slots: [{ dayOfWeek: 1, startTime: "08:00", endTime: "09:00" }, { dayOfWeek: 3, startTime: "08:00", endTime: "09:00" }] });
  await addSport(ewa.id, { activityName: "Pilates", level: "intermediate", slots: [{ dayOfWeek: 5, startTime: "08:00", endTime: "09:00" }] });

  const krzysztof = await createUser({ email: "krzysztof@example.com", displayName: "Krzysztof", dateOfBirth: "1987-06-05", photoUrl: "https://i.pravatar.cc/150?img=19", completedTrainingsCount: 6, communityUnlockNotified: true });
  await addSport(krzysztof.id, { activityName: "Basketball", level: "advanced", slots: [{ dayOfWeek: 1, startTime: "18:00", endTime: "20:00" }, { dayOfWeek: 3, startTime: "18:00", endTime: "20:00" }, { dayOfWeek: 5, startTime: "18:00", endTime: "20:00" }] });
  await addSport(krzysztof.id, { activityName: "Football", level: "advanced", slots: [{ dayOfWeek: 2, startTime: "18:00", endTime: "20:00" }, { dayOfWeek: 4, startTime: "18:00", endTime: "20:00" }] });
  await addSport(krzysztof.id, {
    activityName: "Gym / Fitness",
    level: "advanced",
    slots: [1, 2, 3, 4, 5].map((dayOfWeek) => ({ dayOfWeek, startTime: "07:00", endTime: "08:00" })),
  });

  const zofia = await createUser({ email: "zofia@example.com", displayName: "Zofia", dateOfBirth: "1997-03-14", photoUrl: "https://i.pravatar.cc/150?img=21", completedTrainingsCount: 1 });
  await addSport(zofia.id, { activityName: "Climbing", level: "intermediate", slots: [{ dayOfWeek: 6, startTime: "10:00", endTime: "13:00" }, { dayOfWeek: 0, startTime: "10:00", endTime: "13:00" }] });
  await addSport(zofia.id, { activityName: "Hiking", level: "beginner", slots: [{ dayOfWeek: 0, startTime: "09:00", endTime: "13:00" }] });
  await addSport(zofia.id, { activityName: "Cycling", level: "beginner", slots: [{ dayOfWeek: 6, startTime: "09:00", endTime: "11:00" }] });

  const radoslaw = await createUser({ email: "radoslaw@example.com", displayName: "Radosław", dateOfBirth: "1991-01-17", photoUrl: "https://i.pravatar.cc/150?img=23", completedTrainingsCount: 2 });
  await addSport(radoslaw.id, { activityName: "Squash", level: "intermediate", slots: [{ dayOfWeek: 1, startTime: "19:00", endTime: "21:00" }, { dayOfWeek: 3, startTime: "19:00", endTime: "21:00" }] });
  await addSport(radoslaw.id, { activityName: "Table Tennis", level: "advanced", slots: [{ dayOfWeek: 2, startTime: "19:00", endTime: "21:00" }, { dayOfWeek: 4, startTime: "19:00", endTime: "21:00" }] });
  await addSport(radoslaw.id, { activityName: "Badminton", level: "advanced", slots: [{ dayOfWeek: 5, startTime: "18:00", endTime: "20:00" }] });

  // ---------------------------------------------------------------------
  // Step 4: 3 communities, each with members, a club event + RSVPs, and a
  // pinned/unpinned feed post.
  // ---------------------------------------------------------------------
  async function seedCommunity(opts: {
    name: string;
    activityName: string;
    photoUrl: string;
    description: string;
    organiser: { id: string };
    members: { id: string }[];
    event: { title: string; scheduledAt: Date; locationText: string; isRecurring: boolean; recurrenceRule?: string; rsvps: { userId: string; status: "going" | "not_going" }[] };
    post: { authorId: string; body: string; isPinned: boolean; createdAt: Date };
  }) {
    const existing = await prisma.community.findFirst({ where: { name: opts.name } });
    if (existing) return existing;

    const activity = await prisma.activity.findUniqueOrThrow({ where: { id: slug(opts.activityName) } });
    const community = await prisma.community.create({
      data: {
        name: opts.name,
        activityId: activity.id,
        photoUrl: opts.photoUrl,
        description: opts.description,
        creatorId: opts.organiser.id,
        members: {
          create: [
            { userId: opts.organiser.id, role: "organiser" },
            ...opts.members.map((m) => ({ userId: m.id, role: "member" as const })),
          ],
        },
      },
    });

    const event = await prisma.clubEvent.create({
      data: {
        communityId: community.id,
        createdBy: opts.organiser.id,
        title: opts.event.title,
        scheduledAt: opts.event.scheduledAt,
        locationText: opts.event.locationText,
        isRecurring: opts.event.isRecurring,
        recurrenceRule: opts.event.recurrenceRule,
      },
    });
    await prisma.clubEventRsvp.createMany({
      data: opts.event.rsvps.map((r) => ({ eventId: event.id, userId: r.userId, status: r.status })),
    });

    await prisma.communityPost.create({
      data: {
        communityId: community.id,
        authorId: opts.post.authorId,
        body: opts.post.body,
        isPinned: opts.post.isPinned,
        createdAt: opts.post.createdAt,
      },
    });

    return community;
  }

  await seedCommunity({
    name: "Warsaw Tennis Club",
    activityName: "Tennis",
    photoUrl: "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=200",
    description: "Weekly tennis sessions for all levels in Warsaw. Join us every Monday, Wednesday, and Friday!",
    organiser: marcin,
    members: [alice, bob, karolina, natalia],
    event: {
      title: "Sunday Open Tennis",
      scheduledAt: nextWeekday(0, 10, 0),
      locationText: "Moczydło Park Tennis Courts, Warsaw",
      isRecurring: true,
      recurrenceRule: "WEEKLY",
      rsvps: [
        { userId: marcin.id, status: "going" },
        { userId: alice.id, status: "going" },
        { userId: bob.id, status: "going" },
        { userId: karolina.id, status: "not_going" },
        { userId: natalia.id, status: "going" },
      ],
    },
    post: {
      authorId: marcin.id,
      body: "Welcome to Warsaw Tennis Club! 🎾 We meet every week for friendly matches. All levels welcome. See you on Sunday!",
      isPinned: true,
      createdAt: daysAgo(7),
    },
  });

  await seedCommunity({
    name: "Warsaw Dance Collective",
    activityName: "Dancing",
    photoUrl: "https://images.unsplash.com/photo-1547153760-18fc86324498?w=200",
    description: "A community for dance lovers in Warsaw. We practice together, share tips, and organize social dance events.",
    organiser: ewa,
    members: [alice, karolina, marta, zofia],
    event: {
      title: "Tuesday Dance Practice",
      scheduledAt: nextWeekday(2, 19, 0),
      locationText: "Studio Tańca Centrum, Warsaw",
      isRecurring: true,
      recurrenceRule: "WEEKLY",
      rsvps: [
        { userId: ewa.id, status: "going" },
        { userId: alice.id, status: "going" },
        { userId: karolina.id, status: "going" },
        { userId: marta.id, status: "going" },
        { userId: zofia.id, status: "not_going" },
      ],
    },
    post: {
      authorId: ewa.id,
      body: "Hey dancers! 💃 Our next session is on Tuesday. We'll be working on salsa basics. Beginners very welcome — no experience needed!",
      isPinned: true,
      createdAt: daysAgo(5),
    },
  });

  await seedCommunity({
    name: "Warsaw Ballers",
    activityName: "Basketball",
    photoUrl: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=200",
    description: "Pickup basketball in Warsaw. Casual games, all skill levels. We play hard but keep it fun.",
    organiser: krzysztof,
    members: [piotr, tomasz, marcin, radoslaw],
    event: {
      title: "Friday Pickup Game",
      scheduledAt: nextWeekday(5, 18, 0),
      locationText: "Saska Kępa Basketball Court, Warsaw",
      isRecurring: false,
      rsvps: [
        { userId: krzysztof.id, status: "going" },
        { userId: piotr.id, status: "going" },
        { userId: tomasz.id, status: "going" },
        { userId: marcin.id, status: "going" },
        { userId: radoslaw.id, status: "going" },
      ],
    },
    post: {
      authorId: krzysztof.id,
      body: "Friday game is ON. 🏀 5 vs 5 if everyone shows up. Bring water and good energy. See you at 6pm!",
      isPinned: false,
      createdAt: daysAgo(2),
    },
  });

  console.log(`Seeded ${ACTIVITIES.length} activities, Alice & Bob, 10 additional users, and 3 communities (password: password123)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
