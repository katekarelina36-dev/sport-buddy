import type { ImageSourcePropType } from "react-native";

// Explore Activity screen (Round 3 redesign): only these six sports are
// shown, in this fixed order, regardless of what the API returns.
export const EXPLORE_ACTIVITIES = ["Tennis", "Padel", "Badminton", "Squash", "Basketball", "Volleyball"] as const;

// No photo assets have been provided for these yet — falls back to a flat
// tint (still run through the same opacity/blur/gradient treatment) so the
// card layout can ship now and real photos can drop in later by filling in
// this map with `require("../../assets/activities/<name>.jpg")`.
export const ACTIVITY_IMAGES: Partial<Record<(typeof EXPLORE_ACTIVITIES)[number], ImageSourcePropType>> = {};

export const ACTIVITY_PLACEHOLDER_TINT: Record<(typeof EXPLORE_ACTIVITIES)[number], string> = {
  Tennis: "#8BA888",
  Padel: "#C9A876",
  Badminton: "#D9C089",
  Squash: "#8C8C94",
  Basketball: "#B97452",
  Volleyball: "#7C97B0",
};
