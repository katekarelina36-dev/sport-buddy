import { View, StyleSheet, type ViewProps } from "react-native";
import { colors, radii, shadow, spacing } from "../theme";

export function Card({ style, ...rest }: ViewProps) {
  return <View style={[styles.card, style]} {...rest} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.md,
    ...shadow,
  },
});
