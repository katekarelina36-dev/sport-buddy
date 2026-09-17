import { Router } from "express";
import { prisma } from "../lib/prisma.js";

export const activitiesRouter = Router();

// F2: server-driven catalog so sports can be added/removed without an app release.
// Cheap to cache/CDN — it changes rarely.
activitiesRouter.get("/", async (_req, res) => {
  const activities = await prisma.activity.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  res.set("Cache-Control", "public, max-age=60");
  res.json(activities);
});
