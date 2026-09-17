import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../lib/auth.js";

export const communitiesRouter = Router();
communitiesRouter.use(requireAuth);

// F15: MVP scope is read-only display of membership (used as a trust signal on
// F4/F5). Modeled as its own entity from day one so join/create can land later
// without a data migration.
communitiesRouter.get("/:id", async (req, res) => {
  const community = await prisma.community.findUniqueOrThrow({
    where: { id: req.params.id },
    include: { members: { include: { user: { include: { profile: true } } } } },
  });
  res.json(community);
});
