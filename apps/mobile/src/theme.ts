// Design tokens straight from the tech spec's "Cross-Cutting Non-Functional Requirements".
export const colors = {
  coral: "#1907A7",
  sageLight: "rgba(255, 136, 0, 0.23)",
  sageDark: "#FF8800",
  offWhite: "#EDECEF",
  charcoal: "#04001D",
  warmError: "#E0654A", // warm, on-brand error — not harsh red
  error: "#E53E3E",
  white: "#FFFFFF",
  border: "#E2E8F0",
  muted: "#64748B",
  glassText: "#5F380B",
  glassGlow: "#FF8800",
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
  fontFamily: "Fraunces_600SemiBold",
  fontFamilyRegular: "Fraunces_400Regular",
  fontFamilyBold: "Fraunces_700Bold",
};

// Every touch target in the spec must be >= 44x44.
export const minTouchTarget = 44;

// Bug fix batch 3, section 6: no more hardcoded top-clearance constant — every
// screen with a custom header/no native header uses useSafeAreaInsets()
// directly, so it reflects the real device (status bar, punch-hole camera,
// gesture nav bar) instead of one fixed number for all Android/iOS devices.

export const shadow = {
  shadowColor: "#000",
  shadowOpacity: 0.08,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
};
