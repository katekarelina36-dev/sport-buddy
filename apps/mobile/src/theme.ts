// Design tokens — UI Redesign Final palette. Variable names are kept as-is
// (coral/sageDark/etc.) so every existing screen picks up the new colors
// automatically; new tokens are added alongside for the redesign's specific
// tint/text/surface needs.
export const colors = {
  coral: "#003161", // --color-primary
  sageLight: "rgba(0, 106, 103, 0.10)", // secondary tint, used as pill/stat backgrounds
  sageDark: "#006A67", // --color-secondary
  offWhite: "#FAFAFA", // --color-bg-screen
  charcoal: "#1E293B", // --color-text-primary
  warmError: "#E0654A",
  error: "#E53E3E", // --color-error
  white: "#FFFFFF", // --color-surface
  border: "#E2E8F0", // --color-border
  borderSubtle: "#F1F5F9", // --color-border-subtle
  muted: "#64748B", // --color-text-secondary
  textMuted: "#94A3B8", // --color-text-muted
  textOnDark: "#F8FAFC", // --color-text-on-dark
  toastBg: "#1E293B", // --color-toast-bg
  primaryTint1: "rgba(0, 49, 97, 0.06)",
  primaryTint2: "rgba(0, 49, 97, 0.12)",
  secondaryTint1: "rgba(0, 106, 103, 0.06)",
  secondaryTint2: "rgba(0, 106, 103, 0.12)",
  glassText: "#003161",
  glassGlow: "#006A67",
  glassPrimaryText: "#1E293B",
  glassPrimaryTint: "#003161",
  chipNeutralBg: "#E2E8F0",
  chipNeutralText: "#1E293B",
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
