import { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { colors, spacing, typography, minTouchTarget } from "../theme";
import type { AvailabilitySlot } from "../api/types";
import { WeekStrip } from "./WeekStrip";
import { DayHourRangePicker } from "./DayHourRangePicker";

interface Props {
  value: AvailabilitySlot[];
  onChange: (slots: AvailabilitySlot[]) => void;
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function slotDateKey(slot: AvailabilitySlot): string | null {
  if (!slot.date) return null;
  return dateKey(new Date(slot.date));
}

// F6: shared availability component, reused by onboarding (F1), My Profile
// (F5), the feed filter (F3), the waitlist subscribe sheet (F9), and the
// in-chat scheduler (F12). The layout is always the same week-strip + hour
// grid (defaults to the current week) — the "Weekly recurring" vs "One-off
// dates" toggle only changes what gets saved when you drag a range: a
// specific calendar date, or that weekday repeating every week.
export function AvailabilityPicker({ value, onChange }: Props) {
  const [recurring, setRecurring] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());

  function slotMatchesSelectedDay(slot: AvailabilitySlot): boolean {
    if (recurring) return slot.recurring === true && slot.dayOfWeek === selectedDate.getDay();
    return slot.recurring === false && slotDateKey(slot) === dateKey(selectedDate);
  }

  const matchingSlots = value
    .map((slot, indexInAll) => ({ slot, indexInAll }))
    .filter(({ slot }) => slotMatchesSelectedDay(slot));

  function addRange(range: { startTime: string; endTime: string }) {
    if (recurring) {
      onChange([...value, { dayOfWeek: selectedDate.getDay(), startTime: range.startTime, endTime: range.endTime, recurring: true }]);
    } else {
      onChange([...value, { date: selectedDate.toISOString(), startTime: range.startTime, endTime: range.endTime, recurring: false }]);
    }
  }

  function removeRange(localIndex: number) {
    const target = matchingSlots[localIndex]?.slot;
    if (!target) return;
    onChange(value.filter((s) => s !== target));
  }

  return (
    <View>
      <Pressable accessibilityRole="switch" onPress={() => setRecurring((r) => !r)} style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>{recurring ? "Weekly recurring" : "One-off dates"}</Text>
        <View style={[styles.toggleTrack, recurring && styles.toggleTrackOn]}>
          <View style={[styles.toggleThumb, recurring && styles.toggleThumbOn]} />
        </View>
      </Pressable>
      <Text style={styles.hint}>
        {recurring ? "Repeats every week on the day you pick below." : "Applies only to the specific date you pick below."}
      </Text>

      <WeekStrip
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        hasEntries={(date) =>
          value.some((s) => (recurring ? s.recurring && s.dayOfWeek === date.getDay() : !s.recurring && slotDateKey(s) === dateKey(date)))
        }
      />

      <View style={{ marginTop: spacing.md }}>
        <Text style={styles.selectedDateLabel}>Drag across hours to mark yourself free on {selectedDate.toDateString()}</Text>
        <DayHourRangePicker
          ranges={matchingSlots.map(({ slot }) => ({ startTime: slot.startTime, endTime: slot.endTime }))}
          onAddRange={addRange}
          onRemoveRange={removeRange}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.xs, minHeight: minTouchTarget },
  toggleLabel: { fontFamily: typography.fontFamily, color: colors.charcoal },
  toggleTrack: { width: 44, height: 26, borderRadius: 13, backgroundColor: colors.border, padding: 2 },
  toggleTrackOn: { backgroundColor: colors.sageDark },
  toggleThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.white },
  toggleThumbOn: { transform: [{ translateX: 18 }] },
  hint: { fontFamily: typography.fontFamilyRegular, fontSize: 12, color: colors.muted, marginBottom: spacing.md },
  selectedDateLabel: { fontFamily: typography.fontFamilyRegular, fontSize: 12, color: colors.muted, marginBottom: spacing.sm },
});
