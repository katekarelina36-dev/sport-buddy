import { Router } from "express";
import { z } from "zod";
import sharp from "sharp";
import multer from "multer";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthedRequest } from "../lib/auth.js";
import { mediaDriver } from "../lib/media.js";
import { notify } from "../lib/notify.js";
import { emitToCommunity } from "../sockets/chat.js";
import type { CommunityRole } from "@prisma/client";

export const communitiesRouter = Router();
communitiesRouter.use(requireAuth);

async function membershipRole(communityId: string, userId: string): Promise<CommunityRole | null> {
  const member = await prisma.communityMember.findUnique({ where: { communityId_userId: { communityId, userId } } });
  return member?.role ?? null;
}

function canManage(role: CommunityRole | null): boolean {
  return role === "organiser" || role === "assistant";
}

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const photoUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_UPLOAD_BYTES } });

// Community photo — uploaded independently of a community record, since none
// exists yet while filling out Create Community (same pipeline as profile
// photos: decode-validate, resize, strip EXIF).
communitiesRouter.post("/photo", photoUpload.single("photo"), async (req: AuthedRequest, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No photo field in upload" });
    return;
  }
  let processed: Buffer;
  try {
    processed = await sharp(req.file.buffer).rotate().resize(512, 512, { fit: "cover" }).jpeg({ quality: 80 }).toBuffer();
  } catch {
    res.status(400).json({ error: "Uploaded file is not a valid image" });
    return;
  }
  const url = await mediaDriver.store(req.userId!, `community-${Date.now()}.jpg`, processed);
  res.json({ photoUrl: url });
});

// F15 -> full feature: list, client-filters by name as the user types.
communitiesRouter.get("/", async (req: AuthedRequest, res) => {
  const communities = await prisma.community.findMany({
    include: { activity: true, _count: { select: { members: true } } },
    orderBy: { createdAt: "desc" },
  });
  const [myMemberships, myPendingRequests] = await Promise.all([
    prisma.communityMember.findMany({ where: { userId: req.userId! }, select: { communityId: true, role: true } }),
    prisma.communityJoinRequest.findMany({ where: { requesterId: req.userId!, status: "pending" }, select: { communityId: true } }),
  ]);
  const roleByCommunity = new Map(myMemberships.map((m) => [m.communityId, m.role]));
  const pendingSet = new Set(myPendingRequests.map((r) => r.communityId));

  res.json(
    communities.map((c) => ({
      ...c,
      memberCount: c._count.members,
      myRole: roleByCommunity.get(c.id) ?? null,
      joinRequestPending: pendingSet.has(c.id),
    }))
  );
});

const createSchema = z.object({
  name: z.string().min(1).max(50),
  activityId: z.string(),
  photoUrl: z.string().optional(),
  description: z.string().max(300).optional(),
  invitedUserIds: z.array(z.string()).optional(),
});

// Unlock rule: 3+ completed Events (any sport) — see bumpCompletedTrainings in routes/training.ts.
communitiesRouter.post("/", async (req: AuthedRequest, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const profile = await prisma.userProfile.findUniqueOrThrow({ where: { userId: req.userId! } });
  if (profile.completedTrainingsCount < 3) {
    res.status(403).json({ error: "Complete 3 events to unlock community creation" });
    return;
  }

  const { name, activityId, photoUrl, description, invitedUserIds } = parsed.data;
  const community = await prisma.community.create({
    data: {
      name,
      activityId,
      photoUrl,
      description,
      creatorId: req.userId!,
      members: { create: { userId: req.userId!, role: "organiser" } },
    },
    include: { activity: true },
  });

  for (const invitedUserId of invitedUserIds ?? []) {
    await prisma.communityInvitation.upsert({
      where: { communityId_invitedUserId: { communityId: community.id, invitedUserId } },
      update: {},
      create: { communityId: community.id, invitedBy: req.userId!, invitedUserId },
    });
    notify(invitedUserId, "community_invitation", { message: `You've been invited to join ${community.name}.` }, `/communities/${community.id}`);
  }

  res.status(201).json({ ...community, memberCount: 1, myRole: "organiser", joinRequestPending: false });
});

