import { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { api } from "../../src/api/client";
import { Card } from "../../src/components/Card";
import { Badge } from "../../src/components/Badge";
import { Button } from "../../src/components/Button";
import { Avatar } from "../../src/components/Avatar";
import { colors, spacing, typography } from "../../src/theme";
import type { ActivityPost } from "../../src/api/types";

// F3: Activity Posts feed for one activity type. Filters combine as AND; a
// waitlist entry point ("Couldn't find a match?") lives in the footer per spec.
export default function FeedScreen() {
  const { activityId } = useLocalSearchParams<{ activityId: string }>();
  const router = useRouter();
  const [posts, setPosts] = useState<ActivityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const load = useCallback(
    async (cursor?: string | null) => {
      const query = new URLSearchParams({ activityId, ...(cursor ? { cursor } : {}) });
      const res = await api.get<{ posts: ActivityPost[]; nextCursor: string | null }>(`/activity-posts?${query}`);
      setPosts((prev) => (cursor ? [...prev, ...res.posts] : res.posts));
      setNextCursor(res.nextCursor);
      setLoading(false);
    },
    [activityId]
  );

  useEffect(() => {
    setLoading(true);
    load(null);
  }, [load]);

  if (loading) return <ActivityIndicator style={{ marginTop: spacing.xl }} />;

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ gap: spacing.md, padding: spacing.lg }}
        onEndReached={() => nextCursor && load(nextCursor)}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No one's posted this activity yet. Be the first, or get notified when someone does.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/post/${item.id}`)}>
            <Card style={{ gap: spacing.sm }}>
              <View style={styles.row}>
                <View style={styles.authorRow}>
                  <Avatar photoUrl={item.author.profile?.photoUrl} size={36} />
                  <Text style={styles.name}>{item.author.profile?.displayName ?? "Sport Buddy user"}</Text>
                </View>
                <Badge label={item.level} />
              </View>
              {item.slots.map((slot) => (
                <Text key={slot.id} style={styles.slot}>
                  {new Date(slot.date).toDateString()} · {slot.startTime}–{slot.endTime}
                </Text>
              ))}
            </Card>
          </Pressable>
        )}
      />
      <View style={styles.footer}>
        <Button label="Couldn't find a match?" variant="secondary" onPress={() => router.push({ pathname: "/availability", params: { mode: "waitlist", activityId } })} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.offWhite },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  authorRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  name: { fontFamily: typography.fontFamily, fontSize: 16, color: colors.charcoal },
  slot: { fontFamily: typography.fontFamilyRegular, color: colors.muted, fontSize: 13 },
  empty: { padding: spacing.xl, alignItems: "center" },
  emptyText: { fontFamily: typography.fontFamilyRegular, color: colors.muted, textAlign: "center" },
  footer: { padding: spacing.lg },
});
