import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthedRequest } from "../lib/auth.js";

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

// F16: device token registration for FCM/APNs dispatch.
notificationsRouter.post("/push-tokens", async (req: AuthedRequest, res) => {
  const schema = z.object({ deviceToken: z.string(), platform: z.enum(["ios", "android"]) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const token = await prisma.pushToken.upsert({
    where: { userId_deviceToken: { userId: req.userId!, deviceToken: parsed.data.deviceToken } },
    update: { platform: parsed.data.platform },
    create: { userId: req.userId!, ...parsed.data },
  });
  res.status(201).json(token);
});

notificationsRouter.get("/", async (req: AuthedRequest, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.userId! },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  res.json(notifications);
});

notificationsRouter.post("/:id/read", async (req: AuthedRequest, res) => {
  await prisma.notification.update({ where: { id: req.params.id }, data: { read: true } });
  res.json({ ok: true });
});