communitiesRouter.get("/:id", async (req: AuthedRequest, res) => {
  const community = await prisma.community.findUniqueOrThrow({
    where: { id: req.params.id },
    include: { activity: true, _count: { select: { members: true } } },
  });
  const [myRole, pendingRequest] = await Promise.all([
    membershipRole(community.id, req.userId!),
    prisma.communityJoinRequest.findFirst({ where: { communityId: community.id, requesterId: req.userId!, status: "pending" } }),
  ]);
  res.json({ ...community, memberCount: community._count.members, myRole, joinRequestPending: Boolean(pendingRequest) });
});

const editSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().max(300).optional(),
  photoUrl: z.string().optional(),
});

communitiesRouter.patch("/:id", async (req: AuthedRequest, res) => {
  const myRole = await membershipRole(req.params.id, req.userId!);
  if (myRole !== "organiser") {
    res.status(403).json({ error: "Organiser only" });
    return;
  }
  const parsed = editSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const community = await prisma.community.update({ where: { id: req.params.id }, data: parsed.data, include: { activity: true } });
  res.json(community);
});

// Join / leave — organiser approves every join request.
communitiesRouter.post("/:id/join", async (req: AuthedRequest, res) => {
  const existingMember = await membershipRole(req.params.id, req.userId!);
  if (existingMember) {
    res.status(200).json({ ok: true });
    return;
  }
  const existingRequest = await prisma.communityJoinRequest.findFirst({
    where: { communityId: req.params.id, requesterId: req.userId!, status: "pending" },
  });
  if (existingRequest) {
    res.status(200).json(existingRequest);
    return;
  }
  const request = await prisma.communityJoinRequest.create({ data: { communityId: req.params.id, requesterId: req.userId! } });
  const community = await prisma.community.findUniqueOrThrow({ where: { id: req.params.id } });
  notify(community.creatorId, "community_join_request", { message: "Someone wants to join your community." }, `/communities/${req.params.id}`);
  res.status(201).json(request);
});

communitiesRouter.post("/:id/leave", async (req: AuthedRequest, res) => {
  await prisma.communityMember.deleteMany({ where: { communityId: req.params.id, userId: req.userId! } });
  res.json({ ok: true });
});

communitiesRouter.get("/:id/join-requests", async (req: AuthedRequest, res) => {
  const myRole = await membershipRole(req.params.id, req.userId!);
  if (myRole !== "organiser") {
    res.status(403).json({ error: "Organiser only" });
    return;
  }
  const requests = await prisma.communityJoinRequest.findMany({
    where: { communityId: req.params.id, status: "pending" },
    include: { requester: { include: { profile: true } } },
    orderBy: { createdAt: "asc" },
  });
  res.json(requests);
});

communitiesRouter.post("/:id/join-requests/:requestId/approve", async (req: AuthedRequest, res) => {
  const myRole = await membershipRole(req.params.id, req.userId!);
  if (myRole !== "organiser") {
    res.status(403).json({ error: "Organiser only" });
    return;
  }
  const request = await prisma.communityJoinRequest.update({
    where: { id: req.params.requestId },
    data: { status: "approved", decidedAt: new Date() },
  });
  await prisma.communityMember.upsert({
    where: { communityId_userId: { communityId: request.communityId, userId: request.requesterId } },
    update: {},
    create: { communityId: request.communityId, userId: request.requesterId, role: "member" },
  });
  notify(request.requesterId, "community_join_approved", { message: "Your request to join was approved!" }, `/communities/${request.communityId}`);
  res.json({ ok: true });
});

