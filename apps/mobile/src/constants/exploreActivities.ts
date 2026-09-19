import type { ImageSourcePropType } from "react-native";

// Explore Activity screen (Round 3 redesign): only these six sports are
// shown, in this fixed order, regardless of what the API returns.
export const EXPLORE_ACTIVITIES = ["Tennis", "Padel", "Badminton", "Squash", "Basketball", "Volleyball"] as const;

// Padel has no photo yet — falls back to a flat tint (still run through the
// same opacity/blur/gradient treatment) until one is provided.
export const ACTIVITY_IMAGES: Partial<Record<(typeof EXPLORE_ACTIVITIES)[number], ImageSourcePropType>> = {
  Tennis: require("../../assets/activities/tennis.jpg"),
  Badminton: require("../../assets/activities/badminton.jpg"),
  Squash: require("../../assets/activities/squash.jpg"),
  Basketball: require("../../assets/activities/basketball.jpg"),
  Volleyball: require("../../assets/activities/volleyball.jpg"),
};

export const ACTIVITY_PLACEHOLDER_TINT: Record<(typeof EXPLORE_ACTIVITIES)[number], string> = {
  Tennis: "#8BA888",
  Padel: "#C9A876",
  Badminton: "#D9C089",
  Squash: "#8C8C94",
  Basketball: "#B97452",
  Volleyball: "#7C97B0",
};
