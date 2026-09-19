import { useCallback, useState } from "react";
import { View, Text, FlatList, TextInput, Pressable, StyleSheet } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../src/api/client";
import { ActivityIcon } from "../../src/components/icons/ActivityIcon";
import { Toast } from "../../src/components/Toast";
import { useAuth } from "../../src/hooks/useAuth";
import { colors, radii, spacing, shadow, typography } from "../../src/theme";
import type { CommunitySummary } from "../../src/api/types";

// Communities — full read-write feature (F15 was a read-only stub). List of
// all communities, client-side filtered by name as the user types; a
// floating "Create Community" button is locked until 3 completed Events.
export default function CommunitiesListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const [communities, setCommunities] = useState<CommunitySummary[]>([]);
  const [query, setQuery] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const load = useCallback(() => {
    api.get<CommunitySummary[]>("/communities").then(setCommunities);
  }, []);

  useFocusEffect(load);

  const unlocked = (profile?.profile?.completedTrainingsCount ?? 0) >= 3;
  const filtered = communities.filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase()));

  function tapCreate() {
    if (unlocked) {
      router.push("/communities/create");
    } else {
      setToastMessage("Complete 3 events to unlock community creation");
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.title}>Communities</Text>
      <Text style={styles.subtitle}>Find your sport community</Text>

      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search communities"
          placeholderTextColor={colors.muted}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm, paddingBottom: 120 }}
        ListEmptyComponent={<Text style={styles.empty}>No communities yet — be the first to create one.</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => router.push(`/communities/${item.id}`)}>
            <View style={styles.cardPhoto}>
              <ActivityIcon name={item.activity.name} size={24} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardName}>{item.name}</Text>
              <View style={styles.sportBadge}>
                <Text style={styles.sportBadgeText}>{item.activity.name}</Text>
              </View>
              <Text style={styles.memberCount}>{item.memberCount} members</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        )}
      />

      <Pressable
        style={[styles.fab, { bottom: insets.bottom + 56 + spacing.md }, unlocked ? styles.fabActive : styles.fabLocked]}
        onPress={tapCreate}
      >
        <Text style={[styles.fabLabel, !unlocked && styles.fabLabelLocked]}>+ Create Community</Text>
      </Pressable>

      <Toast message={toastMessage} onHide={() => setToastMessage(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.offWhite },
  title: { fontFamily: typography.fontFamilyBold, fontSize: 22, color: colors.charcoal, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  subtitle: { fontFamily: typography.fontFamilyRegular, fontSize: 14, color: colors.muted, paddingHorizontal: spacing.lg, marginTop: 4 },
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
  card: { flexDirection: "row", alignItems: "center", backgroundColor: colors.white, borderRadius: radii.sm, padding: spacing.md, ...shadow },
  cardPhoto: { width: 56, height: 56, borderRadius: 12, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center", marginRight: spacing.md },
  cardName: { fontFamily: typography.fontFamilyBold, fontSize: 16, color: colors.charcoal },
  sportBadge: { backgroundColor: colors.coral, alignSelf: "flex-start", height: 22, paddingHorizontal: 8, borderRadius: 11, justifyContent: "center", marginTop: 4 },
  sportBadgeText: { fontFamily: typography.fontFamily, fontSize: 12, color: colors.white },
  memberCount: { fontFamily: typography.fontFamilyRegular, fontSize: 13, color: colors.muted, marginTop: 4 },
  chevron: { fontSize: 20, color: "#94A3B8", marginLeft: spacing.sm },
  empty: { fontFamily: typography.fontFamilyRegular, color: colors.muted, textAlign: "center", marginTop: spacing.xl },
  fab: {
    position: "absolute",
    right: spacing.md,
    height: 48,
    paddingHorizontal: 20,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  fabActive: { backgroundColor: colors.coral, ...shadow, elevation: 4 },
  fabLocked: { backgroundColor: colors.border },
  fabLabel: { fontFamily: typography.fontFamilyBold, fontSize: 15, color: colors.white },
  fabLabelLocked: { color: "#94A3B8" },
});
