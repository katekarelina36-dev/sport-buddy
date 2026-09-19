import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthedRequest } from "../lib/auth.js";

export const usersRouter = Router();
usersRouter.use(requireAuth);

// F3: Explore Activities Feed — cards of users who have set availability for
// the selected sport, filterable by level / day-of-week / distance. Excludes
// blocked users (both directions) and the viewer themself.
usersRouter.get("/discover", async (req: AuthedRequest, res) => {
  const querySchema = z.object({
    activityId: z.string(),
    levels: z.string().optional(), // comma-separated SkillLevel values
    days: z.string().optional(), // comma-separated 0-6
    distanceKm: z.coerce.number().optional(),
    cursor: z.string().optional(),
    limit: z.coerce.number().min(1).max(50).default(20),
  });
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { activityId, levels, days, cursor, limit } = parsed.data;

  const [blockedByMe, blockedMe] = await Promise.all([
    prisma.userBlock.findMany({ where: { blockerId: req.userId! }, select: { blockedId: true } }),
    prisma.userBlock.findMany({ where: { blockedId: req.userId! }, select: { blockerId: true } }),
  ]);
  const excludedIds = [req.userId!, ...blockedByMe.map((b) => b.blockedId), ...blockedMe.map((b) => b.blockerId)];

  const dayList = days ? days.split(",").map(Number) : undefined;

  const userActivities = await prisma.userActivity.findMany({
    where: {
      activityId,
      userId: { notIn: excludedIds },
      ...(levels ? { level: { in: levels.split(",") as ("beginner" | "intermediate" | "advanced")[] } } : {}),
      user: {
        profile: { onboardingCompletedAt: { not: null } },
        availability: dayList ? { some: { activityId, dayOfWeek: { in: dayList } } } : { some: { activityId } },
      },
    },
    include: {
      activity: true,
      user: {
        include: {
          profile: true,
          activities: { include: { activity: true } },
          availability: { where: { activityId } },
          communityMembers: { include: { community: true } },
        },
      },
    },
    orderBy: { id: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = userActivities.length > limit;
  const page = hasMore ? userActivities.slice(0, limit) : userActivities;

  const alreadyRequested = await prisma.activityRequest.findMany({
    where: { requesterId: req.userId!, activityId, status: { in: ["pending", "approved"] }, targetUserId: { in: page.map((ua) => ua.userId) } },
    select: { targetUserId: true },
  });
  const requestedSet = new Set(alreadyRequested.map((r) => r.targetUserId));

  res.json({
    users: page.map((ua) => ({ user: ua.user, primaryActivity: ua, alreadyRequested: requestedSet.has(ua.userId) })),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  });
});

// F4: full public profile detail for one user, including all sports +
// per-sport availability + communities + completed-training stat.
usersRouter.get("/:id", async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: {
      profile: true,
      activities: { include: { activity: true } },
      availability: true,
      communityMembers: { include: { community: true } },
    },
  });
  if (!user) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const primaryActivityId = user.activities[0]?.activityId;
  const existingRequest = primaryActivityId
    ? await prisma.activityRequest.findFirst({
        where: { requesterId: req.userId!, targetUserId: user.id, activityId: primaryActivityId, status: { in: ["pending", "approved"] } },
      })
    : null;
  res.json({ ...user, alreadyRequested: Boolean(existingRequest) });
});

usersRouter.post("/:id/report", async (req: AuthedRequest, res) => {
  const schema = z.object({ reason: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  await prisma.userReport.create({ data: { reporterId: req.userId!, reportedId: req.params.id, reason: parsed.data.reason } });
  res.status(201).json({ ok: true });
});

usersRouter.post("/:id/block", async (req: AuthedRequest, res) => {
  await prisma.userBlock.upsert({
    where: { blockerId_blockedId: { blockerId: req.userId!, blockedId: req.params.id } },
    update: {},
    create: { blockerId: req.userId!, blockedId: req.params.id },
  });
  res.status(201).json({ ok: true });
});
