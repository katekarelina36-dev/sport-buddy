import { useState } from "react";
import { View, Text, Modal, Pressable, StyleSheet } from "react-native";
import { Button } from "./Button";
import { colors, radii, spacing, typography } from "../theme";
import type { SkillLevel } from "../api/types";

const LEVELS: SkillLevel[] = ["beginner", "intermediate", "advanced", "pro"];
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export interface FilterValue {
  levels: SkillLevel[];
  days: number[];
}

interface Props {
  visible: boolean;
  value: FilterValue;
  onApply: (value: FilterValue) => void;
  onClose: () => void;
}

// F3 filter bottom sheet (Round 2): level + day, both multi-select. Distance
// was removed from the spec (all seed profiles are in one city; city filter
// is implicit for MVP). Reset clears to defaults; Apply commits and closes.
export function FilterSheet({ visible, value, onApply, onClose }: Props) {
  const [draft, setDraft] = useState<FilterValue>(value);

  function toggle<T>(list: T[], item: T): T[] {
    return list.includes(item) ? list.filter((i) => i !== item) : [...list, item];
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>Filter</Text>

        <Text style={styles.sectionLabel}>Level</Text>
        <View style={styles.pillRow}>
          {LEVELS.map((level) => {
            const selected = draft.levels.includes(level);
            return (
              <Pressable
                key={level}
                style={[styles.pill, selected && styles.pillSelected]}
                onPress={() => setDraft((d) => ({ ...d, levels: toggle(d.levels, level) }))}
              >
                <Text style={[styles.pillLabel, selected && styles.pillLabelSelected]}>{level}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>Day</Text>
        <View style={styles.dayRow}>
          {DAY_LABELS.map((label, dayOfWeek) => {
            const selected = draft.days.includes(dayOfWeek);
            return (
              <Pressable
                key={dayOfWeek}
                style={[styles.dayCircle, selected && styles.dayCircleSelected]}
                onPress={() => setDraft((d) => ({ ...d, days: toggle(d.days, dayOfWeek) }))}
              >
                <Text style={[styles.dayLabel, selected && styles.dayLabelSelected]}>{label[0]}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.footer}>
          <View style={{ flex: 1, marginRight: spacing.sm }}>
            <Button label="Reset" variant="outline" onPress={() => setDraft({ levels: [], days: [] })} />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label="Apply"
              onPress={() => {
                onApply(draft);
                onClose();
              }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)" },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg, padding: spacing.lg, paddingTop: spacing.sm },
  handle: { width: 32, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: spacing.sm },
  title: { fontFamily: typography.fontFamilyBold, fontSize: 17, color: colors.charcoal, textAlign: "center" },
  sectionLabel: { fontFamily: typography.fontFamily, fontSize: 13, color: colors.muted, marginTop: spacing.lg, marginBottom: spacing.sm },
  pillRow: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
  pill: { height: 36, paddingHorizontal: 12, borderRadius: 18, borderWidth: 1, borderColor: colors.border, justifyContent: "center", backgroundColor: colors.white },
  pillSelected: { backgroundColor: colors.coral, borderColor: colors.coral },
  pillLabel: { fontFamily: typography.fontFamily, fontSize: 13, color: colors.charcoal },
  pillLabelSelected: { color: colors.white },
  dayRow: { flexDirection: "row", gap: 6 },
  dayCircle: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", backgroundColor: colors.white },
  dayCircleSelected: { backgroundColor: colors.coral, borderColor: colors.coral },
  dayLabel: { fontFamily: typography.fontFamily, fontSize: 13, color: colors.charcoal },
  dayLabelSelected: { color: colors.white },
  footer: { flexDirection: "row", marginTop: spacing.xl, paddingBottom: spacing.md },
  resetLabel: { fontFamily: typography.fontFamilyRegular, fontSize: 14, color: colors.muted },
});
