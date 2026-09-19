import { View, Text, Modal, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ActivityIcon } from "./icons/ActivityIcon";
import { colors, radii, spacing, typography } from "../theme";
import type { ChatSport } from "../api/types";

interface Props {
  visible: boolean;
  onClose: () => void;
  sports: ChatSport[];
  scheduledActivityIds: Set<string>;
  onSelect: (activityId: string) => void;
}

// Bug fix batch 3, section 3: shown before Schedule Event whenever a chat has
// matched on 2+ sports, so the user picks which one this session is for.
// A sport already carrying a scheduled Event is greyed out and non-tappable.
export function SportSelectorSheet({ visible, onClose, sports, scheduledActivityIds, onSelect }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}>
        <View style={styles.handle} />
        <Text style={styles.title}>Which sport?</Text>
        <Text style={styles.subtitle}>Choose the sport for this session</Text>

        <View style={{ marginTop: spacing.lg }}>
          {sports.map(({ activityId, activity }) => {
            const disabled = scheduledActivityIds.has(activityId);
            return (
              <Pressable
                key={activityId}
                disabled={disabled}
                style={[styles.row, disabled && styles.rowDisabled]}
                onPress={() => onSelect(activityId)}
              >
                <ActivityIcon name={activity.name} size={24} />
                <Text style={styles.rowLabel}>{activity.name}</Text>
                {disabled ? (
                  <View style={styles.scheduledPill}>
                    <Text style={styles.scheduledPillText}>Scheduled</Text>
                  </View>
                ) : (
                  <Text style={styles.chevron}>›</Text>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)" },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg, paddingTop: 12 },
  handle: { width: 32, height: 4, borderRadius: 2, backgroundColor: "#CBD5E0", alignSelf: "center" },
  title: { fontFamily: typography.fontFamilyBold, fontSize: 17, color: colors.charcoal, marginTop: 20, paddingHorizontal: 20 },
  subtitle: { fontFamily: typography.fontFamilyRegular, fontSize: 14, color: colors.muted, marginTop: 4, paddingHorizontal: 20 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    height: 56,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowDisabled: { opacity: 0.5 },
  rowLabel: { flex: 1, fontFamily: typography.fontFamilyRegular, fontSize: 16, color: colors.charcoal },
  chevron: { fontFamily: typography.fontFamilyBold, fontSize: 18, color: colors.muted },
  scheduledPill: { backgroundColor: "#FFF5F3", height: 22, paddingHorizontal: 8, borderRadius: 11, justifyContent: "center" },
  scheduledPillText: { fontFamily: typography.fontFamily, fontSize: 12, color: colors.coral },
});
