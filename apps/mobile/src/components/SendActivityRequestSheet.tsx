import { useEffect, useState } from "react";
import { View, Text, Modal, Pressable, StyleSheet, Alert, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "./Button";
import { WeeklyAvailabilityWidget, type DaySlot } from "./WeeklyAvailabilityWidget";
import { api } from "../api/client";
import { colors, radii, spacing, typography } from "../theme";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSent: () => void;
  targetUserId: string;
  targetUserName: string;
  activityId: string;
  activityName: string;
  slots: DaySlot[];
}

// Bug fix batch 3, section 9.3: Mon..Sun, matching every other day picker.
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

// F7 (Round 2): "Send Activity Request" is a bottom sheet, not a full screen.
// Requester must pick one specific day+time from the target's availability
// for this sport before submitting. Bug fix batch 3, section 9.2: the
// earliest available day (Mon-first) is pre-selected on open, so its time
// range is visible immediately without an extra tap.
export function SendActivityRequestSheet({ visible, onClose, onSent, targetUserId, targetUserName, activityId, activityName, slots }: Props) {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<DaySlot | null>(null);
  const [sending, setSending] = useState(false);
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  useEffect(() => {
    if (!visible) return;
    const earliestDay = DAY_ORDER.find((d) => slots.some((s) => s.dayOfWeek === d));
    setSelected(slots.find((s) => s.dayOfWeek === earliestDay) ?? null);
  }, [visible, slots]);

  async function submit() {
    if (!selected) return;
    setSending(true);
    try {
      await api.post("/activity-requests", {
        targetUserId,
        activityId,
        selectedDayOfWeek: selected.dayOfWeek,
        selectedStartTime: selected.startTime,
        selectedEndTime: selected.endTime,
      });
      onSent();
      onClose();
      setSelected(null);
    } catch (err) {
      Alert.alert("Couldn't send request", (err as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Pressable accessibilityLabel="Close" style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeIcon}>×</Text>
        </Pressable>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.title}>Request to play {activityName}</Text>
          <Text style={styles.subtitle}>{targetUserName}'s availability</Text>

          <WeeklyAvailabilityWidget slots={slots} variant="select" selectedDay={selected?.dayOfWeek ?? null} onSelectDay={setSelected} />

          {selected && (
            <View style={styles.selectedPill}>
              <Text style={styles.selectedPillText}>
                {dayNames[selected.dayOfWeek]} · {selected.startTime} – {selected.endTime}
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Bug fix batch 3, section 9.1: Send Request button fixed outside the ScrollView. */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          <Button label={sending ? "Sending…" : "Send Request"} onPress={submit} disabled={!selected || sending} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)" },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg, paddingTop: spacing.lg, maxHeight: "80%" },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: 80 },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.white },
  handle: { width: 32, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: spacing.sm },
  closeButton: { position: "absolute", top: spacing.sm, right: spacing.sm, width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  closeIcon: { fontSize: 24, color: colors.muted },
  title: { fontFamily: typography.fontFamilyBold, fontSize: 17, color: colors.charcoal, marginTop: spacing.md },
  subtitle: { fontFamily: typography.fontFamilyRegular, fontSize: 14, color: colors.muted, marginTop: 4, marginBottom: spacing.lg },
  selectedPill: {
    alignSelf: "center",
    backgroundColor: "#FFF5F3",
    borderWidth: 1.5,
    borderColor: colors.coral,
    borderRadius: 20,
    height: 40,
    paddingHorizontal: spacing.md,
    justifyContent: "center",
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  selectedPillText: { fontFamily: typography.fontFamily, fontSize: 14, color: colors.coral },
});
