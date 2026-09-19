import { Pressable, Text, StyleSheet, type PressableProps } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { colors, radii, minTouchTarget, typography } from "../theme";

type Variant = "primary" | "secondary" | "outline" | "glass";

interface Props extends PressableProps {
  label: string;
  variant?: Variant;
  disabled?: boolean;
}

// Buttons: min 44x44, primary CTA in Coral, rounded 16-24px corners (per spec).
// "glass" is a frosted pill CTA (per Figma "Secondary CTA" mock): a blurred,
// warm-orange-tinted background behind dark, muted text — used where a
// secondary action needs to sit on top of card content instead of stacking
// as a flat block.
export function Button({ label, variant = "primary", disabled, style, ...rest }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        variant === "glass" && styles.glassBase,
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
      <Text style={[styles.label, variant === "outline" && styles.outlineLabel, variant === "glass" && styles.glassLabel]}>
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
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
  label: { color: colors.white, fontFamily: typography.fontFamily, fontSize: 16 },
  outlineLabel: { color: colors.charcoal },
  glassLabel: { color: colors.glassText },
});

const variantStyles = StyleSheet.create({
  primary: { backgroundColor: colors.coral },
  secondary: { backgroundColor: colors.sageDark },
  outline: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: colors.border },
  glass: { backgroundColor: `${colors.offWhite}CC` },
});
