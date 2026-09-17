import { prisma } from "../lib/prisma.js";
import { notify } from "../lib/notify.js";

// F9: background matching job. In this scaffold it's a periodic poll; swap for
// an event trigger on ActivityPost creation to hit the near-real-time SLA
// without changing the matching logic below.
const NOTIFIED_CACHE = new Set<string>(); // dedupe: don't re-notify for the same post

export async function runWaitlistMatchingSweep(): Promise<void> {
  const activeSubscriptions = await prisma.matchSubscription.findMany({
    where: { status: "active", expiresAt: { gt: new Date() } },
  });

  for (const sub of activeSubscriptions) {
    const candidatePosts = await prisma.activityPost.findMany({
      where: { activityId: sub.activityId, status: "active", authorId: { not: sub.userId } },
      take: 5,
      orderBy: { createdAt: "desc" },
    });

    for (const post of candidatePosts) {
      const dedupeKey = `${sub.id}:${post.id}`;
      if (NOTIFIED_CACHE.has(dedupeKey)) continue;
      NOTIFIED_CACHE.add(dedupeKey);
      notify(sub.userId, "waitlist_match_found", { message: "A new activity matching your waitlist just opened up." }, `/post/${post.id}`);
    }
  }
}

export function startWaitlistMatchingLoop(intervalMs = 60_000): void {
  setInterval(() => {
    runWaitlistMatchingSweep().catch((err) => console.error("[matching] sweep failed", err));
  }, intervalMs);
}
