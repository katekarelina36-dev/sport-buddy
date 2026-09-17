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

// F6: single reusable availability component/service, consumed by F3 (filter),
// F5 (profile edit), F9 (waitlist), F12 (scheduler). Replaces the whole set on
// each save; cache invalidation for F3 happens implicitly since the feed query
// reads live rows.
availabilityRouter.put("/", async (req: AuthedRequest, res) => {
  const parsed = z.array(slotSchema).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  await prisma.$transaction([
    prisma.userAvailability.deleteMany({ where: { userId: req.userId! } }),
    prisma.userAvailability.createMany({
      data: parsed.data.map((slot) => ({
        userId: req.userId!,
        dayOfWeek: slot.dayOfWeek,
        date: slot.date ? new Date(slot.date) : null,
        startTime: slot.startTime,
        endTime: slot.endTime,
        recurring: slot.recurring,
      })),
    }),
  ]);
  const availability = await prisma.userAvailability.findMany({ where: { userId: req.userId! } });
  res.json(availability);
});

availabilityRouter.get("/", async (req: AuthedRequest, res) => {
  const availability = await prisma.userAvailability.findMany({ where: { userId: req.userId! } });
  res.json(availability);
});
