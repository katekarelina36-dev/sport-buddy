// One-time script: downloads one photo per active sport from Unsplash and
// stores it through the app's own media pipeline (mediaDriver, the same one
// used for profile/community photo uploads) — never through the app's own
// runtime code. Activity.iconUrl then points at that stored copy, so the
// mobile app never calls Unsplash itself and the UNSPLASH_ACCESS_KEY can be
// deleted the moment this script has run once for every sport.
//
// Usage:
//   UNSPLASH_ACCESS_KEY=xxxxx npm run download:sport-images --workspace apps/api
//
// Only re-run this for a sport whose activity_posts just went active for the
// first time, or to refresh a photo — it skips any sport that already has an
// iconUrl unless --force is passed.

import { prisma } from "../src/lib/prisma.js";
import { mediaDriver } from "../src/lib/media.js";

const ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
const FORCE = process.argv.includes("--force");

// Curated search terms for common sports — falls back to "<name> sport" for
// anything not listed here, so a newly-added sport still gets a reasonable photo.
const QUERY_OVERRIDES: Record<string, string> = {
  Tennis: "tennis court",
  Dancing: "dancing dance studio",
  Basketball: "basketball court",
  Football: "football soccer",
  Running: "running jogging park",
  Cycling: "cycling bicycle",
  Yoga: "yoga class studio",
  Padel: "padel sport",
  Badminton: "badminton sport",
  Swimming: "swimming pool",
  Volleyball: "volleyball court",
  Squash: "squash court",
  "Table Tennis": "table tennis ping pong",
  "Gym / Fitness": "gym fitness weights",
  Pilates: "pilates studio",
  Boxing: "boxing gym",
  "Martial Arts": "martial arts dojo",
  Skiing: "skiing mountain",
  Snowboarding: "snowboarding mountain",
  "Ice Skating": "ice skating rink",
  Golf: "golf course",
  Climbing: "rock climbing",
  Chess: "chess board",
  Hiking: "hiking trail mountain",
  Rowing: "rowing boat water",
};

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

interface UnsplashRandomResponse {
  urls?: { raw: string };
}

// Round 10, Fix 3A: `regular` (1080px, but Unsplash also compresses it
// harder) looked blurry once stretched across a full-width card — `raw` +
// explicit crop params gives a controlled, sharp 800×400 straight from
// Unsplash's own resizer instead.
async function fetchAndStore(activity: { id: string; name: string }): Promise<void> {
  const query = encodeURIComponent(QUERY_OVERRIDES[activity.name] ?? `${activity.name} sport`);
  const apiUrl = `https://api.unsplash.com/photos/random?query=${query}&orientation=landscape`;

  const apiRes = await fetch(apiUrl, { headers: { Authorization: `Client-ID ${ACCESS_KEY}` } });
  if (!apiRes.ok) {
    console.error(`✗ ${activity.name}: Unsplash API returned ${apiRes.status}`);
    return;
  }
  const data = (await apiRes.json()) as UnsplashRandomResponse;
  if (!data.urls?.raw) {
    console.error(`✗ ${activity.name}: no image found`);
    return;
  }

  const imageRes = await fetch(`${data.urls.raw}&w=800&h=400&fit=crop&q=85`);
  const buffer = Buffer.from(await imageRes.arrayBuffer());

  const url = await mediaDriver.store("system", `sport-${slug(activity.name)}.jpg`, buffer);
  await prisma.activity.update({ where: { id: activity.id }, data: { iconUrl: url } });
  console.log(`✓ ${activity.name} → ${url}`);
}

async function run() {
  if (!ACCESS_KEY) {
    console.error("Set UNSPLASH_ACCESS_KEY in the environment before running this script.");
    process.exit(1);
  }

  // Step 1: only sports with at least one active activity_post.
  const posts = await prisma.activityPost.findMany({
    where: { status: "active" },
    select: { activity: true },
    distinct: ["activityId"],
  });
  const activities = [...new Map(posts.map((p) => [p.activity.id, p.activity])).values()].sort((a, b) => a.name.localeCompare(b.name));

  const targets = FORCE ? activities : activities.filter((a) => !a.iconUrl);
  console.log(`Downloading photos for ${targets.length} of ${activities.length} active sports...`);

  for (const activity of targets) {
    await fetchAndStore(activity);
    await new Promise((r) => setTimeout(r, 500)); // respect Unsplash rate limits
  }

  console.log("Done. Once every sport you care about has a photo, delete UNSPLASH_ACCESS_KEY from your environment.");
}

run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