communitiesRouter.post("/:id/join-requests/:requestId/decline", async (req: AuthedRequest, res) => {
  const myRole = await membershipRole(req.params.id, req.userId!);
  if (myRole !== "organiser") {
    res.status(403).json({ error: "Organiser only" });
    return;
  }
  const request = await prisma.communityJoinRequest.update({
    where: { id: req.params.requestId },
    data: { status: "declined", decidedAt: new Date() },
  });
  notify(request.requesterId, "community_join_declined", { message: "Your request to join was declined." });
  res.json({ ok: true });
});

// Members
communitiesRouter.get("/:id/members", async (req: AuthedRequest, res) => {
  const members = await prisma.communityMember.findMany({
    where: { communityId: req.params.id },
    include: { user: { include: { profile: true } } },
    orderBy: { joinedAt: "asc" },
  });
  res.json(members);
});

const roleSchema = z.object({ role: z.enum(["assistant", "member"]) });

communitiesRouter.post("/:id/members/:userId/role", async (req: AuthedRequest, res) => {
  const myRole = await membershipRole(req.params.id, req.userId!);
  if (myRole !== "organiser") {
    res.status(403).json({ error: "Organiser only" });
    return;
  }
  const parsed = roleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  await prisma.communityMember.update({
    where: { communityId_userId: { communityId: req.params.id, userId: req.params.userId } },
    data: { role: parsed.data.role },
  });
  res.json({ ok: true });
});

communitiesRouter.delete("/:id/members/:userId", async (req: AuthedRequest, res) => {
  const myRole = await membershipRole(req.params.id, req.userId!);
  if (myRole !== "organiser") {
    res.status(403).json({ error: "Organiser only" });
    return;
  }
  await prisma.communityMember.delete({ where: { communityId_userId: { communityId: req.params.id, userId: req.params.userId } } });
  res.json({ ok: true });
});

// Invitations
const inviteSchema = z.object({ userId: z.string() });

communitiesRouter.post("/:id/invite", async (req: AuthedRequest, res) => {
  const myRole = await membershipRole(req.params.id, req.userId!);
  if (!canManage(myRole)) {
    res.status(403).json({ error: "Organiser/assistant only" });
    return;
  }
  const parsed = inviteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const invitation = await prisma.communityInvitation.upsert({
    where: { communityId_invitedUserId: { communityId: req.params.id, invitedUserId: parsed.data.userId } },
    update: {},
    create: { communityId: req.params.id, invitedBy: req.userId!, invitedUserId: parsed.data.userId },
  });
  notify(parsed.data.userId, "community_invitation", { message: "You've been invited to a community." }, `/communities/${req.params.id}`);
  res.status(201).json(invitation);
});

// Club Events
const eventSchema = z.object({
  title: z.string().min(1),
  scheduledAt: z.string().datetime(),
  locationText: z.string().optional(),
  isRecurring: z.boolean().default(false),
  recurrenceRule: z.string().optional(),
  maxParticipants: z.number().min(2).max(100).optional(),
});

communitiesRouter.get("/:id/events", async (req: AuthedRequest, res) => {
  const events = await prisma.clubEvent.findMany({
    where: { communityId: req.params.id },
    include: { rsvps: { where: { status: "going" }, include: { user: { include: { profile: true } } } } },
    orderBy: { scheduledAt: "asc" },
  });
  res.json(events);
});

communitiesRouter.post("/:id/events", async (req: AuthedRequest, res) => {
  const myRole = await membershipRole(req.params.id, req.userId!);
  if (!canManage(myRole)) {
    res.status(403).json({ error: "Organiser/assistant only" });
    return;
  }
  const parsed = eventSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { scheduledAt, ...rest } = parsed.data;
  const event = await prisma.clubEvent.create({
    data: { communityId: req.params.id, createdBy: req.userId!, scheduledAt: new Date(scheduledAt), ...rest },
  });
  const members = await prisma.communityMember.findMany({ where: { communityId: req.params.id }, select: { userId: true } });
  for (const m of members) {
    notify(m.userId, "club_event_created", { message: `New event: ${event.title}` }, `/communities/${req.params.id}`);
  }
  res.status(201).json(event);
});

