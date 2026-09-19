import { View, Text, StyleSheet } from "react-native";
import { colors, radii, typography } from "../theme";

export function Badge({ label, tone = "sage" }: { label: string; tone?: "sage" | "coral" | "neutral" }) {
  return (
    <View style={[styles.badge, toneStyles[tone]]}>
      <Text style={[styles.label, toneLabelStyles[tone]]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: radii.sm, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start" },
  label: { fontFamily: typography.fontFamily, fontSize: 12 },
});

const toneStyles = StyleSheet.create({
  sage: { backgroundColor: colors.sageLight },
  coral: { backgroundColor: "#FFE7E1" },
  neutral: { backgroundColor: colors.chipNeutralBg },
});

const toneLabelStyles = StyleSheet.create({
  sage: { color: colors.sageDark },
  coral: { color: colors.coral },
  neutral: { color: colors.chipNeutralText },
});
