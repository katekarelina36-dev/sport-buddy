import { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, typography, radii } from "../theme";

interface Props {
  message: string | null;
  onHide: () => void;
  durationMs?: number;
}

// Bug fix batch, section 4: "Event scheduled! ✓" auto-dismissing toast.
export function Toast({ message, onHide, durationMs = 2500 }: Props) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onHide, durationMs);
    return () => clearTimeout(timer);
  }, [message, durationMs, onHide]);

  if (!message) return null;

  return (
    <View style={styles.wrap} pointerEvents="none">
      <View style={styles.toast}>
        <Text style={styles.text}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 0, right: 0, bottom: spacing.xl, alignItems: "center" },
  toast: { backgroundColor: colors.charcoal, borderRadius: radii.lg, height: 48, paddingHorizontal: spacing.lg, justifyContent: "center" },
  text: { fontFamily: typography.fontFamilyRegular, fontSize: 14, color: colors.white },
});
