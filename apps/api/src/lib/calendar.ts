import { env } from "./env.js";

export interface CalendarEventInput {
  userId: string;
  provider: "google" | "apple";
  title: string;
  startAt: Date;
  location?: string;
}

export interface CalendarSyncResult {
  status: "synced" | "failed";
  externalEventId?: string;
}

export interface CalendarDriver {
  createEvent(input: CalendarEventInput): Promise<CalendarSyncResult>;
}

// Dev default: no Google/Apple OAuth app required yet. Always "succeeds" so the
// product flow (F12) is fully testable; swap for GoogleCalendarDriver /
// AppleEventKitDriver once OAuth credentials exist (see .env.example).
class LogCalendarDriver implements CalendarDriver {
  async createEvent(input: CalendarEventInput): Promise<CalendarSyncResult> {
    console.log(`[calendar:${input.provider}:${input.userId}] "${input.title}" @ ${input.startAt.toISOString()}`);
    return { status: "synced", externalEventId: `mock-${Date.now()}` };
  }
}

function buildDriver(): CalendarDriver {
  switch (env.calendarDriver) {
    case "log":
    default:
      return new LogCalendarDriver();
    // case "google": return new GoogleCalendarDriver();
    // case "apple": return new AppleEventKitDriver();
  }
}

export const calendarDriver = buildDriver();
