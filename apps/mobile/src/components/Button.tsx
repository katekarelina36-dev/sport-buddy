import { Pressable, Text, StyleSheet, type PressableProps } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { colors, radii, minTouchTarget, typography } from "../theme";

type Variant = "primary" | "secondary" | "outline" | "glass" | "glassPrimary";

interface Props extends PressableProps {
  label: string;
  variant?: Variant;
  disabled?: boolean;
}

const GLASS_VARIANTS = new Set<Variant>(["glass", "glassPrimary"]);

// Buttons: min 44x44, primary CTA in Coral, rounded 16-24px corners (per spec).
// "glass"/"glassPrimary" are frosted pill CTAs (per the Figma "Secondary CTA"
// and "Main CTA" mocks): a blurred, tinted background behind muted-dark text,
// used where an action needs to sit on top of content instead of stacking as
// a flat block. "glassPrimary" additionally layers a soft diagonal highlight
// to match the deeper, more prominent main-CTA mock.
export function Button({ label, variant = "primary", disabled, style, ...rest }: Props) {
  const isGlass = GLASS_VARIANTS.has(variant);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        isGlass && styles.glassBase,
        variant === "glassPrimary" && styles.glassPrimaryBase,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        typeof style === "function" ? undefined : style,
      ]}
      {...rest}
    >
      {variant === "glass" && (
        <>
          <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} />
          <LinearGradient
            colors={[`${colors.glassGlow}66`, `${colors.glassGlow}00`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </>
      )}
      {variant === "glassPrimary" && (
        <>
          <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} />
          <LinearGradient
            colors={[`${colors.glassPrimaryTint}66`, `${colors.glassPrimaryTint}14`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={["#FFFFFFA0", "#FFFFFF00"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </>
      )}
      <Text
        style={[
          styles.label,
          variant === "outline" && styles.outlineLabel,
          variant === "glass" && styles.glassLabel,
          variant === "glassPrimary" && styles.glassPrimaryLabel,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: minTouchTarget,
    minWidth: minTouchTarget,
    borderRadius: radii.lg,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  glassBase: {
    borderRadius: 999,
    overflow: "hidden",
    minHeight: 56,
  },
  glassPrimaryBase: {
    minHeight: 64,
  },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
  label: { color: colors.white, fontFamily: typography.fontFamily, fontSize: 16 },
  outlineLabel: { color: colors.charcoal },
  glassLabel: { color: colors.glassText },
  glassPrimaryLabel: { color: colors.glassPrimaryText, fontFamily: typography.fontFamilyBold, fontSize: 17 },
});

const variantStyles = StyleSheet.create({
  primary: { backgroundColor: colors.coral },
  secondary: { backgroundColor: colors.sageDark },
  outline: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: colors.border },
  glass: { backgroundColor: `${colors.offWhite}CC` },
  glassPrimary: { backgroundColor: `${colors.glassPrimaryTint}1A` },
});
