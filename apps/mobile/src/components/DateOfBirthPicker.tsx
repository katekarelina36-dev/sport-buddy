import { useState } from "react";
import { View, Text, Pressable, Modal, FlatList, StyleSheet } from "react-native";
import { colors, spacing, typography, radii } from "../theme";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface Props {
  value: Date;
  onChange: (date: Date) => void;
}

function daysInMonth(month: number, year: number): number {
  return new Date(year, month + 1, 0).getDate();
}

// Bug fix batch (Round 6), Bug 2: three separate Day / Month / Year columns
// instead of one native picker whose values render as a single merged line.
// Each column opens a scrollable list to pick from — day auto-corrects (e.g.
// Feb 31 -> Feb 28/29) if the month/year change makes the current day invalid.
export function DateOfBirthPicker({ value, onChange }: Props) {
  const [openColumn, setOpenColumn] = useState<"day" | "month" | "year" | null>(null);

  const day = value.getDate();
  const month = value.getMonth();
  const year = value.getFullYear();
  const currentYear = new Date().getFullYear();

  const days = Array.from({ length: daysInMonth(month, year) }, (_, i) => i + 1);
  const years = Array.from({ length: 80 - 16 + 1 }, (_, i) => currentYear - 16 - i);

  function setPart(part: "day" | "month" | "year", newValue: number) {
    let d = day;
    let m = month;
    let y = year;
    if (part === "day") d = newValue;
    if (part === "month") m = newValue;
    if (part === "year") y = newValue;
    const maxDay = daysInMonth(m, y);
    if (d > maxDay) d = maxDay;
    onChange(new Date(y, m, d));
    setOpenColumn(null);
  }

  return (
    <View>
      <View style={styles.row}>
        <Column label="Day" value={String(day)} width="30%" onPress={() => setOpenColumn("day")} />
        <Column label="Month" value={MONTHS[month]} width="40%" onPress={() => setOpenColumn("month")} />
        <Column label="Year" value={String(year)} width="30%" onPress={() => setOpenColumn("year")} />
      </View>

      <PickerModal
        visible={openColumn === "day"}
        onClose={() => setOpenColumn(null)}
        options={days.map((d) => ({ value: d, label: String(d) }))}
        selected={day}
        onSelect={(v) => setPart("day", v)}
      />
      <PickerModal
        visible={openColumn === "month"}
        onClose={() => setOpenColumn(null)}
        options={MONTHS.map((m, i) => ({ value: i, label: m }))}
        selected={month}
        onSelect={(v) => setPart("month", v)}
      />
      <PickerModal
        visible={openColumn === "year"}
        onClose={() => setOpenColumn(null)}
        options={years.map((y) => ({ value: y, label: String(y) }))}
        selected={year}
        onSelect={(v) => setPart("year", v)}
      />
    </View>
  );
}

function Column({ label, value, width, onPress }: { label: string; value: string; width: string; onPress: () => void }) {
  return (
    <View style={{ width: width as `${number}%` }}>
      <Text style={styles.columnLabel}>{label}</Text>
      <Pressable style={styles.columnButton} onPress={onPress}>
        <Text style={styles.columnValue}>{value}</Text>
      </Pressable>
    </View>
  );
}

function PickerModal({
  visible,
  onClose,
  options,
  selected,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  options: { value: number; label: string }[];
  selected: number;
  onSelect: (value: number) => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <FlatList
          data={options}
          keyExtractor={(o) => String(o.value)}
          style={{ maxHeight: 320 }}
          initialScrollIndex={Math.max(0, options.findIndex((o) => o.value === selected))}
          getItemLayout={(_data, index) => ({ length: 48, offset: 48 * index, index })}
          renderItem={({ item }) => (
            <Pressable style={styles.optionRow} onPress={() => onSelect(item.value)}>
              <Text style={[styles.optionLabel, item.value === selected && styles.optionLabelSelected]}>{item.label}</Text>
            </Pressable>
          )}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: spacing.sm, marginTop: 48, justifyContent: "center" },
  columnLabel: { fontFamily: typography.fontFamilyRegular, fontSize: 13, color: colors.muted, textAlign: "center", marginBottom: 6 },
  columnButton: { height: 52, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  columnValue: { fontFamily: typography.fontFamilyBold, fontSize: 18, color: colors.charcoal },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)" },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg, paddingTop: 12, paddingBottom: spacing.lg },
  handle: { width: 32, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: spacing.sm },
  optionRow: { height: 48, alignItems: "center", justifyContent: "center", borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  optionLabel: { fontFamily: typography.fontFamilyRegular, fontSize: 16, color: colors.charcoal },
  optionLabelSelected: { fontFamily: typography.fontFamilyBold, color: colors.coral },
});
