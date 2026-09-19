import { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../src/api/client";
import { Card } from "../../src/components/Card";
import { Badge } from "../../src/components/Badge";
import { Button } from "../../src/components/Button";
import { Avatar } from "../../src/components/Avatar";
import { FilterSheet, type FilterValue } from "../../src/components/FilterSheet";
import { SendActivityRequestSheet } from "../../src/components/SendActivityRequestSheet";
import { colors, spacing, typography } from "../../src/theme";
import { calculateAge } from "../../src/utils/age";
import type { DiscoverEntry } from "../../src/api/types";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// F3 (Round 2): Explore Activities Feed — cards of users with availability
// set for this sport (not user-created "posts"). City filter is implicit
// (all seed data is one city); distance filter removed per spec. Tapping
// "Send Activity Request" opens the F7 bottom sheet instead of sending
// instantly, so the requester can pick a specific day+time first.
export default function FeedScreen() {
  const { activityId } = useLocalSearchParams<{ activityId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [entries, setEntries] = useState<DiscoverEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filter, setFilter] = useState<FilterValue>({ levels: [], days: [] });
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set());
  const [requestSheetFor, setRequestSheetFor] = useState<DiscoverEntry | null>(null);

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

  if (loading) return <ActivityIndicator style={{ marginTop: spacing.xl }} />;

  const activeFilterCount = filter.levels.length + filter.days.length;

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
          const slots = user.availability.filter((s) => s.dayOfWeek !== undefined).slice(0, 2);
          const requested = requestedIds.has(user.id);

          return (
            <Pressable onPress={() => router.push(`/user/${user.id}?activityId=${activityId}`)}>
              <Card style={{ gap: spacing.sm }}>
                <View style={styles.topRow}>
                  <Avatar photoUrl={user.profile?.photoUrl} size={52} />
                  <View style={{ flex: 1, marginLeft: spacing.sm }}>
                    <Text style={styles.name}>{user.profile?.displayName}</Text>
                    <Text style={styles.subtitle}>{[age, user.profile?.city].filter(Boolean).join(" · ")}</Text>
                  </View>
                </View>

                <View style={styles.badgeRow}>
                  <Badge label={primaryActivity.activity.name} tone="coral" />
                  <Badge label={primaryActivity.level} />
                </View>

                {slots.length > 0 && (
                  <Text style={styles.availability}>
                    🗓 {slots.map((s) => `${DAY_NAMES[s.dayOfWeek!]} ${s.startTime}–${s.endTime}`).join("  ·  ")}
                  </Text>
                )}

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

                <View style={styles.divider} />

                <Pressable
                  style={[styles.requestButton, requested && styles.requestButtonSent]}
                  disabled={requested}
                  onPress={() => setRequestSheetFor(item)}
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
      <View style={[styles.footer, { paddingTop: spacing.sm, paddingBottom: insets.bottom + spacing.sm }]}>
        <Button label="Couldn't find a match?" variant="glass" onPress={() => router.push({ pathname: "/availability", params: { activityId } })} />
      </View>

      <FilterSheet visible={filterOpen} value={filter} onApply={setFilter} onClose={() => setFilterOpen(false)} />

      {requestSheetFor && (
        <SendActivityRequestSheet
          visible={Boolean(requestSheetFor)}
          onClose={() => setRequestSheetFor(null)}
          onSent={() => setRequestedIds((prev) => new Set(prev).add(requestSheetFor.user.id))}
          targetUserId={requestSheetFor.user.id}
          targetUserName={requestSheetFor.user.profile?.displayName ?? "this user"}
          activityId={activityId}
          activityName={requestSheetFor.primaryActivity.activity.name}
          slots={requestSheetFor.user.availability
            .filter((s) => s.dayOfWeek !== undefined)
            .map((s) => ({ dayOfWeek: s.dayOfWeek!, startTime: s.startTime, endTime: s.endTime }))}
        />
      )}
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
  name: { fontFamily: typography.fontFamilyBold, fontSize: 16, color: colors.charcoal },
  subtitle: { fontFamily: typography.fontFamilyRegular, fontSize: 13, color: colors.muted, marginTop: 2 },
  badgeRow: { flexDirection: "row", gap: 6 },
  availability: { fontFamily: typography.fontFamilyRegular, fontSize: 13, color: colors.muted },
  alsoPlaysLabel: { fontFamily: typography.fontFamilyRegular, fontSize: 12, color: colors.muted },
  chipRowSmall: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  smallChip: { height: 24, paddingHorizontal: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, justifyContent: "center" },
  smallChipLabel: { fontSize: 12, fontFamily: typography.fontFamilyRegular, color: colors.charcoal },
  divider: { height: 1, backgroundColor: colors.border },
  requestButton: { height: 44, borderRadius: 12, backgroundColor: colors.coral, alignItems: "center", justifyContent: "center" },
  requestButtonSent: { backgroundColor: colors.border },
  requestButtonLabel: { fontFamily: typography.fontFamily, fontSize: 14, color: colors.white },
  requestButtonLabelSent: { color: colors.muted },
  empty: { padding: spacing.xl, alignItems: "center" },
  emptyText: { fontFamily: typography.fontFamilyRegular, color: colors.muted, textAlign: "center" },
  footer: { padding: spacing.lg },
});
