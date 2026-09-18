import { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, Pressable, ActivityIndicator, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { api } from "../../src/api/client";
import { Card } from "../../src/components/Card";
import { Badge } from "../../src/components/Badge";
import { Button } from "../../src/components/Button";
import { Avatar } from "../../src/components/Avatar";
import { FilterSheet, type FilterValue } from "../../src/components/FilterSheet";
import { colors, spacing, typography, radii } from "../../src/theme";
import { calculateAge } from "../../src/utils/age";
import type { DiscoverEntry } from "../../src/api/types";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// F3: Explore Activities Feed — cards of users with availability set for this
// sport (not user-created "posts"). Filter chips open a bottom sheet (level,
// day, distance); tapping a card opens F4 (user profile detail).
export default function FeedScreen() {
  const { activityId } = useLocalSearchParams<{ activityId: string }>();
  const router = useRouter();
  const [entries, setEntries] = useState<DiscoverEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filter, setFilter] = useState<FilterValue>({ levels: [], days: [], distanceKm: 50 });
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set());

  const load = useCallback(
    async (cursor?: string | null) => {
      const query = new URLSearchParams({ activityId, ...(cursor ? { cursor } : {}) });
      if (filter.levels.length > 0) query.set("levels", filter.levels.join(","));
      if (filter.days.length > 0) query.set("days", filter.days.join(","));
      const res = await api.get<{ users: DiscoverEntry[]; nextCursor: string | null }>(`/users/discover?${query}`);
      setEntries((prev) => (cursor ? [...prev, ...res.users] : res.users));
      setRequestedIds((prev) => {
        const next = new Set(cursor ? prev : []);
        for (const entry of res.users) if (entry.alreadyRequested) next.add(entry.user.id);
        return next;
      });
      setNextCursor(res.nextCursor);
      setLoading(false);
    },
    [activityId, filter]
  );

  useEffect(() => {
    setLoading(true);
    load(null);
  }, [load]);

  async function sendRequest(targetUserId: string) {
    try {
      await api.post("/activity-requests", { targetUserId, activityId });
      setRequestedIds((prev) => new Set(prev).add(targetUserId));
    } catch (err) {
      Alert.alert("Couldn't send request", (err as Error).message);
    }
  }

  if (loading) return <ActivityIndicator style={{ marginTop: spacing.xl }} />;

  const activeFilterCount = filter.levels.length + filter.days.length + (filter.distanceKm < 50 ? 1 : 0);

  return (
    <View style={styles.container}>
      <View style={styles.filterRow}>
        <Pressable style={[styles.chip, activeFilterCount > 0 && styles.chipActive]} onPress={() => setFilterOpen(true)}>
          <Text style={[styles.chipLabel, activeFilterCount > 0 && styles.chipLabelActive]}>
            Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""} ▾
          </Text>
        </Pressable>
      </View>

      <FlatList
        data={entries}
        keyExtractor={(e) => e.user.id}
        contentContainerStyle={{ gap: spacing.md, padding: spacing.lg }}
        onEndReached={() => nextCursor && load(nextCursor)}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No one's set availability for this sport yet. Be the first, or get notified when someone does.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const { user, primaryActivity } = item;
          const age = user.profile?.dateOfBirth ? calculateAge(user.profile.dateOfBirth) : null;
          const otherSports = user.activities.filter((a) => a.activityId !== primaryActivity.activityId);
          const primarySlot = user.availability[0];
          const requested = requestedIds.has(user.id);

          return (
            <Pressable onPress={() => router.push(`/user/${user.id}`)}>
              <Card style={{ gap: spacing.sm }}>
                <View style={styles.topRow}>
                  <Avatar photoUrl={user.profile?.photoUrl} size={56} />
                  <View style={{ flex: 1, marginLeft: spacing.sm }}>
                    <View style={styles.nameRow}>
                      <Text style={styles.name}>{user.profile?.displayName}</Text>
                      {age !== null && <Text style={styles.age}>· {age}</Text>}
                    </View>
                    <View style={styles.badgeRow}>
                      <Badge label={primaryActivity.activity.name} tone="coral" />
                      <Badge label={primaryActivity.level} />
                    </View>
                    {primarySlot && (
                      <Text style={styles.availability}>
                        🗓 {primarySlot.dayOfWeek !== undefined ? DAY_NAMES[primarySlot.dayOfWeek] : ""} · {primarySlot.startTime}–{primarySlot.endTime}
                      </Text>
                    )}
                  </View>
                </View>

                {otherSports.length > 0 && (
                  <View>
                    <Text style={styles.alsoPlaysLabel}>Also plays:</Text>
                    <View style={styles.chipRowSmall}>
                      {otherSports.map((a) => (
                        <View key={a.activityId} style={styles.smallChip}>
                          <Text style={styles.smallChipLabel}>{a.activity.name}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                <Pressable
                  style={[styles.requestButton, requested && styles.requestButtonSent]}
                  disabled={requested}
                  onPress={() => sendRequest(user.id)}
                >
                  <Text style={[styles.requestButtonLabel, requested && styles.requestButtonLabelSent]}>
                    {requested ? "Requested" : "Send Activity Request"}
                  </Text>
                </Pressable>
              </Card>
            </Pressable>
          );
        }}
      />
      <View style={styles.footer}>
        <Button label="Couldn't find a match?" variant="secondary" onPress={() => router.push({ pathname: "/availability", params: { mode: "waitlist", activityId } })} />
      </View>

      <FilterSheet visible={filterOpen} value={filter} onApply={setFilter} onClose={() => setFilterOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.offWhite },
  filterRow: { flexDirection: "row", paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  chip: { height: 32, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.border, justifyContent: "center", backgroundColor: colors.white },
  chipActive: { backgroundColor: colors.coral, borderColor: colors.coral },
  chipLabel: { fontFamily: typography.fontFamily, fontSize: 13, color: colors.charcoal },
  chipLabelActive: { color: colors.white },
  topRow: { flexDirection: "row", alignItems: "center" },
  nameRow: { flexDirection: "row", alignItems: "baseline" },
  name: { fontFamily: typography.fontFamilyBold, fontSize: 16, color: colors.charcoal },
  age: { fontFamily: typography.fontFamilyRegular, fontSize: 14, color: colors.muted, marginLeft: 6 },
  badgeRow: { flexDirection: "row", gap: 6, marginTop: 4 },
  availability: { fontFamily: typography.fontFamilyRegular, fontSize: 13, color: colors.muted, marginTop: 6 },
  alsoPlaysLabel: { fontFamily: typography.fontFamilyRegular, fontSize: 12, color: colors.muted },
  chipRowSmall: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  smallChip: { height: 24, paddingHorizontal: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, justifyContent: "center" },
  smallChipLabel: { fontSize: 12, fontFamily: typography.fontFamilyRegular, color: colors.charcoal },
  requestButton: { height: 44, borderRadius: 12, backgroundColor: colors.coral, alignItems: "center", justifyContent: "center", marginTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 0 },
  requestButtonSent: { backgroundColor: colors.border },
  requestButtonLabel: { fontFamily: typography.fontFamily, fontSize: 14, color: colors.white },
  requestButtonLabelSent: { color: colors.muted },
  empty: { padding: spacing.xl, alignItems: "center" },
  emptyText: { fontFamily: typography.fontFamilyRegular, color: colors.muted, textAlign: "center" },
  footer: { padding: spacing.lg },
});
