import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthedRequest } from "../lib/auth.js";

export const waitlistRouter = Router();
waitlistRouter.use(requireAuth);

const subscribeSchema = z.object({
  activityId: z.string(),
  availabilityWindow: z.record(z.unknown()),
  locationRadiusKm: z.number().optional(),
  daysValid: z.number().min(1).max(90).default(30),
});

// F9: "Couldn't find a match?" — subscribe to be notified when a matching
// Activity Post appears. Matching runs as an async job (see jobs/matching.ts),
// not at request time.
waitlistRouter.post("/", async (req: AuthedRequest, res) => {
  const parsed = subscribeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { activityId, availabilityWindow, locationRadiusKm, daysValid } = parsed.data;
  const expiresAt = new Date(Date.now() + daysValid * 24 * 60 * 60 * 1000);
  const subscription = await prisma.matchSubscription.create({
    data: { userId: req.userId!, activityId, availabilityWindow: availabilityWindow as Prisma.InputJsonValue, locationRadiusKm, expiresAt },
  });
  res.status(201).json(subscription);
});

waitlistRouter.get("/", async (req: AuthedRequest, res) => {
  const subs = await prisma.matchSubscription.findMany({ where: { userId: req.userId!, status: "active" } });
  res.json(subs);
});

waitlistRouter.post("/:id/cancel", async (req: AuthedRequest, res) => {
  await prisma.matchSubscription.update({
    where: { id: req.params.id },
    data: { status: "cancelled" },
  });
  res.json({ ok: true });
});
