import { useEffect, useMemo, useState } from "react";
import { View, Text, FlatList, TextInput, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../src/api/client";
import { ActivityCard } from "../../src/components/ActivityCard";
import { EXPLORE_ACTIVITIES, ACTIVITY_IMAGES, ACTIVITY_PLACEHOLDER_TINT } from "../../src/constants/exploreActivities";
import { colors, spacing, typography } from "../../src/theme";
import type { Activity } from "../../src/api/types";

// Explore Activity screen (Round 3 card redesign): full-width photo rows
// instead of a 3-column icon grid, scoped down to a fixed six-sport list
// (name-matched against whatever the API returns, in a fixed display order)
// with a live text filter above it. Tap behavior is unchanged — still routes
// into the F3 feed pre-filtered by that activity.
export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    api.get<Activity[]>("/activities").then(setActivities);
  }, []);

  const items = useMemo(() => {
    const byName = new Map(activities.map((a) => [a.name, a]));
    const q = query.trim().toLowerCase();
    return EXPLORE_ACTIVITIES.map((name) => byName.get(name)).filter(
      (a): a is Activity => a !== undefined && a.name.toLowerCase().includes(q)
    );
  }, [activities, query]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.title}>Choose your activity</Text>

      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search activity"
          placeholderTextColor={colors.muted}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
        />
      </View>

      <FlatList
        data={items}
        keyExtractor={(a) => a.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.empty}>No activities match "{query}"</Text>}
        renderItem={({ item, index }) => (
          <ActivityCard
            name={item.name}
            image={ACTIVITY_IMAGES[item.name as (typeof EXPLORE_ACTIVITIES)[number]]}
            tint={ACTIVITY_PLACEHOLDER_TINT[item.name as (typeof EXPLORE_ACTIVITIES)[number]] ?? colors.border}
            roundedTop={index === 0}
            onPress={() => router.push({ pathname: "/feed/[activityId]", params: { activityId: item.id, sportName: item.name } })}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.offWhite },
  title: { fontFamily: typography.fontFamilyRegular, fontSize: 15, color: colors.charcoal, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
  },
  searchIcon: { fontSize: 14, marginRight: spacing.xs },
  searchInput: { flex: 1, fontFamily: typography.fontFamilyRegular, fontSize: 14, color: colors.charcoal },
  listContent: { paddingTop: spacing.md, paddingBottom: spacing.xl },
  empty: { fontFamily: typography.fontFamilyRegular, color: colors.muted, textAlign: "center", marginTop: spacing.xl },
});
