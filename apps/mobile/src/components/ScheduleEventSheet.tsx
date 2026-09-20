import { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, StyleSheet, Pressable, Modal, ScrollView, Platform, Dimensions, KeyboardAvoidingView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing, typography, radii } from "../theme";
import { WeeklyAvailabilityWidget, type DaySlot } from "./WeeklyAvailabilityWidget";

const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

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

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const suffix = h >= 12 ? "PM" : "AM";
  const displayHour = h % 12 === 0 ? 12 : h % 12;
  return `${displayHour}:${String(m).padStart(2, "0")} ${suffix}`;
}

// UI Redesign Final, section 8: date is restricted to days matching the
// partner's availability (a month calendar grid, not a native wheel), and
// time is restricted to their start–end range for that day, in 15-minute
// increments — both fall back to "choose anything" when the partner has no
// availability recorded for this sport at all.
export function ScheduleEventSheet({ visible, onClose, onSubmit, submitting, partnerSlots, initial }: Props) {
  const insets = useSafeAreaInsets();
  const [date, setDate] = useState<Date | null>(null);
  const [time, setTime] = useState<Date | null>(null);
  const [locationText, setLocationText] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const hasRestriction = partnerSlots.length > 0;
  const allowedWeekdays = useMemo(() => new Set(partnerSlots.map((s) => s.dayOfWeek)), [partnerSlots]);

  useEffect(() => {
    if (!visible) return;
    if (initial) {
      const at = new Date(initial.scheduledAt);
      setDate(at);
      setTime(at);
      setLocationText(initial.locationText ?? "");
      const m = new Date(at);
      m.setDate(1);
      setCalendarMonth(m);
    } else {
      setDate(null);
      setTime(null);
      setLocationText("");
      const m = new Date();
      m.setDate(1);
      setCalendarMonth(m);
    }
  }, [visible, initial]);

  const canSubmit = Boolean(date && time) && !submitting;

  function submit() {
    if (!date || !time) return;
    onSubmit({ date, time, locationText: locationText.trim() });
  }

  function selectDate(d: Date) {
    setDate(d);
    setTime(null); // time options depend on the day picked
  }

  const timeOptionsForDate = useMemo(() => {
    if (!date) return [];
    if (!hasRestriction) return [];
    const slot = partnerSlots.find((s) => s.dayOfWeek === date.getDay());
    if (!slot) return [];
    const options: number[] = [];
    for (let m = timeToMinutes(slot.startTime); m <= timeToMinutes(slot.endTime) - 15; m += 15) options.push(m);
    return options;
  }, [date, partnerSlots, hasRestriction]);

  function selectTimeMinutes(minutes: number) {
    if (!date) return;
    const t = new Date(date);
    t.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    setTime(t);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isCurrentMonth = calendarMonth.getFullYear() === today.getFullYear() && calendarMonth.getMonth() === today.getMonth();

  const calendarCells = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const startWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    return cells;
  }, [calendarMonth]);

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
              <Text style={styles.suggestText}>No availability set — choose any time</Text>
            )}

            <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>CHOOSE A DATE</Text>
            <View style={styles.calendarHeader}>
              <Pressable
                accessibilityLabel="Previous month"
                disabled={isCurrentMonth}
                onPress={() => setCalendarMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
                style={styles.calendarNavButton}
              >
                <Text style={[styles.calendarNavIcon, isCurrentMonth && styles.calendarNavIconDisabled]}>‹</Text>
              </Pressable>
              <Text style={styles.calendarMonthLabel}>
                {MONTH_NAMES[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
              </Text>
              <Pressable
                accessibilityLabel="Next month"
                onPress={() => setCalendarMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
                style={styles.calendarNavButton}
              >
                <Text style={styles.calendarNavIcon}>›</Text>
              </Pressable>
            </View>
            <View style={styles.calendarWeekRow}>
              {WEEKDAY_LETTERS.map((l, i) => (
                <Text key={i} style={styles.calendarWeekLetter}>
                  {l}
                </Text>
              ))}
            </View>
            <View style={styles.calendarGrid}>
              {calendarCells.map((cell, i) => {
                if (!cell) return <View key={i} style={styles.calendarCell} />;
                const isPast = cell < today;
                const isAllowed = !hasRestriction || allowedWeekdays.has(cell.getDay());
                const disabled = isPast || !isAllowed;
                const selected = date && sameDay(date, cell);
                return (
                  <Pressable
                    key={i}
                    style={styles.calendarCell}
                    disabled={disabled}
                    onPress={() => selectDate(cell)}
                  >
                    <View style={[styles.calendarDayCircle, selected && styles.calendarDayCircleSelected]}>
                      <Text style={[styles.calendarDayText, disabled && styles.calendarDayTextDisabled, selected && styles.calendarDayTextSelected]}>
                        {cell.getDate()}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {date && (
              <>
                <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>CHOOSE A TIME</Text>
                {hasRestriction ? (
                  timeOptionsForDate.length > 0 ? (
                    <View style={styles.timeGrid}>
                      {timeOptionsForDate.map((minutes) => {
                        const selected = time && time.getHours() * 60 + time.getMinutes() === minutes;
                        return (
                          <Pressable
                            key={minutes}
                            style={[styles.timePill, selected && styles.timePillSelected]}
                            onPress={() => selectTimeMinutes(minutes)}
                          >
                            <Text style={[styles.timePillLabel, selected && styles.timePillLabelSelected]}>{minutesToLabel(minutes)}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : (
                    <Text style={styles.suggestText}>No time slots available on this day</Text>
                  )
                ) : (
                  <View style={styles.timeGrid}>
                    {Array.from({ length: (22 - 7) * 4 }, (_, i) => 7 * 60 + i * 15).map((minutes) => {
                      const selected = time && time.getHours() * 60 + time.getMinutes() === minutes;
                      return (
                        <Pressable
                          key={minutes}
                          style={[styles.timePill, selected && styles.timePillSelected]}
                          onPress={() => selectTimeMinutes(minutes)}
                        >
                          <Text style={[styles.timePillLabel, selected && styles.timePillLabelSelected]}>{minutesToLabel(minutes)}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </>
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

          <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
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

const CELL_SIZE = 40;

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg },
  handle: { width: 32, height: 4, borderRadius: 2, backgroundColor: "#CBD5E0", alignSelf: "center", marginTop: 12 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: spacing.md, paddingHorizontal: spacing.lg },
  headerTitle: { fontFamily: typography.fontFamilyBold, fontSize: 17, color: colors.charcoal },
  closeButton: { position: "absolute", right: spacing.sm, width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  closeIcon: { fontSize: 22, color: colors.muted },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 24 },
  sectionLabel: { fontFamily: typography.fontFamilyBold, fontSize: 12, color: colors.muted, letterSpacing: 0.5, marginBottom: spacing.sm },
  suggestText: { fontFamily: typography.fontFamilyRegular, fontSize: 14, color: colors.textMuted, fontStyle: "italic" },
  calendarHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  calendarNavButton: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  calendarNavIcon: { fontSize: 20, color: colors.coral, fontFamily: typography.fontFamilyBold },
  calendarNavIconDisabled: { color: colors.textMuted },
  calendarMonthLabel: { fontFamily: typography.fontFamilyBold, fontSize: 14, color: colors.charcoal },
  calendarWeekRow: { flexDirection: "row", marginTop: spacing.sm },
  calendarWeekLetter: { width: CELL_SIZE, textAlign: "center", fontFamily: typography.fontFamilyRegular, fontSize: 12, color: colors.textMuted },
  // Without an explicit width, flexWrap packs however many CELL_SIZE cells
  // fit the available screen width (e.g. 8-9 on a wide device) instead of
  // wrapping every 7 to match the fixed 7-column weekday header, drifting
  // dates out from under their correct column.
  calendarGrid: { flexDirection: "row", flexWrap: "wrap", width: CELL_SIZE * 7 },
  calendarCell: { width: CELL_SIZE, height: CELL_SIZE, alignItems: "center", justifyContent: "center" },
  calendarDayCircle: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  calendarDayCircleSelected: { backgroundColor: colors.coral },
  calendarDayText: { fontFamily: typography.fontFamilyRegular, fontSize: 14, color: colors.charcoal },
  calendarDayTextDisabled: { color: colors.textMuted, opacity: 0.3 },
  calendarDayTextSelected: { color: colors.textOnDark, fontFamily: typography.fontFamilyBold },
  timeGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  timePill: { height: 36, paddingHorizontal: 12, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, justifyContent: "center" },
  timePillSelected: { backgroundColor: colors.coral, borderColor: colors.coral },
  timePillLabel: { fontFamily: typography.fontFamilyRegular, fontSize: 13, color: colors.charcoal },
  timePillLabelSelected: { color: colors.textOnDark, fontFamily: typography.fontFamilyBold },
  confirmPill: {
    alignSelf: "center",
    backgroundColor: colors.primaryTint1,
    borderWidth: 1.5,
    borderColor: colors.coral,
    borderRadius: 20,
    height: 40,
    paddingHorizontal: 16,
    justifyContent: "center",
    marginTop: spacing.md,
  },
  confirmPillText: { fontFamily: typography.fontFamilyBold, fontSize: 14, color: colors.coral },
  locationInputWrap: { flexDirection: "row", alignItems: "center", height: 48, borderWidth: 1, borderColor: colors.border, borderRadius: radii.sm, paddingHorizontal: spacing.sm },
  locationPin: { fontSize: 14, marginRight: spacing.xs },
  locationInput: { flex: 1, fontFamily: typography.fontFamilyRegular, fontSize: 14, color: colors.charcoal },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  submitButton: { height: 52, borderRadius: radii.lg, backgroundColor: colors.coral, alignItems: "center", justifyContent: "center" },
  submitButtonDisabled: { backgroundColor: colors.border },
  submitButtonLabel: { fontFamily: typography.fontFamilyBold, fontSize: 16, color: colors.white },
  submitButtonLabelDisabled: { color: colors.textMuted },
});
