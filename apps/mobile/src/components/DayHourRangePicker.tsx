import { useRef, useState } from "react";
import { View, Text, StyleSheet, PanResponder, Pressable } from "react-native";
import { colors, radii, spacing, typography } from "../theme";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const ROW_HEIGHT = 22;

function formatHour(h: number): string {
  return `${String(h).padStart(2, "0")}:00`;
}

interface Range {
  startTime: string;
  endTime: string;
}

interface Props {
  ranges: Range[];
  onAddRange: (range: Range) => void;
  onRemoveRange: (index: number) => void;
}

// Outlook-style drag-to-select: press and drag down across hour rows to mark a
// continuous free-time range, release to confirm. Renders as a fixed-height
// (non-scrolling) grid so the drag gesture doesn't fight a parent ScrollView.
export function DayHourRangePicker({ ranges, onAddRange, onRemoveRange }: Props) {
  const [dragRange, setDragRange] = useState<{ start: number; end: number } | null>(null);
  const dragStartRef = useRef<number | null>(null);

  function hourFromY(y: number): number {
    return Math.min(HOURS.length - 1, Math.max(0, Math.floor(y / ROW_HEIGHT)));
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const hour = hourFromY(evt.nativeEvent.locationY);
        dragStartRef.current = hour;
        setDragRange({ start: hour, end: hour });
      },
      onPanResponderMove: (evt) => {
        if (dragStartRef.current === null) return;
        const hour = hourFromY(evt.nativeEvent.locationY);
        setDragRange({ start: dragStartRef.current, end: hour });
      },
      onPanResponderRelease: () => {
        if (dragStartRef.current === null) return;
        setDragRange((current) => {
          if (current) {
            const from = Math.min(current.start, current.end);
            const to = Math.max(current.start, current.end) + 1; // end exclusive -> next hour boundary
            onAddRange({ startTime: formatHour(from), endTime: formatHour(Math.min(to, 24)) });
          }
          return null;
        });
        dragStartRef.current = null;
      },
    })
  ).current;

  return (
    <View>
      <View style={styles.grid} {...panResponder.panHandlers}>
        {HOURS.map((hour) => {
          const inDrag =
            dragRange !== null && hour >= Math.min(dragRange.start, dragRange.end) && hour <= Math.max(dragRange.start, dragRange.end);
          return (
            <View key={hour} style={[styles.row, inDrag && styles.rowDragging]}>
              <Text style={styles.rowLabel}>{formatHour(hour)}</Text>
            </View>
          );
        })}
      </View>

      {ranges.length > 0 && (
        <View style={styles.rangeList}>
          {ranges.map((range, index) => (
            <Pressable key={index} style={styles.rangeChip} onPress={() => onRemoveRange(index)}>
              <Text style={styles.rangeChipLabel}>
                {range.startTime}–{range.endTime} ✕
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { borderRadius: radii.sm, overflow: "hidden", borderWidth: 1, borderColor: colors.border },
  row: { height: ROW_HEIGHT, justifyContent: "center", paddingHorizontal: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.white },
  rowDragging: { backgroundColor: colors.coral },
  rowLabel: { fontSize: 10, fontFamily: typography.fontFamilyRegular, color: colors.muted },
  rangeList: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.sm },
  rangeChip: { backgroundColor: colors.sageLight, borderRadius: radii.sm, paddingHorizontal: 10, paddingVertical: 6 },
  rangeChipLabel: { fontFamily: typography.fontFamily, fontSize: 12, color: colors.sageDark },
});
