import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthedRequest } from "../lib/auth.js";

export const availabilityRouter = Router();
availabilityRouter.use(requireAuth);

const slotSchema = z.object({
  dayOfWeek: z.number().min(0).max(6).optional(),
  date: z.string().datetime().optional(),
  startTime: z.string(), // "HH:mm", UTC
  endTime: z.string(),
  recurring: z.boolean(),
});

// F6/F1: single reusable availability component/service, consumed by F1 step 3
// (per-sport, ?activityId=), F3 (filter/discovery), F5 (general profile edit),
// F9 (waitlist), F12 (scheduler). An `activityId` query param scopes the
// replace to that sport only, so setting one sport's hours doesn't wipe
// another's; omitting it targets "general" (activityId IS NULL) availability.
availabilityRouter.put("/", async (req: AuthedRequest, res) => {
  const activityId = typeof req.query.activityId === "string" ? req.query.activityId : null;
  const parsed = z.array(slotSchema).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  await prisma.$transaction([
    prisma.userAvailability.deleteMany({ where: { userId: req.userId!, activityId } }),
    prisma.userAvailability.createMany({
      data: parsed.data.map((slot) => ({
        userId: req.userId!,
        activityId,
        dayOfWeek: slot.dayOfWeek,
        date: slot.date ? new Date(slot.date) : null,
        startTime: slot.startTime,
        endTime: slot.endTime,
        recurring: slot.recurring,
      })),
    }),
  ]);
  const availability = await prisma.userAvailability.findMany({ where: { userId: req.userId!, activityId } });
  res.json(availability);
});

availabilityRouter.get("/", async (req: AuthedRequest, res) => {
  const activityId = typeof req.query.activityId === "string" ? req.query.activityId : null;
  const availability = await prisma.userAvailability.findMany({ where: { userId: req.userId!, activityId } });
  res.json(availability);
});
