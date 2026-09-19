import { Router } from "express";
import { z } from "zod";
import sharp from "sharp";
import multer from "multer";
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
  city: z.string().min(1).optional(),
  dateOfBirth: z.string().datetime().optional(),
  bio: z.string().optional(),
  locationLat: z.number().optional(),
  locationLng: z.number().optional(),
  timezone: z.string().optional(),
  // F1 step 3: per-sport level, replacing a single profile-wide level.
  preferredActivities: z.array(z.object({ activityId: z.string(), level: z.enum(["beginner", "intermediate", "advanced"]) })).optional(),
});

const MIN_AGE_YEARS = 16;

// F1 + F5: each field is independently persisted; onboarding is "complete" once
// name, city, date of birth (>=16), photo, and >=1 sport are present (checked below).
profileRouter.patch("/me", async (req: AuthedRequest, res) => {
  const parsed = onboardingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { preferredActivities, dateOfBirth, ...profileFields } = parsed.data;

  if (dateOfBirth && !isAtLeastAge(new Date(dateOfBirth), MIN_AGE_YEARS)) {
    res.status(400).json({ error: `Must be at least ${MIN_AGE_YEARS} years old` });
    return;
  }

  await prisma.userProfile.update({
    where: { userId: req.userId! },
    data: { ...profileFields, ...(dateOfBirth ? { dateOfBirth: new Date(dateOfBirth) } : {}) },
  });

  if (preferredActivities) {
    const activityIds = preferredActivities.map((a) => a.activityId);
    await prisma.userActivity.deleteMany({ where: { userId: req.userId!, activityId: { notIn: activityIds } } });
    for (const { activityId, level } of preferredActivities) {
      await prisma.userActivity.upsert({
        where: { userId_activityId: { userId: req.userId!, activityId } },
        update: { isPreferred: true, level },
        create: { userId: req.userId!, activityId, isPreferred: true, level },
      });
    }
  }

  const profile = await loadFullProfile(req.userId!);
  if (isOnboardingComplete(profile) && !profile.profile?.onboardingCompletedAt) {
    await prisma.userProfile.update({ where: { userId: req.userId! }, data: { onboardingCompletedAt: new Date() } });
  }
  res.json(await loadFullProfile(req.userId!));
});

function isAtLeastAge(dateOfBirth: Date, years: number): boolean {
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - years);
  return dateOfBirth <= cutoff;
}

// F5: photo upload, sent as multipart/form-data (field name "photo") — the
// standard, robust way to move binary files from a mobile client; a raw
// fetch(uri).blob() body round-tripped through two separate fetch() calls
// turned out to be unreliable under Expo SDK 57's fetch implementation and
// was corrupting the bytes before they reached the server.
//
// Client compresses to <=2MB as a first pass, but the server is the actual
// enforcement point: caps upload size, verifies the bytes really decode as
// an image (rejects anything else), and re-encodes to a small fixed-size
// JPEG — which also strips EXIF metadata (which can carry GPS coordinates
// from wherever the photo was taken, a privacy leak independent of the
// app's own location features).
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const photoUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_UPLOAD_BYTES } });

profileRouter.post("/me/photo", photoUpload.single("photo"), async (req: AuthedRequest, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No photo field in upload" });
    return;
  }

  let processed: Buffer;
  try {
    processed = await sharp(req.file.buffer)
      .rotate() // apply EXIF orientation before stripping it
      .resize(512, 512, { fit: "cover" })
      .jpeg({ quality: 80 })
      .toBuffer();
  } catch {
    res.status(400).json({ error: "Uploaded file is not a valid image" });
    return;
  }

  const url = await mediaDriver.store(req.userId!, `profile-${Date.now()}.jpg`, processed);
  await prisma.userProfile.update({ where: { userId: req.userId! }, data: { photoUrl: url } });
  await prisma.mediaAsset.create({ data: { userId: req.userId!, url, type: "photo" } });
  res.json({ photoUrl: url });
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
      profile.profile?.city &&
      profile.profile?.dateOfBirth &&
      profile.profile?.photoUrl &&
      profile.activities.length > 0
  );
}
