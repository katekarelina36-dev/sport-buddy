// One-time script: loads Kate's own custom sport photos (checked into the
// repo under apps/api/assets/custom-sport-photos/) and stores each one
// through the app's own media pipeline (mediaDriver, same as the Unsplash
// download script), setting Activity.iconUrl. These take priority over any
// Unsplash-sourced photo — run this BEFORE downloadSportImages.ts so that
// script skips every sport already covered here and only fills the rest.
//
// Usage:
//   npm run ingest:custom-sport-images --workspace apps/api

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "../src/lib/prisma.js";
import { mediaDriver } from "../src/lib/media.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PHOTOS_DIR = path.join(__dirname, "../assets/custom-sport-photos");

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function run() {
  const files = fs.readdirSync(PHOTOS_DIR).filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f));
  if (files.length === 0) {
    console.log(`No custom photos found in ${PHOTOS_DIR}`);
    return;
  }

  const activities = await prisma.activity.findMany();
  const bySlug = new Map(activities.map((a) => [slug(a.name), a]));

  for (const file of files) {
    const stem = path.parse(file).name;
    const activity = bySlug.get(slug(stem));
    if (!activity) {
      console.error(`✗ ${file}: no matching activity for "${stem}"`);
      continue;
    }

    const buffer = fs.readFileSync(path.join(PHOTOS_DIR, file));
    const url = await mediaDriver.store("system", `sport-${slug(activity.name)}.jpg`, buffer);
    await prisma.activity.update({ where: { id: activity.id }, data: { iconUrl: url } });
    console.log(`✓ ${activity.name} → ${url}`);
  }

  console.log("Done. Run download:sport-images next to fill in any sports still missing a photo.");
}

run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
