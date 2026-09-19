import { Platform } from "react-native";

// Design tokens straight from the tech spec's "Cross-Cutting Non-Functional Requirements".
export const colors = {
  coral: "#FF6B4A",
  sageLight: "#E8F5E9",
  sageDark: "#2E7D32",
  offWhite: "#FAFAFA",
  charcoal: "#1E293B",
  warmError: "#E0654A", // warm, on-brand error — not harsh red
  error: "#E53E3E",
  white: "#FFFFFF",
  border: "#E2E8F0",
  muted: "#64748B",
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
  fontFamily: "Nunito_600SemiBold",
  fontFamilyRegular: "Nunito_400Regular",
  fontFamilyBold: "Nunito_800ExtraBold",
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
