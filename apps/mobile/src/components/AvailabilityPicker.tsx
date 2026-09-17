import { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { colors, radii, spacing, typography, minTouchTarget } from "../theme";
import type { AvailabilitySlot } from "../api/types";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"];

interface Props {
  value: AvailabilitySlot[];
  onChange: (slots: AvailabilitySlot[]) => void;
}

// F6: shared week-view availability component, reused by onboarding (F1), My
// Profile (F5), the feed filter (F3), the waitlist subscribe sheet (F9), and
// the in-chat scheduler (F12). Recurring-weekly toggle covers the "recurring
// vs one-off" requirement; times are edited/rendered in local time and stored
// as UTC "HH:mm" strings by the caller.
export function AvailabilityPicker({ value, onChange }: Props) {
  const [recurring, setRecurring] = useState(true);

  function toggleSlot(dayOfWeek: number, startTime: string) {
    const endTime = HOURS[HOURS.indexOf(startTime) + 1] ?? "22:00";
    const exists = value.some((s) => s.dayOfWeek === dayOfWeek && s.startTime === startTime);
    if (exists) {
      onChange(value.filter((s) => !(s.dayOfWeek === dayOfWeek && s.startTime === startTime)));
    } else {
      onChange([...value, { dayOfWeek, startTime, endTime, recurring }]);
    }
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

      <View style={styles.grid}>
        {DAYS.map((day, dayIndex) => (
          <View key={day} style={styles.dayColumn}>
            <Text style={styles.dayLabel}>{day}</Text>
            {HOURS.map((hour) => {
              const selected = value.some((s) => s.dayOfWeek === dayIndex && s.startTime === hour);
              return (
                <Pressable
                  key={hour}
                  accessibilityLabel={`${day} ${hour}`}
                  onPress={() => toggleSlot(dayIndex, hour)}
                  style={[styles.cell, selected && styles.cellSelected]}
                >
                  <Text style={[styles.cellLabel, selected && styles.cellLabelSelected]}>{hour}</Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
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
});
