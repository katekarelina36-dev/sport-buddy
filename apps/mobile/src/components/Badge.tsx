import { View, Text, StyleSheet } from "react-native";
import { colors, radii, typography } from "../theme";

export function Badge({ label, tone = "sage" }: { label: string; tone?: "sage" | "coral" }) {
  return (
    <View style={[styles.badge, tone === "coral" ? styles.coral : styles.sage]}>
      <Text style={[styles.label, tone === "coral" ? styles.coralLabel : styles.sageLabel]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: radii.sm, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start" },
  sage: { backgroundColor: colors.sageLight },
  coral: { backgroundColor: "#FFE7E1" },
  label: { fontFamily: typography.fontFamily, fontSize: 12 },
  sageLabel: { color: colors.sageDark },
  coralLabel: { color: colors.coral },
});
