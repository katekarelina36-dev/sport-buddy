# Feature-to-code map

Reference for the technical requirements doc (F1–F16). "API" paths are relative to `apps/api/src`, "Mobile" paths relative to `apps/mobile`.

| Feature | API | Mobile |
|---|---|---|
| F1 Onboarding / profile creation | `routes/auth.ts`, `routes/profile.ts` | `app/auth/index.tsx`, `app/onboarding/index.tsx` |
| F2 Home: activity selection | `routes/activities.ts` | `app/(tabs)/index.tsx` |
| F3 Explore Activities feed (user discovery) | `routes/users.ts` (GET /discover) | `app/feed/[activityId].tsx`, `src/components/FilterSheet.tsx` |
| F4 User profile detail (+ report/block) | `routes/users.ts` (GET /:id, POST /:id/report, POST /:id/block) | `app/user/[userId].tsx` |
| F5 My Profile | `routes/profile.ts` | `app/(tabs)/profile.tsx` |
| F6 Availability calendar (shared) | `routes/availability.ts` | `src/components/AvailabilityPicker.tsx`, `app/availability.tsx` |
| F7 Activity Request flow | `routes/activityRequests.ts` (POST /) | `app/post/[postId].tsx` |
| F8 Pending requests + approve/reject | `routes/activityRequests.ts` (approve/reject) | `app/requests/index.tsx` |
| F9 Waitlist / notify-me | `routes/waitlist.ts`, `jobs/matching.ts` | `app/availability.tsx` (`mode=waitlist`) |
| F10 Chats list | `routes/chats.ts` (GET /) | `app/(tabs)/chats.tsx` |
| F11 Chat + auto-starters | `routes/chats.ts`, `sockets/chat.ts` | `app/chat/[chatId].tsx` |
| F12 In-chat scheduler + calendar sync | `routes/training.ts` (POST /), `lib/calendar.ts` | `app/chat/[chatId].tsx` (scheduler modal) |
| F13 Challenge card auto-send | `routes/training.ts` (challenge selection block) | `app/chat/[chatId].tsx` (`MessageBubble` challenge styling) |
| F14 Training completion | `routes/training.ts` (complete-first / complete) | `app/chat/[chatId].tsx` (`FirstCompletionForm`) |
| F15 Communities (read-only) | `routes/communities.ts` | `app/(tabs)/profile.tsx`, `app/post/[postId].tsx` |
| F16 Push notifications | `lib/notify.ts`, `lib/push.ts`, `routes/notifications.ts` | (device token registration wiring is the next step — see below) |

## Known gaps vs. the full spec (by design, for a first scaffold)

- ~~F5 profile editing~~ **Fixed**: `app/profile/edit.tsx` — photo, name, bio, and preferred activities are editable from one screen (`Edit profile` button on My Profile). Not yet done: per-section inline pencil-icon editing (one field at a time, optimistic) as the spec originally describes — this is a single edit screen instead. Level isn't editable here yet (see the per-sport-level item below).
- **F16 device registration** — the API endpoint (`POST /notifications/push-tokens`) exists; the mobile app doesn't yet request permission / call it (needs `expo-notifications` + real FCM/APNs credentials to be meaningful).
- **Recurring events** (F12) — `TrainingSession.recurrenceRule` is modeled and accepted by the API; the job that actually expands a recurrence into future `TrainingSession` rows isn't implemented yet.
- **Swipe-to-decide on F8** — explicitly called out as "nice-to-have, not MVP-blocking" in the spec; buttons only for now.
- **Report/Block** (F4 safety requirement) and its moderation queue — not modeled yet.
- **Geo radius filtering** (PostGIS queries) — schema has `locationLat/Lng` and the Postgres image includes the PostGIS extension, but the feed query doesn't yet do a radius filter; profile-level exact-location-hiding (privacy requirement) also isn't enforced at the API layer yet.
- **Per-sport skill level in onboarding (F1)** — `UserActivity.level` already exists in the schema (one level per activity per user), but the onboarding wizard only collects a single overall level applied to `UserProfile.level`, and `PATCH /profile/me`'s `preferredActivityIds` creates each `UserActivity` with a hardcoded default level rather than a per-sport choice. Needs: (1) onboarding UI change — after picking sports, show a level picker per selected sport instead of one global level step; (2) `PATCH /profile/me` request shape change from `preferredActivityIds: string[]` to something like `preferredActivities: { activityId, level }[]`; (3) same treatment wherever else a level is set (F5 edit, F4 display already reads per-activity `level` correctly since the schema supports it).

None of these block the core loop (onboarding → post → request → approve → chat → schedule → challenge → complete) from working end-to-end.

## F1/F3/F4 redesign (pixel spec: name/city/DOB onboarding, profile-discovery feed)

A detailed design spec replaced the original F1/F3/F4 flow with a different discovery model: instead of browsing user-created "Activity Posts," F3 now shows cards of *people* who have set availability for a sport, and F4 is their full profile (not a post). Implemented:

- **F1** is now 4 steps: Name+City → Date of Birth (16+ enforced) → Sports with an inline per-sport level + weekly availability picker → Photo. `UserProfile` gained `city`/`dateOfBirth`; the old single profile-wide `level` field is unused (kept in the schema, harmless) in favor of per-sport `UserActivity.level` (closes the earlier per-sport-level backlog item).
- **`UserAvailability`** gained an optional `activityId` — `null` rows are "general" availability (F5/F9/F12 still use these), non-null rows are per-sport (set during F1, read by F3/F4).
- **`ActivityRequest`** now supports two shapes: the legacy `{postId, slotId}` (F7's original Activity Post flow — still functional but has no UI entry point anymore since nothing creates an ActivityPost from the app) and a new direct `{targetUserId, activityId}` (F3/F4's "Send Activity Request" button, no post involved). F8's approve/reject/pending queue handles both.
- **Report/Block** (previously just a backlog line) is now implemented: `UserReport` and `UserBlock` tables, `POST /users/:id/report`, `POST /users/:id/block`; blocked users are excluded from `/users/discover` in both directions. There's no admin-side view of reports yet — they're just recorded.
- **Not implemented**: the filter sheet's distance slider is UI-only — `/users/discover` doesn't yet apply `distanceKm` (same PostGIS-radius gap noted above).

None of this blocks trying the new flow end-to-end (onboard with a sport+schedule → browse the feed → open a profile → send a request → F8 → chat).

## Security backlog: user-uploaded photos

Current state (`lib/media.ts`, `routes/profile.ts` POST `/me/photo`) is a dev-only scaffold and has real gaps before this could hold real users' photos:

- ~~No server-side content-type validation / no size cap~~ **Fixed**: `POST /profile/me/photo` now caps raw upload size (8MB) and pipes the upload through `sharp` — decode-validates it's really an image, resizes to a fixed 512×512 JPEG, and strips EXIF metadata in the process (EXIF can carry GPS coordinates from the original photo — a privacy leak independent of the app's own location features).
- **No access control on serving media** — `/media/*` is still a public static route; anyone with a `photoUrl` can view it without being authenticated or matched with that user. Needs at minimum an auth check (or signed/expiring URLs once this moves to S3/GCS, per the README's swap-out plan).
- **No deletion path** — no way for a user (or an account-deletion flow) to remove a previously uploaded photo from storage; needed for any real privacy/right-to-erasure compliance.
- **Local disk storage** — fine for this dev scaffold; production must move to the S3/GCS `MediaDriver` already stubbed in `lib/media.ts`, with private-by-default bucket ACLs.

None of this blocks continued MVP testing with fake/throwaway photos; it matters before any real user's photo touches this system.
