import fs from "node:fs";
import path from "node:path";
import { env } from "./env.js";

export interface MediaDriver {
  store(userId: string, filename: string, data: Buffer): Promise<string>; // returns URL
}

// Dev default: writes to local disk under MEDIA_LOCAL_DIR, served statically.
// Swap for S3Driver / GcsDriver behind a CDN in production (see README).
class LocalMediaDriver implements MediaDriver {
  async store(userId: string, filename: string, data: Buffer): Promise<string> {
    const dir = path.join(env.mediaLocalDir, userId);
    fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, data);
    return `/media/${userId}/${filename}`;
  }
}

function buildDriver(): MediaDriver {
  switch (env.mediaDriver) {
    case "local":
    default:
      return new LocalMediaDriver();
    // case "s3": return new S3MediaDriver();
    // case "gcs": return new GcsMediaDriver();
  }
}

export const mediaDriver = buildDriver();
