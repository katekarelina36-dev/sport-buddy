import { useState } from "react";
import { View, Text, Modal, Pressable, StyleSheet, Alert } from "react-native";
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

// F7 (Round 2): "Send Activity Request" is a bottom sheet, not a full screen.
// Requester must pick one specific day+time from the target's availability
// for this sport before submitting.
export function SendActivityRequestSheet({ visible, onClose, onSent, targetUserId, targetUserName, activityId, activityName, slots }: Props) {
  const [selected, setSelected] = useState<DaySlot | null>(null);
  const [sending, setSending] = useState(false);
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

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

        <Button label={sending ? "Sending…" : "Send Request"} onPress={submit} disabled={!selected || sending} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)" },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg, padding: spacing.lg, paddingBottom: spacing.xl },
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
