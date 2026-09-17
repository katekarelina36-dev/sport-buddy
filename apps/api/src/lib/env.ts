import "dotenv/config";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) throw new Error(`Missing required env var ${name}`);
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: required("JWT_SECRET", "dev-only-change-me"),
  mediaDriver: (process.env.MEDIA_STORAGE_DRIVER ?? "local") as "local" | "s3" | "gcs",
  mediaLocalDir: process.env.MEDIA_LOCAL_DIR ?? "./uploads",
  pushDriver: (process.env.PUSH_DRIVER ?? "log") as "log" | "fcm" | "apns",
  calendarDriver: (process.env.CALENDAR_DRIVER ?? "log") as "log" | "google" | "apple",
};
