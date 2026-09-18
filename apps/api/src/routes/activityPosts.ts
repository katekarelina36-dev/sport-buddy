import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthedRequest } from "../lib/auth.js";

export const activityPostsRouter = Router();
activityPostsRouter.use(requireAuth);

const createPostSchema = z.object({
  activityId: z.string(),
  level: z.enum(["beginner", "intermediate", "advanced"]),
  locationLat: z.number().optional(),
  locationLng: z.number().optional(),
  slots: z
    .array(z.object({ date: z.string().datetime(), startTime: z.string(), endTime: z.string() }))
    .min(1),
});

activityPostsRouter.post("/", async (req: AuthedRequest, res) => {
  const parsed = createPostSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { slots, ...postFields } = parsed.data;
  const post = await prisma.activityPost.create({
    data: {
      ...postFields,
      authorId: req.userId!,
      slots: { createMany: { data: slots.map((s) => ({ ...s, date: new Date(s.date), activityId: postFields.activityId })) } },
    },
    include: { slots: true },
  });
  res.status(201).json(post);
});

// F3: feed of Activity Posts (not user profiles), filtered by activity type,
// availability overlap, distance, and level; AND-combined; excludes posts the
// viewer already actioned.
activityPostsRouter.get("/", async (req: AuthedRequest, res) => {
  const querySchema = z.object({
    activityId: z.string(),
    level: z.enum(["beginner", "intermediate", "advanced"]).optional(),
    cursor: z.string().optional(),
    limit: z.coerce.number().min(1).max(50).default(20),
  });
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { activityId, level, cursor, limit } = parsed.data;

  const alreadyActioned = await prisma.activityRequest.findMany({
    where: { requesterId: req.userId!, status: { in: ["pending", "approved"] } },
    select: { postId: true },
  });

  const posts = await prisma.activityPost.findMany({
    where: {
      activityId,
      status: "active",
      authorId: { not: req.userId! },
      id: { notIn: alreadyActioned.map((r) => r.postId).filter((id): id is string => id !== null) },
      ...(level ? { level } : {}),
    },
    include: {
      author: { include: { profile: true } },
      slots: { where: { isFilled: false } },
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = posts.length > limit;
  const page = hasMore ? posts.slice(0, limit) : posts;
  res.json({ posts: page, nextCursor: hasMore ? page[page.length - 1].id : null });
});

// F4: full detail view — post + author profile + activities + availability +
// communities + completed-training count, in one round trip.
activityPostsRouter.get("/:id", async (req: AuthedRequest, res) => {
  const post = await prisma.activityPost.findUnique({
    where: { id: req.params.id },
    include: {
      activity: true,
      slots: true,
      author: {
        include: {
          profile: true,
          activities: { include: { activity: true } },
          availability: true,
          communityMembers: { include: { community: true } },
        },
      },
    },
  });
  if (!post) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(post);
});
