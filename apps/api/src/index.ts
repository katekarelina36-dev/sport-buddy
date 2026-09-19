import express from "express";
// Patches Express's router so a rejected/thrown promise inside an async route
// handler is forwarded to the error middleware below, instead of becoming an
// uncaught exception that crashes the whole process. Must be imported before
// any router (route files) are imported.
import "express-async-errors";
import cors from "cors";
import http from "node:http";
import { Server } from "socket.io";
import { Prisma } from "@prisma/client";
import { env } from "./lib/env.js";
import { authRouter } from "./routes/auth.js";
import { profileRouter } from "./routes/profile.js";
import { activitiesRouter } from "./routes/activities.js";
import { activityPostsRouter } from "./routes/activityPosts.js";
import { activityRequestsRouter } from "./routes/activityRequests.js";
import { availabilityRouter } from "./routes/availability.js";
import { waitlistRouter } from "./routes/waitlist.js";
import { chatsRouter } from "./routes/chats.js";
import { trainingRouter } from "./routes/training.js";
import { communitiesRouter } from "./routes/communities.js";
import { notificationsRouter } from "./routes/notifications.js";
import { usersRouter } from "./routes/users.js";
import { attachChatGateway } from "./sockets/chat.js";
import { startWaitlistMatchingLoop } from "./jobs/matching.js";

const app = express();
app.use(cors());
app.use(express.json());
app.use("/media", express.static(env.mediaLocalDir));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/auth", authRouter);
app.use("/profile", profileRouter);
app.use("/activities", activitiesRouter);
app.use("/activity-posts", activityPostsRouter);
app.use("/activity-requests", activityRequestsRouter);
app.use("/availability", availabilityRouter);
app.use("/waitlist", waitlistRouter);
app.use("/chats", chatsRouter);
app.use("/training", trainingRouter);
app.use("/communities", communitiesRouter);
app.use("/notifications", notificationsRouter);
app.use("/users", usersRouter);

// A stale/valid JWT for a User that no longer exists (e.g. a dev DB reset) —
// or any other Prisma "record not found" — is a client problem, not a server
// crash: 404 (or 401 for the deleted-account case) instead of taking the
// whole API down. Registered last, after every route.
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
    res.status(401).json({ error: "Your session refers to an account that no longer exists — please log in again." });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
attachChatGateway(io);

startWaitlistMatchingLoop();

server.listen(env.port, () => {
  console.log(`Teameo API listening on :${env.port}`);
});
