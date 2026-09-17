import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthedRequest } from "../lib/auth.js";
import { mediaDriver } from "../lib/media.js";

export const profileRouter = Router();
profileRouter.use(requireAuth);

// F5: full profile — reused by F1 onboarding completion and F4's "author" view.
profileRouter.get("/me", async (req: AuthedRequest, res) => {
  const profile = await loadFullProfile(req.userId!);
  res.json(profile);
});

const onboardingSchema = z.object({
  displayName: z.string().min(1).optional(),
  bio: z.string().optional(),
  level: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  locationLat: z.number().optional(),
  locationLng: z.number().optional(),
  timezone: z.string().optional(),
  preferredActivityIds: z.array(z.string()).optional(),
});

// F1 + F5: each field is independently persisted; onboarding is "complete" once
// name, photo, >=1 activity, and level are all present (checked on read below).
profileRouter.patch("/me", async (req: AuthedRequest, res) => {
  const parsed = onboardingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { preferredActivityIds, ...profileFields } = parsed.data;

  await prisma.userProfile.update({
    where: { userId: req.userId! },
    data: profileFields,
  });

  if (preferredActivityIds) {
    await prisma.userActivity.deleteMany({ where: { userId: req.userId!, activityId: { notIn: preferredActivityIds } } });
    for (const activityId of preferredActivityIds) {
      await prisma.userActivity.upsert({
        where: { userId_activityId: { userId: req.userId!, activityId } },
        update: { isPreferred: true },
        create: { userId: req.userId!, activityId, isPreferred: true },
      });
    }
  }

  const profile = await loadFullProfile(req.userId!);
  if (isOnboardingComplete(profile) && !profile.profile?.onboardingCompletedAt) {
    await prisma.userProfile.update({ where: { userId: req.userId! }, data: { onboardingCompletedAt: new Date() } });
  }
  res.json(await loadFullProfile(req.userId!));
});

// F5: photo upload, compressed client-side to <=2MB before hitting this endpoint.
profileRouter.post("/me/photo", async (req: AuthedRequest, res) => {
  const chunks: Buffer[] = [];
  req.on("data", (chunk) => chunks.push(chunk));
  req.on("end", async () => {
    const buffer = Buffer.concat(chunks);
    const url = await mediaDriver.store(req.userId!, `profile-${Date.now()}.jpg`, buffer);
    await prisma.userProfile.update({ where: { userId: req.userId! }, data: { photoUrl: url } });
    await prisma.mediaAsset.create({ data: { userId: req.userId!, url, type: "photo" } });
    res.json({ photoUrl: url });
  });
});

profileRouter.patch("/me/permissions", async (req: AuthedRequest, res) => {
  const schema = z.object({ locationGranted: z.boolean().optional(), calendarGranted: z.boolean().optional(), pushGranted: z.boolean().optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const permissions = await prisma.userPermissions.update({ where: { userId: req.userId! }, data: parsed.data });
  res.json(permissions);
});

export async function loadFullProfile(userId: string) {
  return prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      profile: true,
      permissions: true,
      activities: { include: { activity: true } },
      availability: true,
      communityMembers: { include: { community: true } },
    },
  });
}

function isOnboardingComplete(profile: Awaited<ReturnType<typeof loadFullProfile>>): boolean {
  return Boolean(
    profile.profile?.displayName &&
      profile.profile?.photoUrl &&
      profile.profile?.level &&
      profile.activities.length > 0
  );
}
