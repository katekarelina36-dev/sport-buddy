import { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { colors, radii, spacing, typography, minTouchTarget } from "../theme";
import type { AvailabilitySlot } from "../api/types";
import { MonthCalendar } from "./MonthCalendar";
import { DayHourRangePicker } from "./DayHourRangePicker";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKLY_HOURS = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"];

interface Props {
  value: AvailabilitySlot[];
  onChange: (slots: AvailabilitySlot[]) => void;
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function slotDateKey(slot: AvailabilitySlot): string | null {
  if (!slot.date) return null;
  const d = new Date(slot.date);
  return dateKey(d);
}

// F6: shared availability component, reused by onboarding (F1), My Profile
// (F5), the feed filter (F3), the waitlist subscribe sheet (F9), and the
// in-chat scheduler (F12). Two modes: "Weekly recurring" (a simple day-of-week
// x fixed-hour grid) and "One-off dates" (a real month calendar you can
// browse, plus a drag-to-select hour-range picker per selected day — like
// Outlook's day view).
export function AvailabilityPicker({ value, onChange }: Props) {
  const [recurring, setRecurring] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  function toggleWeeklySlot(dayOfWeek: number, startTime: string) {
    const endTime = WEEKLY_HOURS[WEEKLY_HOURS.indexOf(startTime) + 1] ?? "22:00";
    const exists = value.some((s) => s.recurring && s.dayOfWeek === dayOfWeek && s.startTime === startTime);
    if (exists) {
      onChange(value.filter((s) => !(s.recurring && s.dayOfWeek === dayOfWeek && s.startTime === startTime)));
    } else {
      onChange([...value, { dayOfWeek, startTime, endTime, recurring: true }]);
    }
  }

  const oneOffSlots = value.filter((s) => !s.recurring);
  const selectedDateSlots = selectedDate
    ? oneOffSlots
        .map((slot, indexInAll) => ({ slot, indexInAll }))
        .filter(({ slot }) => slotDateKey(slot) === dateKey(selectedDate))
    : [];

  function addRangeForSelectedDate(range: { startTime: string; endTime: string }) {
    if (!selectedDate) return;
    onChange([...value, { date: selectedDate.toISOString(), startTime: range.startTime, endTime: range.endTime, recurring: false }]);
  }

  function removeOneOffRange(localIndex: number) {
    const globalSlot = selectedDateSlots[localIndex]?.slot;
    if (!globalSlot) return;
    onChange(value.filter((s) => s !== globalSlot));
  }

  return (
    <View>
      <Pressable
        accessibilityRole="switch"
        onPress={() => setRecurring((r) => !r)}
        style={styles.toggleRow}
      >
        <Text style={styles.toggleLabel}>{recurring ? "Weekly recurring" : "One-off dates"}</Text>
        <View style={[styles.toggleTrack, recurring && styles.toggleTrackOn]}>
          <View style={[styles.toggleThumb, recurring && styles.toggleThumbOn]} />
        </View>
      </Pressable>

      {recurring ? (
        <View style={styles.grid}>
          {DAYS.map((day, dayIndex) => (
            <View key={day} style={styles.dayColumn}>
              <Text style={styles.dayLabel}>{day}</Text>
              {WEEKLY_HOURS.map((hour) => {
                const selected = value.some((s) => s.recurring && s.dayOfWeek === dayIndex && s.startTime === hour);
                return (
                  <Pressable
                    key={hour}
                    accessibilityLabel={`${day} ${hour}`}
                    onPress={() => toggleWeeklySlot(dayIndex, hour)}
                    style={[styles.cell, selected && styles.cellSelected]}
                  >
                    <Text style={[styles.cellLabel, selected && styles.cellLabelSelected]}>{hour}</Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      ) : (
        <View>
          <MonthCalendar
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            hasEntries={(date) => oneOffSlots.some((s) => slotDateKey(s) === dateKey(date))}
          />
          {selectedDate ? (
            <View style={{ marginTop: spacing.md }}>
              <Text style={styles.selectedDateLabel}>
                {selectedDate.toDateString()} — drag across hours to mark yourself free
              </Text>
              <DayHourRangePicker
                ranges={selectedDateSlots.map(({ slot }) => ({ startTime: slot.startTime, endTime: slot.endTime }))}
                onAddRange={addRangeForSelectedDate}
                onRemoveRange={removeOneOffRange}
              />
            </View>
          ) : (
            <Text style={styles.hint}>Pick a date above to set your free hours for that day.</Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md, minHeight: minTouchTarget },
  toggleLabel: { fontFamily: typography.fontFamily, color: colors.charcoal },
  toggleTrack: { width: 44, height: 26, borderRadius: 13, backgroundColor: colors.border, padding: 2 },
  toggleTrackOn: { backgroundColor: colors.sageDark },
  toggleThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.white },
  toggleThumbOn: { transform: [{ translateX: 18 }] },
  grid: { flexDirection: "row", gap: spacing.xs },
  dayColumn: { alignItems: "center", gap: spacing.xs, flex: 1 },
  dayLabel: { fontFamily: typography.fontFamily, fontSize: 12, color: colors.muted, marginBottom: spacing.xs },
  cell: { width: "100%", paddingVertical: 6, borderRadius: radii.sm, backgroundColor: colors.offWhite, alignItems: "center" },
  cellSelected: { backgroundColor: colors.coral },
  cellLabel: { fontSize: 10, fontFamily: typography.fontFamilyRegular, color: colors.muted },
  cellLabelSelected: { color: colors.white },
  selectedDateLabel: { fontFamily: typography.fontFamilyRegular, fontSize: 12, color: colors.muted, marginBottom: spacing.sm },
  hint: { fontFamily: typography.fontFamilyRegular, fontSize: 12, color: colors.muted, marginTop: spacing.md, textAlign: "center" },
});