const rsvpSchema = z.object({ status: z.enum(["going", "not_going"]) });

communitiesRouter.post("/events/:eventId/rsvp", async (req: AuthedRequest, res) => {
  const parsed = rsvpSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const rsvp = await prisma.clubEventRsvp.upsert({
    where: { eventId_userId: { eventId: req.params.eventId, userId: req.userId! } },
    update: { status: parsed.data.status },
    create: { eventId: req.params.eventId, userId: req.userId!, status: parsed.data.status },
  });
  res.json(rsvp);
});

// Feed (posts) — distinct from the chat below.
communitiesRouter.get("/:id/posts", async (req: AuthedRequest, res) => {
  const posts = await prisma.communityPost.findMany({
    where: { communityId: req.params.id },
    include: { author: { include: { profile: true } } },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
  });
  res.json(posts);
});

const postSchema = z.object({ body: z.string().min(1), isPinned: z.boolean().default(false) });

communitiesRouter.post("/:id/posts", async (req: AuthedRequest, res) => {
  const myRole = await membershipRole(req.params.id, req.userId!);
  if (!canManage(myRole)) {
    res.status(403).json({ error: "Organiser/assistant only" });
    return;
  }
  const parsed = postSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const post = await prisma.communityPost.create({
    data: { communityId: req.params.id, authorId: req.userId!, ...parsed.data },
    include: { author: { include: { profile: true } } },
  });
  res.status(201).json(post);
});

communitiesRouter.post("/posts/:postId/pin", async (req: AuthedRequest, res) => {
  const post = await prisma.communityPost.findUniqueOrThrow({ where: { id: req.params.postId } });
  const myRole = await membershipRole(post.communityId, req.userId!);
  if (!canManage(myRole)) {
    res.status(403).json({ error: "Not allowed" });
    return;
  }
  const updated = await prisma.communityPost.update({ where: { id: post.id }, data: { isPinned: !post.isPinned } });
  res.json(updated);
});

communitiesRouter.delete("/posts/:postId", async (req: AuthedRequest, res) => {
  const post = await prisma.communityPost.findUniqueOrThrow({ where: { id: req.params.postId } });
  const myRole = await membershipRole(post.communityId, req.userId!);
  if (!canManage(myRole)) {
    res.status(403).json({ error: "Not allowed" });
    return;
  }
  await prisma.communityPost.delete({ where: { id: post.id } });
  res.json({ ok: true });
});

// Community chat — REST for history/fallback send; sockets/chat.ts handles
// the real-time path ("community:join" / "community:message").
communitiesRouter.get("/:id/messages", async (req: AuthedRequest, res) => {
  const cursor = req.query.cursor as string | undefined;
  const messages = await prisma.communityMessage.findMany({
    where: { communityId: req.params.id },
    include: { sender: { include: { profile: true } } },
    orderBy: { createdAt: "desc" },
    take: 30,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  res.json(messages.reverse());
});

const messageSchema = z.object({ body: z.string().min(1) });

communitiesRouter.post("/:id/messages", async (req: AuthedRequest, res) => {
  const parsed = messageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const message = await prisma.communityMessage.create({
    data: { communityId: req.params.id, senderId: req.userId!, body: parsed.data.body },
    include: { sender: { include: { profile: true } } },
  });
  emitToCommunity(req.params.id, "community:message", message);
  res.status(201).json(message);
});

communitiesRouter.post("/messages/:messageId/pin", async (req: AuthedRequest, res) => {
  const message = await prisma.communityMessage.findUniqueOrThrow({ where: { id: req.params.messageId } });
  const myRole = await membershipRole(message.communityId, req.userId!);
  if (!canManage(myRole)) {
    res.status(403).json({ error: "Not allowed" });
    return;
  }
  const updated = await prisma.communityMessage.update({ where: { id: message.id }, data: { isPinned: !message.isPinned } });
  res.json(updated);
});
