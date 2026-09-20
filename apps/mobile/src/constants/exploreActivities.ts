// Explore Activity screen (Round 3 redesign): only these sports are shown,
// in this fixed order, regardless of what the API returns. Photos come from
// Activity.iconUrl (server-stored, see
// apps/api/scripts/downloadSportImages.ts) — no local static assets.
export const EXPLORE_ACTIVITIES = [
  "Tennis",
  "Padel",
  "Badminton",
  "Squash",
  "Volleyball",
  "Basketball",
  "Football",
  "Running",
  "Cycling",
  "Gym / Fitness",
  "Yoga",
  "Boxing",
] as const;
