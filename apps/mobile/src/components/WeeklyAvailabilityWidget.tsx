import { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { colors, radii, spacing, typography } from "../theme";

// Bug fix batch 3, section 9.3: every day picker in the app renders Mon..Sun.
// `dayOfWeek` values themselves stay JS-Date convention (0=Sun..6=Sat) — only
// the DISPLAY order changes, via this array of dayOfWeek values in Mon..Sun order.
const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"]; // Mon..Sun
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export interface DaySlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface Props {
  slots: DaySlot[];
  /** "view": tap a day to expand/collapse its time range (F4). "select": tap a
   * day to choose it for a request, shown as a selectable pill (F7). */
  variant?: "view" | "select";
  selectedDay?: number | null;
  onSelectDay?: (slot: DaySlot) => void;
}

// Round 2: weekly calendar-style availability widget, shared by F4 (profile
// detail) and F7 (send-request bottom sheet) instead of a plain text list.
export function WeeklyAvailabilityWidget({ slots, variant = "view", selectedDay, onSelectDay }: Props) {
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const slotFor = (day: number) => slots.find((s) => s.dayOfWeek === day);

  function handlePress(day: number) {
    const slot = slotFor(day);
    if (!slot) return;
    if (variant === "select") {
      onSelectDay?.(slot);
      return;
    }
    setExpandedDay((prev) => (prev === day ? null : day));
  }

  const activeDay = variant === "select" ? (selectedDay ?? null) : expandedDay;
  const activeSlot = activeDay !== null ? slotFor(activeDay) : undefined;

  return (
    <View>
      <View style={styles.week}>
        {DISPLAY_ORDER.map((day, i) => {
          const letter = DAY_LETTERS[i];
          const hasSlot = Boolean(slotFor(day));
          const isActive = activeDay === day && hasSlot;
          return (
            <Pressable
              key={day}
              accessibilityLabel={DAY_NAMES[day]}
              style={[styles.dayCircle, hasSlot ? styles.dayCircleAvailable : styles.dayCircleUnavailable, isActive && styles.dayCircleActive]}
              onPress={() => handlePress(day)}
            >
              <Text style={[styles.dayLetter, hasSlot ? styles.dayLetterAvailable : styles.dayLetterUnavailable]}>{letter}</Text>
            </Pressable>
          );
        })}
      </View>

      {variant === "view" && activeSlot && (
        <View style={styles.expandPanel}>
          <Text style={styles.expandText}>
            {DAY_NAMES[activeSlot.dayOfWeek]} · {activeSlot.startTime} – {activeSlot.endTime}
          </Text>
        </View>
      )}

      {variant === "view" && !activeSlot && <Text style={styles.helperText}>Tap a day to see their available times</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  week: { flexDirection: "row", justifyContent: "space-between" },
  dayCircle: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  dayCircleAvailable: { backgroundColor: colors.coral },
  dayCircleUnavailable: { backgroundColor: "#F1F5F9" },
  dayCircleActive: { borderWidth: 2, borderColor: colors.sageDark },
  dayLetter: { fontFamily: typography.fontFamily, fontSize: 14 },
  dayLetterAvailable: { color: colors.white },
  dayLetterUnavailable: { color: "#94A3B8" },
  expandPanel: { backgroundColor: "#FFF5F3", borderRadius: radii.sm, padding: spacing.sm, marginTop: spacing.sm },
  expandText: { fontFamily: typography.fontFamilyRegular, fontSize: 14, color: colors.charcoal },
  helperText: { fontFamily: typography.fontFamilyRegular, fontSize: 12, color: colors.muted, fontStyle: "italic", marginTop: spacing.sm },
});
