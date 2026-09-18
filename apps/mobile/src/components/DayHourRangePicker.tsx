import { useEffect, useRef, useState } from "react";
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
  const dragEndRef = useRef<number | null>(null);
  const gridRef = useRef<View>(null);
  const gridPageYRef = useRef(0);

  // Keep a ref to the latest onAddRange: the PanResponder object below is
  // created once (via useRef) so its closures would otherwise be permanently
  // bound to whatever `onAddRange` was on the very first render (a stale
  // closure) — reading through a ref that's updated every render avoids that.
  const onAddRangeRef = useRef(onAddRange);
  useEffect(() => {
    onAddRangeRef.current = onAddRange;
  }, [onAddRange]);

  function hourFromPageY(pageY: number): number {
    const relativeY = pageY - gridPageYRef.current;
    return Math.min(HOURS.length - 1, Math.max(0, Math.floor(relativeY / ROW_HEIGHT)));
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        // evt.nativeEvent.locationY is relative to whichever individual hour
        // row the touch landed on (each hour is its own child View), not the
        // overall grid — that's what was making every drag compute as
        // hour ~0 regardless of where you actually pressed. Measuring the
        // grid's absolute screen position and using pageY instead fixes it.
        gridRef.current?.measure((_x, _y, _w, _h, _pageX, pageY) => {
          gridPageYRef.current = pageY;
          const hour = hourFromPageY(evt.nativeEvent.pageY);
          dragStartRef.current = hour;
          dragEndRef.current = hour;
          setDragRange({ start: hour, end: hour });
        });
      },
      onPanResponderMove: (evt) => {
        if (dragStartRef.current === null) return;
        const hour = hourFromPageY(evt.nativeEvent.pageY);
        dragEndRef.current = hour;
        setDragRange({ start: dragStartRef.current, end: hour });
      },
      onPanResponderRelease: () => {
        const start = dragStartRef.current;
        const end = dragEndRef.current;
        dragStartRef.current = null;
        dragEndRef.current = null;
        setDragRange(null);
        if (start === null) return;
        // Called directly in this event handler (not nested inside the
        // setDragRange updater above) — updating a *different* component's
        // state from inside another component's state-update callback is
        // what React's Fabric renderer flags as an error.
        const from = Math.min(start, end ?? start);
        const to = Math.max(start, end ?? start) + 1;
        onAddRangeRef.current({ startTime: formatHour(from), endTime: formatHour(Math.min(to, 24)) });
      },
    })
  ).current;

  return (
    <View>
      <View ref={gridRef} style={styles.grid} {...panResponder.panHandlers}>
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
