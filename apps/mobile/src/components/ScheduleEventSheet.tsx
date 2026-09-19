import { useEffect, useState } from "react";
import { View, Text, TextInput, StyleSheet, Pressable, Modal, ScrollView, Platform, Dimensions, KeyboardAvoidingView } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { colors, spacing, typography, radii } from "../theme";
import { WeeklyAvailabilityWidget, type DaySlot } from "./WeeklyAvailabilityWidget";

const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export interface ScheduleEventValues {
  date: Date;
  time: Date;
  locationText: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (values: ScheduleEventValues) => void;
  submitting?: boolean;
  /** The other participant's availability for this chat's sport, if any. */
  partnerSlots: DaySlot[];
  /** Pre-filled values when re-opening from the sticky banner ("edit mode"). */
  initial?: { scheduledAt: string; locationText: string | null } | null;
}

// Bug fix batch, section 4: Schedule Event bottom sheet — opens to 75-90% of
// screen height (content scrolls if it doesn't fit), partner-availability
// widget, native date+time pickers with a confirmation pill, an optional
// location field, and a "Schedule Event" button that stays pinned to the
// sheet's bottom instead of scrolling with the content.
export function ScheduleEventSheet({ visible, onClose, onSubmit, submitting, partnerSlots, initial }: Props) {
  const [date, setDate] = useState<Date | null>(null);
  const [time, setTime] = useState<Date | null>(null);
  const [locationText, setLocationText] = useState("");
  const [pickerOpen, setPickerOpen] = useState<"date" | "time" | null>(null);

  useEffect(() => {
    if (!visible) return;
    if (initial) {
      const at = new Date(initial.scheduledAt);
      setDate(at);
      setTime(at);
      setLocationText(initial.locationText ?? "");
    } else {
      setDate(null);
      setTime(null);
      setLocationText("");
    }
    setPickerOpen(null);
  }, [visible, initial]);

  const canSubmit = Boolean(date && time) && !submitting;

  function submit() {
    if (!date || !time) return;
    onSubmit({ date, time, locationText: locationText.trim() });
  }

  const screenHeight = Dimensions.get("window").height;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={[styles.sheet, { minHeight: screenHeight * 0.75, maxHeight: screenHeight * 0.9 }]}
        >
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Schedule Event</Text>
            <Pressable accessibilityLabel="Close" style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeIcon}>×</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            {partnerSlots.length > 0 ? (
              <>
                <Text style={styles.sectionLabel}>THEIR AVAILABILITY</Text>
                <WeeklyAvailabilityWidget slots={partnerSlots} variant="view" />
              </>
            ) : (
              <Text style={styles.suggestText}>Suggest a time that works for you</Text>
            )}

            <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>CHOOSE A DATE AND TIME</Text>

            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Date</Text>
              <Pressable style={styles.fieldSelector} onPress={() => setPickerOpen("date")}>
                <Text style={date ? styles.fieldValue : styles.fieldPlaceholder}>{date ? date.toDateString() : "Select date"}</Text>
              </Pressable>
            </View>

            <View style={[styles.fieldRow, { marginTop: spacing.sm }]}>
              <Text style={styles.fieldLabel}>Time</Text>
              <Pressable style={styles.fieldSelector} onPress={() => setPickerOpen("time")}>
                <Text style={time ? styles.fieldValue : styles.fieldPlaceholder}>
                  {time ? time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Select time"}
                </Text>
              </Pressable>
            </View>

            {pickerOpen === "date" && (
              <DateTimePicker
                value={date ?? new Date()}
                mode="date"
                minimumDate={new Date()}
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(_event, picked) => {
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
                onChange={(_event, picked) => {
                  if (Platform.OS === "android") setPickerOpen(null);
                  if (picked) setTime(picked);
                }}
              />
            )}

            {date && time && (
              <View style={styles.confirmPill}>
                <Text style={styles.confirmPillText}>
                  {WEEKDAY_NAMES[date.getDay()].slice(0, 3)}, {date.getDate()}{" "}
                  {date.toLocaleDateString([], { month: "short" })} ·{" "}
                  {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </Text>
              </View>
            )}

            <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>LOCATION</Text>
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
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
              disabled={!canSubmit}
              onPress={submit}
            >
              <Text style={[styles.submitButtonLabel, !canSubmit && styles.submitButtonLabelDisabled]}>
                {submitting ? "Scheduling…" : "Schedule Event"}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg },
  handle: { width: 32, height: 4, borderRadius: 2, backgroundColor: "#CBD5E0", alignSelf: "center", marginTop: 12 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: spacing.md, paddingHorizontal: spacing.lg },
  headerTitle: { fontFamily: typography.fontFamilyBold, fontSize: 17, color: colors.charcoal },
  closeButton: { position: "absolute", right: spacing.sm, width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  closeIcon: { fontSize: 22, color: colors.muted },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  sectionLabel: { fontFamily: typography.fontFamilyBold, fontSize: 12, color: colors.muted, letterSpacing: 0.5, marginBottom: spacing.sm },
  suggestText: { fontFamily: typography.fontFamilyRegular, fontSize: 14, color: colors.muted, fontStyle: "italic" },
  fieldRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  fieldLabel: { fontFamily: typography.fontFamilyRegular, fontSize: 14, color: colors.charcoal },
  fieldSelector: { height: 40, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: colors.border, justifyContent: "center" },
  fieldValue: { fontFamily: typography.fontFamilyRegular, fontSize: 14, color: colors.charcoal },
  fieldPlaceholder: { fontFamily: typography.fontFamilyRegular, fontSize: 14, color: colors.muted },
  confirmPill: {
    alignSelf: "center",
    backgroundColor: "#FFF5F3",
    borderWidth: 1.5,
    borderColor: colors.coral,
    borderRadius: 20,
    height: 40,
    paddingHorizontal: 16,
    justifyContent: "center",
    marginTop: spacing.sm,
  },
  confirmPillText: { fontFamily: typography.fontFamilyBold, fontSize: 14, color: colors.coral },
  locationInputWrap: { flexDirection: "row", alignItems: "center", height: 48, borderWidth: 1, borderColor: colors.border, borderRadius: radii.sm, paddingHorizontal: spacing.sm },
  locationPin: { fontSize: 14, marginRight: spacing.xs },
  locationInput: { flex: 1, fontFamily: typography.fontFamilyRegular, fontSize: 14, color: colors.charcoal },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: Platform.OS === "ios" ? spacing.xl : spacing.md },
  submitButton: { height: 52, borderRadius: radii.lg, backgroundColor: colors.coral, alignItems: "center", justifyContent: "center" },
  submitButtonDisabled: { backgroundColor: colors.border },
  submitButtonLabel: { fontFamily: typography.fontFamilyBold, fontSize: 16, color: colors.white },
  submitButtonLabelDisabled: { color: "#94A3B8" },
});
