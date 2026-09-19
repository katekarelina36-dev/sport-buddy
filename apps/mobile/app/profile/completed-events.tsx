import { useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../src/api/client";
import { ActivityIcon } from "../../src/components/icons/ActivityIcon";
import { colors, spacing, typography } from "../../src/theme";
import type { CompletedEvent } from "../../src/api/types";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

// UI Redesign Final, section 9: new screen reached by tapping the
// "N completed events" pill on My Profile.
export default function CompletedEventsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [events, setEvents] = useState<CompletedEvent[] | null>(null);

  useEffect(() => {
    api.get<CompletedEvent[]>("/training/completed").then(setEvents);
  }, []);

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top, height: 56 + insets.top }]}>
        <Pressable accessibilityLabel="Back" style={styles.headerButton} onPress={() => router.back()}>
          <Text style={styles.headerIcon}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Completed Events</Text>
        <View style={styles.headerButton} />
      </View>

      <FlatList
        data={events ?? []}
        keyExtractor={(e) => e.id}
        contentContainerStyle={styles.content}
        ListEmptyComponent={events ? <Text style={styles.empty}>No completed events yet.</Text> : null}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.topRow}>
              <ActivityIcon name={item.activity.name} size={18} />
              <Text style={styles.sportName}>{item.activity.name}</Text>
            </View>
            <Text style={styles.metaText}>{formatDate(item.completedAt)}</Text>
            <Text style={styles.metaText}>With {item.partner?.displayName ?? "Sport Buddy user"}</Text>
            <View style={styles.completedPill}>
              <Text style={styles.completedPillLabel}>✓ Completed</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.offWhite },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.sm, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerIcon: { fontSize: 20, color: colors.charcoal },
  headerTitle: { fontFamily: typography.fontFamilyBold, fontSize: 17, color: colors.charcoal },
  content: { padding: spacing.lg, gap: 10 },
  card: { backgroundColor: colors.white, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 14, paddingRight: 16 },
  topRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  sportName: { fontFamily: typography.fontFamilyBold, fontSize: 15, color: colors.charcoal },
  metaText: { fontFamily: typography.fontFamilyRegular, fontSize: 13, color: colors.muted, marginTop: 4 },
  completedPill: {
    alignSelf: "flex-start",
    backgroundColor: colors.secondaryTint2,
    height: 24,
    paddingHorizontal: 10,
    borderRadius: 12,
    justifyContent: "center",
    marginTop: spacing.sm,
  },
  completedPillLabel: { fontFamily: typography.fontFamilyRegular, fontSize: 12, color: colors.sageDark },
  empty: { fontFamily: typography.fontFamilyRegular, color: colors.muted, textAlign: "center", marginTop: spacing.xl },
});
