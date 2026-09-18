import { useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { colors, radii, spacing, typography, minTouchTarget } from "../theme";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface Props {
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  hasEntries?: (date: Date) => boolean;
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// Scrollable-by-month calendar (prev/next), full weeks shown (leading/trailing
// days from adjacent months dimmed), so a user can browse any month — not just
// the current week — then tap a specific date. Pairs with DayHourRangePicker
// for picking hour ranges on the selected date.
export function MonthCalendar({ selectedDate, onSelectDate, hasEntries }: Props) {
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const base = selectedDate ?? new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const weeks = useMemo(() => buildMonthGrid(visibleMonth), [visibleMonth]);
  const today = new Date();

  return (
    <View>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Previous month"
          style={styles.navButton}
          onPress={() => setVisibleMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
        >
          <Text style={styles.navLabel}>‹</Text>
        </Pressable>
        <Text style={styles.monthLabel}>
          {MONTH_LABELS[visibleMonth.getMonth()]} {visibleMonth.getFullYear()}
        </Text>
        <Pressable
          accessibilityLabel="Next month"
          style={styles.navButton}
          onPress={() => setVisibleMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
        >
          <Text style={styles.navLabel}>›</Text>
        </Pressable>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((label) => (
          <Text key={label} style={styles.weekdayLabel}>
            {label}
          </Text>
        ))}
      </View>

      {weeks.map((week, weekIndex) => (
        <View key={weekIndex} style={styles.weekRow}>
          {week.map((date, dayIndex) => {
            const inMonth = date.getMonth() === visibleMonth.getMonth();
            const isSelected = Boolean(selectedDate && sameDay(date, selectedDate));
            const isToday = sameDay(date, today);
            const marked = hasEntries?.(date) ?? false;
            return (
              <Pressable
                key={dayIndex}
                accessibilityLabel={date.toDateString()}
                style={[styles.dayCell, isSelected && styles.dayCellSelected]}
                onPress={() => onSelectDate(date)}
              >
                <Text
                  style={[
                    styles.dayLabel,
                    !inMonth && styles.dayLabelDim,
                    isSelected && styles.dayLabelSelected,
                    isToday && !isSelected && styles.dayLabelToday,
                  ]}
                >
                  {date.getDate()}
                </Text>
                {marked && <View style={[styles.dot, isSelected && styles.dotSelected]} />}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function buildMonthGrid(monthStart: Date): Date[][] {
  const firstOfMonth = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1);
  const startOffset = firstOfMonth.getDay(); // 0 = Sunday
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(firstOfMonth.getDate() - startOffset);

  const weeks: Date[][] = [];
  const cursor = new Date(gridStart);
  for (let week = 0; week < 6; week++) {
    const days: Date[] = [];
    for (let day = 0; day < 7; day++) {
      days.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(days);
  }
  return weeks;
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm },
  navButton: { width: minTouchTarget, height: minTouchTarget, alignItems: "center", justifyContent: "center" },
  navLabel: { fontSize: 22, color: colors.coral, fontFamily: typography.fontFamilyBold },
  monthLabel: { fontFamily: typography.fontFamilyBold, fontSize: 16, color: colors.charcoal },
  weekdayRow: { flexDirection: "row" },
  weekdayLabel: { flex: 1, textAlign: "center", fontFamily: typography.fontFamilyRegular, fontSize: 11, color: colors.muted, marginBottom: spacing.xs },
  weekRow: { flexDirection: "row" },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.sm,
    margin: 1,
  },
  dayCellSelected: { backgroundColor: colors.coral },
  dayLabel: { fontFamily: typography.fontFamilyRegular, fontSize: 13, color: colors.charcoal },
  dayLabelDim: { color: colors.border },
  dayLabelSelected: { color: colors.white, fontFamily: typography.fontFamily },
  dayLabelToday: { color: colors.sageDark, fontFamily: typography.fontFamily },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.sageDark, marginTop: 2 },
  dotSelected: { backgroundColor: colors.white },
});
