import { useState } from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { colors, spacing, radii, typography } from "../theme";
import type { SkillLevel } from "../api/types";

export const LEVELS: SkillLevel[] = ["beginner", "intermediate", "advanced", "pro"];
const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"]; // Mon..Sun, per spec
export const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon(1)..Sun(0), matching Date.getDay()
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export interface DayAvailability {
  startTime: string; // "HH:mm"
  endTime: string;
}

export interface SportSelection {
  activityId: string;
  level: SkillLevel;
  days: Record<number, DayAvailability>; // keyed by dayOfWeek (0-6)
}

interface Props {
  activityName: string;
  sport: SportSelection;
  onSetLevel: (level: SkillLevel) => void;
  onToggleDay: (dayOfWeek: number) => void;
  onSetDayTime: (dayOfWeek: number, field: "startTime" | "endTime", value: string) => void;
  onRemove?: () => void;
}

// Shared "sport detail" card: level pills + day-of-week circles + a native
// time picker per selected day. Used by F1 onboarding step 3 and the F5
// "Preferred Activities" editor so both stay in sync.
export function SportAvailabilityCard({ activityName, sport, onSetLevel, onToggleDay, onSetDayTime, onRemove }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{activityName}</Text>
        {onRemove && (
          <Pressable accessibilityLabel={`Remove ${activityName}`} onPress={onRemove} style={styles.removeButton}>
            <Text style={styles.removeIcon}>✕</Text>
          </Pressable>
        )}
      </View>

      <Text style={styles.label}>Your level</Text>
      <View style={styles.pillRow}>
        {LEVELS.map((level) => (
          <Pressable
            key={level}
            style={[styles.levelPill, sport.level === level && styles.levelPillSelected]}
            onPress={() => onSetLevel(level)}
          >
            <Text style={[styles.levelPillLabel, sport.level === level && styles.levelPillLabelSelected]}>{level}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.label, { marginTop: spacing.md }]}>Availability</Text>
      <Text style={styles.helperText}>Fill in your availability to appear in partner search for this sport.</Text>
      <View style={styles.dayCircleRow}>
        {DAY_ORDER.map((dayOfWeek, i) => {
          const active = Boolean(sport.days[dayOfWeek]);
          return (
            <Pressable key={dayOfWeek} style={[styles.dayCircle, active && styles.dayCircleActive]} onPress={() => onToggleDay(dayOfWeek)}>
              <Text style={[styles.dayCircleLabel, active && styles.dayCircleLabelActive]}>{DAY_LABELS[i]}</Text>
            </Pressable>
          );
        })}
      </View>

      {DAY_ORDER.filter((d) => sport.days[d]).map((dayOfWeek) => (
        <DayTimeRow
          key={dayOfWeek}
          dayLabel={DAY_NAMES[dayOfWeek]}
          time={sport.days[dayOfWeek]}
          onChange={(field, value) => onSetDayTime(dayOfWeek, field, value)}
        />
      ))}
    </View>
  );
}

function DayTimeRow({
  dayLabel,
  time,
  onChange,
}: {
  dayLabel: string;
  time: DayAvailability;
  onChange: (field: "startTime" | "endTime", value: string) => void;
}) {
  const [openField, setOpenField] = useState<"startTime" | "endTime" | null>(null);

  function toDate(hhmm: string): Date {
    const [h, m] = hhmm.split(":").map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  }

  return (
    <View style={styles.dayTimeRow}>
      <Text style={styles.dayTimeLabel}>{dayLabel}</Text>
      <Pressable style={styles.timeField} onPress={() => setOpenField("startTime")}>
        <Text style={styles.timeFieldText}>{time.startTime}</Text>
      </Pressable>
      <Text style={styles.arrow}>→</Text>
      <Pressable style={styles.timeField} onPress={() => setOpenField("endTime")}>
        <Text style={styles.timeFieldText}>{time.endTime}</Text>
      </Pressable>
      {openField && (
        <DateTimePicker
          value={toDate(time[openField])}
          mode="time"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(_event, date) => {
            if (Platform.OS === "android") setOpenField(null);
            if (date) {
              const hh = String(date.getHours()).padStart(2, "0");
              const mm = String(date.getMinutes()).padStart(2, "0");
              onChange(openField, `${hh}:${mm}`);
            }
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#FFF5F3", borderWidth: 1.5, borderColor: colors.coral, borderRadius: radii.sm, padding: spacing.md, marginTop: spacing.sm },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm },
  title: { fontFamily: typography.fontFamilyBold, fontSize: 15, color: colors.charcoal },
  removeButton: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  removeIcon: { fontSize: 16, color: colors.muted },
  label: { fontFamily: typography.fontFamilyRegular, fontSize: 13, color: colors.muted },
  helperText: { fontFamily: typography.fontFamilyRegular, fontSize: 12, color: colors.muted, fontStyle: "italic", marginTop: 2 },
  pillRow: { flexDirection: "row", gap: spacing.xs, marginTop: spacing.sm, flexWrap: "wrap" },
  levelPill: { height: 36, paddingHorizontal: 12, borderRadius: 18, borderWidth: 1, borderColor: colors.border, justifyContent: "center", backgroundColor: colors.white },
  levelPillSelected: { backgroundColor: colors.coral, borderColor: colors.coral },
  levelPillLabel: { fontFamily: typography.fontFamily, fontSize: 13, color: colors.charcoal },
  levelPillLabelSelected: { color: colors.white },
  dayCircleRow: { flexDirection: "row", gap: 6, marginTop: spacing.sm },
  dayCircle: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", backgroundColor: colors.white },
  dayCircleActive: { backgroundColor: colors.coral, borderColor: colors.coral },
  dayCircleLabel: { fontFamily: typography.fontFamily, fontSize: 13, color: colors.charcoal },
  dayCircleLabelActive: { color: colors.white },
  dayTimeRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: spacing.sm },
  dayTimeLabel: { fontFamily: typography.fontFamily, fontSize: 13, color: colors.charcoal, width: 36 },
  timeField: { height: 36, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, justifyContent: "center" },
  timeFieldText: { fontFamily: typography.fontFamilyRegular, fontSize: 13, color: colors.charcoal },
  arrow: { color: colors.muted },
});
