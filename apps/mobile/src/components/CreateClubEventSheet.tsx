import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, Modal, ScrollView, Platform, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { colors, spacing, typography, radii } from "../theme";

const RECURRENCE_OPTIONS = ["Weekly", "Biweekly", "Monthly"] as const;

export interface ClubEventValues {
  title: string;
  date: Date;
  time: Date;
  locationText: string;
  isRecurring: boolean;
  recurrenceRule: string | null;
  maxParticipants: number | null;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (values: ClubEventValues) => void;
  submitting?: boolean;
}

// Communities, Tab 1 — Events: "Create Club Event" bottom sheet (organiser/assistant only).
export function CreateClubEventSheet({ visible, onClose, onSubmit, submitting }: Props) {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState<Date | null>(null);
  const [time, setTime] = useState<Date | null>(null);
  const [locationText, setLocationText] = useState("");
  const [pickerOpen, setPickerOpen] = useState<"date" | "time" | null>(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrence, setRecurrence] = useState<(typeof RECURRENCE_OPTIONS)[number]>("Weekly");
  const [maxParticipants, setMaxParticipants] = useState<number | null>(null);

  useEffect(() => {
    if (!visible) return;
    setTitle("");
    setDate(null);
    setTime(null);
    setLocationText("");
    setIsRecurring(false);
    setRecurrence("Weekly");
    setMaxParticipants(null);
  }, [visible]);

  const canSubmit = title.trim().length > 0 && Boolean(date) && Boolean(time) && !submitting;

  function submit() {
    if (!date || !time) return;
    onSubmit({
      title: title.trim(),
      date,
      time,
      locationText: locationText.trim(),
      isRecurring,
      recurrenceRule: isRecurring ? recurrence : null,
      maxParticipants,
    });
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Create Event</Text>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Title *</Text>
            <TextInput style={styles.input} placeholder="e.g. Sunday Tennis Practice" value={title} onChangeText={setTitle} />

            <Text style={styles.label}>Date *</Text>
            <Pressable style={styles.fieldSelector} onPress={() => setPickerOpen("date")}>
              <Text style={date ? styles.fieldValue : styles.fieldPlaceholder}>{date ? date.toDateString() : "Select date"}</Text>
            </Pressable>

            <Text style={styles.label}>Time *</Text>
            <Pressable style={styles.fieldSelector} onPress={() => setPickerOpen("time")}>
              <Text style={time ? styles.fieldValue : styles.fieldPlaceholder}>
                {time ? time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Select time"}
              </Text>
            </Pressable>

            {pickerOpen === "date" && (
              <DateTimePicker
                value={date ?? new Date()}
                mode="date"
                minimumDate={new Date()}
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(_e, picked) => {
                  if (Platform.OS === "android") setPickerOpen(null);
                  if (picked) setDate(picked);
                }}
              />
            )}
            {pickerOpen === "time" && (
              <DateTimePicker
                value={time ?? new Date()}
                mode="time"
                minuteInterval={15}
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(_e, picked) => {
                  if (Platform.OS === "android") setPickerOpen(null);
                  if (picked) setTime(picked);
                }}
              />
            )}

            <Text style={styles.label}>Location</Text>
            <View style={styles.locationInputWrap}>
              <Text style={styles.locationPin}>📍</Text>
              <TextInput
                style={styles.locationInput}
                placeholder="Add a location (optional)"
                placeholderTextColor={colors.muted}
                value={locationText}
                onChangeText={setLocationText}
              />
            </View>

            <View style={styles.toggleRow}>
              <Text style={styles.label}>Recurring event</Text>
              <Pressable style={[styles.toggleTrack, isRecurring && styles.toggleTrackOn]} onPress={() => setIsRecurring((r) => !r)}>
                <View style={[styles.toggleThumb, isRecurring && styles.toggleThumbOn]} />
              </Pressable>
            </View>
            {isRecurring && (
              <View style={styles.pillRow}>
                {RECURRENCE_OPTIONS.map((r) => (
                  <Pressable key={r} style={[styles.pill, recurrence === r && styles.pillSelected]} onPress={() => setRecurrence(r)}>
                    <Text style={recurrence === r ? styles.pillLabelSelected : styles.pillLabel}>{r}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            <Text style={styles.label}>Max participants (optional)</Text>
            <View style={styles.stepperRow}>
              <Pressable
                style={styles.stepperButton}
                onPress={() => setMaxParticipants((v) => Math.max(2, (v ?? 2) - 1))}
                disabled={maxParticipants === null}
              >
                <Text style={styles.stepperIcon}>−</Text>
              </Pressable>
              <Text style={styles.stepperValue}>{maxParticipants ?? "Unlimited"}</Text>
              <Pressable style={styles.stepperButton} onPress={() => setMaxParticipants((v) => Math.min(100, (v ?? 1) + 1))}>
                <Text style={styles.stepperIcon}>+</Text>
              </Pressable>
            </View>
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
            <Pressable style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]} disabled={!canSubmit} onPress={submit}>
              <Text style={[styles.submitButtonLabel, !canSubmit && styles.submitButtonLabelDisabled]}>
                {submitting ? "Creating…" : "Create Event"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg, maxHeight: "88%" },
  handle: { width: 32, height: 4, borderRadius: 2, backgroundColor: "#CBD5E0", alignSelf: "center", marginTop: 12 },
  title: { fontFamily: typography.fontFamilyBold, fontSize: 17, color: colors.charcoal, textAlign: "center", marginTop: spacing.md },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 80 },
  label: { fontFamily: typography.fontFamilyRegular, fontSize: 14, color: colors.charcoal, marginTop: spacing.md, marginBottom: spacing.xs },
  input: { backgroundColor: colors.white, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, minHeight: 52, fontFamily: typography.fontFamilyRegular, fontSize: 16, color: colors.charcoal },
  fieldSelector: { height: 40, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: colors.border, justifyContent: "center" },
  fieldValue: { fontFamily: typography.fontFamilyRegular, fontSize: 14, color: colors.charcoal },
  fieldPlaceholder: { fontFamily: typography.fontFamilyRegular, fontSize: 14, color: colors.muted },
  locationInputWrap: { flexDirection: "row", alignItems: "center", height: 48, borderWidth: 1, borderColor: colors.border, borderRadius: radii.sm, paddingHorizontal: spacing.sm },
  locationPin: { fontSize: 14, marginRight: spacing.xs },
  locationInput: { flex: 1, fontFamily: typography.fontFamilyRegular, fontSize: 14, color: colors.charcoal },
  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.md },
  toggleTrack: { width: 44, height: 26, borderRadius: 13, backgroundColor: colors.border, padding: 2, justifyContent: "center" },
  toggleTrackOn: { backgroundColor: colors.coral },
  toggleThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.white },
  toggleThumbOn: { transform: [{ translateX: 18 }] },
  pillRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  pill: { height: 32, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, justifyContent: "center" },
  pillSelected: { backgroundColor: colors.coral, borderColor: colors.coral },
  pillLabel: { fontFamily: typography.fontFamily, fontSize: 13, color: colors.charcoal },
  pillLabelSelected: { fontFamily: typography.fontFamily, fontSize: 13, color: colors.white },
  stepperRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepperButton: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", backgroundColor: colors.white },
  stepperIcon: { fontSize: 20, color: colors.coral, fontFamily: typography.fontFamilyBold },
  stepperValue: { minWidth: 80, fontSize: 16, fontFamily: typography.fontFamilyBold, color: colors.charcoal, textAlign: "center" },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.white },
  submitButton: { height: 52, borderRadius: radii.lg, backgroundColor: colors.coral, alignItems: "center", justifyContent: "center" },
  submitButtonDisabled: { backgroundColor: colors.border },
  submitButtonLabel: { fontFamily: typography.fontFamilyBold, fontSize: 16, color: colors.white },
  submitButtonLabelDisabled: { color: "#94A3B8" },
});
