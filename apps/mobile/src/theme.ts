import { Platform } from "react-native";

// Design tokens straight from the tech spec's "Cross-Cutting Non-Functional Requirements".
export const colors = {
  coral: "#EE5B00",
  sageLight: "#E8F5E9",
  sageDark: "#2E7D32",
  offWhite: "#FFF9EE",
  charcoal: "#01232E",
  warmError: "#E0654A", // warm, on-brand error — not harsh red
  error: "#E53E3E",
  white: "#FFFFFF",
  border: "#E2E8F0",
  muted: "#64748B",
  glassText: "#5F380B",
  glassGlow: "#FF8800",
  glassPrimaryText: "#04001D",
  glassPrimaryTint: "#1907A7",
  chipNeutralBg: "#E0DFE5",
  chipNeutralText: "#04001D",
};

export const radii = {
  sm: 16,
  lg: 24,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const typography = {
  fontFamily: "JosefinSans_600SemiBold",
  fontFamilyRegular: "JosefinSans_400Regular",
  fontFamilyBold: "JosefinSans_700Bold",
};

// Every touch target in the spec must be >= 44x44.
export const minTouchTarget = 44;

// Fixed top clearance for screens without a native header (which already
// insets for the status bar on its own) — per spec, not device safe-area
// insets, so it's the same on every iOS/Android device regardless of notch.
export const topInset = Platform.OS === "ios" ? 44 : 32;

export const shadow = {
  shadowColor: "#000",
  shadowOpacity: 0.08,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
};
