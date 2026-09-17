import { env } from "./env.js";

export interface PushMessage {
  userId: string;
  title: string;
  body: string;
  deepLink?: string;
  data?: Record<string, string>;
}

export interface PushDriver {
  send(message: PushMessage): Promise<void>;
}

// Dev default: no APNs/FCM credentials required. Logs what would be sent.
// Swap in FcmPushDriver / ApnsPushDriver once PUSH_DRIVER=fcm|apns and creds are set.
class LogPushDriver implements PushDriver {
  async send(message: PushMessage): Promise<void> {
    console.log(`[push:${message.userId}] ${message.title} — ${message.body}`, message.data ?? {});
  }
}

function buildDriver(): PushDriver {
  switch (env.pushDriver) {
    case "log":
    default:
      return new LogPushDriver();
    // case "fcm": return new FcmPushDriver();
    // case "apns": return new ApnsPushDriver();
  }
}

export const pushDriver = buildDriver();
