import { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { colors, radii, spacing, typography, minTouchTarget } from "../theme";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface Props {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  hasEntries?: (date: Date) => boolean;
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function startOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - d.getDay());
  return d;
}

// Fixed week-view: Sun..Sat with real calendar dates, defaults to the current
// week. Small arrows let you move to a different week, but the layout never
// changes shape (unlike a month grid) — this is the one consistent format
// used everywhere the availability picker appears.
export function WeekStrip({ selectedDate, onSelectDate, hasEntries }: Props) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(selectedDate));
  const today = new Date();

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  return (
    <View>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Previous week"
          style={styles.navButton}
          onPress={() => setWeekStart((w) => new Date(w.getFullYear(), w.getMonth(), w.getDate() - 7))}
        >
          <Text style={styles.navLabel}>‹</Text>
        </Pressable>
        <Text style={styles.rangeLabel}>
          {days[0].toLocaleDateString(undefined, { month: "short", day: "numeric" })} –{" "}
          {days[6].toLocaleDateString(undefined, { month: "short", day: "numeric" })}
        </Text>
        <Pressable
          accessibilityLabel="Next week"
          style={styles.navButton}
          onPress={() => setWeekStart((w) => new Date(w.getFullYear(), w.getMonth(), w.getDate() + 7))}
        >
          <Text style={styles.navLabel}>›</Text>
        </Pressable>
      </View>

      <View style={styles.row}>
        {days.map((date) => {
          const isSelected = sameDay(date, selectedDate);
          const isToday = sameDay(date, today);
          const marked = hasEntries?.(date) ?? false;
          return (
            <Pressable
              key={date.toISOString()}
              accessibilityLabel={date.toDateString()}
              style={[styles.dayCell, isSelected && styles.dayCellSelected]}
              onPress={() => onSelectDate(date)}
            >
              <Text style={[styles.weekdayLabel, isSelected && styles.labelSelected]}>{WEEKDAY_LABELS[date.getDay()]}</Text>
              <Text style={[styles.dateLabel, isSelected && styles.labelSelected, isToday && !isSelected && styles.dateLabelToday]}>
                {date.getDate()}
              </Text>
              {marked && <View style={[styles.dot, isSelected && styles.dotSelected]} />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm },
  navButton: { width: minTouchTarget, height: minTouchTarget, alignItems: "center", justifyContent: "center" },
  navLabel: { fontSize: 22, color: colors.coral, fontFamily: typography.fontFamilyBold },
  rangeLabel: { fontFamily: typography.fontFamilyRegular, fontSize: 13, color: colors.muted },
  row: { flexDirection: "row", gap: spacing.xs },
  dayCell: { flex: 1, alignItems: "center", paddingVertical: spacing.sm, borderRadius: radii.sm, backgroundColor: colors.white },
  dayCellSelected: { backgroundColor: colors.coral },
  weekdayLabel: { fontFamily: typography.fontFamilyRegular, fontSize: 11, color: colors.muted },
  dateLabel: { fontFamily: typography.fontFamily, fontSize: 15, color: colors.charcoal, marginTop: 2 },
  dateLabelToday: { color: colors.sageDark },
  labelSelected: { color: colors.white },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.sageDark, marginTop: 2 },
  dotSelected: { backgroundColor: colors.white },
});
