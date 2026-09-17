import { Pressable, Text, StyleSheet, type PressableProps } from "react-native";
import { colors, radii, minTouchTarget, typography } from "../theme";

type Variant = "primary" | "secondary" | "outline";

interface Props extends PressableProps {
  label: string;
  variant?: Variant;
  disabled?: boolean;
}

// Buttons: min 44x44, primary CTA in Coral, rounded 16-24px corners (per spec).
export function Button({ label, variant = "primary", disabled, style, ...rest }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        typeof style === "function" ? undefined : style,
      ]}
      {...rest}
    >
      <Text style={[styles.label, variant === "outline" && styles.outlineLabel]}>{label}</Text>
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
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
  label: { color: colors.white, fontFamily: typography.fontFamily, fontSize: 16 },
  outlineLabel: { color: colors.charcoal },
});

const variantStyles = StyleSheet.create({
  primary: { backgroundColor: colors.coral },
  secondary: { backgroundColor: colors.sageDark },
  outline: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: colors.border },
});
