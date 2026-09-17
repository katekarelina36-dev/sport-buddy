import express from "express";
import cors from "cors";
import http from "node:http";
import { Server } from "socket.io";
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

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
attachChatGateway(io);

startWaitlistMatchingLoop();

server.listen(env.port, () => {
  console.log(`Sport Buddy API listening on :${env.port}`);
});
