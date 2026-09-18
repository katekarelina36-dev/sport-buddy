# Feature-to-code map

Reference for the technical requirements doc (F1–F16). "API" paths are relative to `apps/api/src`, "Mobile" paths relative to `apps/mobile`.

| Feature | API | Mobile |
|---|---|---|
| F1 Onboarding / profile creation | `routes/auth.ts`, `routes/profile.ts` | `app/auth/index.tsx`, `app/onboarding/index.tsx` |
| F2 Home: activity selection | `routes/activities.ts` | `app/(tabs)/index.tsx` |
| F3 Activity Posts feed | `routes/activityPosts.ts` (GET /) | `app/feed/[activityId].tsx` |
| F4 Activity Post detail | `routes/activityPosts.ts` (GET /:id) | `app/post/[postId].tsx` |
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

- **F5 inline per-section edit affordances** — profile view renders; wiring each pencil-icon field to its own optimistic PATCH is straightforward given `PATCH /profile/me` already exists, but only onboarding currently calls it.
- **F16 device registration** — the API endpoint (`POST /notifications/push-tokens`) exists; the mobile app doesn't yet request permission / call it (needs `expo-notifications` + real FCM/APNs credentials to be meaningful).
- **Recurring events** (F12) — `TrainingSession.recurrenceRule` is modeled and accepted by the API; the job that actually expands a recurrence into future `TrainingSession` rows isn't implemented yet.
- **Swipe-to-decide on F8** — explicitly called out as "nice-to-have, not MVP-blocking" in the spec; buttons only for now.
- **Report/Block** (F4 safety requirement) and its moderation queue — not modeled yet.
- **Geo radius filtering** (PostGIS queries) — schema has `locationLat/Lng` and the Postgres image includes the PostGIS extension, but the feed query doesn't yet do a radius filter; profile-level exact-location-hiding (privacy requirement) also isn't enforced at the API layer yet.
- **Per-sport skill level in onboarding (F1)** — `UserActivity.level` already exists in the schema (one level per activity per user), but the onboarding wizard only collects a single overall level applied to `UserProfile.level`, and `PATCH /profile/me`'s `preferredActivityIds` creates each `UserActivity` with a hardcoded default level rather than a per-sport choice. Needs: (1) onboarding UI change — after picking sports, show a level picker per selected sport instead of one global level step; (2) `PATCH /profile/me` request shape change from `preferredActivityIds: string[]` to something like `preferredActivities: { activityId, level }[]`; (3) same treatment wherever else a level is set (F5 edit, F4 display already reads per-activity `level` correctly since the schema supports it).

None of these block the core loop (onboarding → post → request → approve → chat → schedule → challenge → complete) from working end-to-end.
