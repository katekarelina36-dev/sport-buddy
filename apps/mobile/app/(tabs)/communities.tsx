import { useCallback, useState } from "react";
import { View, Text, FlatList, TextInput, Pressable, ImageBackground, StyleSheet } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { api, resolveMediaUrl } from "../../src/api/client";
import { Toast } from "../../src/components/Toast";
import { useAuth } from "../../src/hooks/useAuth";
import { colors, spacing, typography } from "../../src/theme";
import type { CommunitySummary } from "../../src/api/types";

// Communities — full read-write feature (F15 was a read-only stub). List of
// all communities, client-side filtered by name as the user types; a fixed
// bottom "Create Community" bar is locked until 3 completed Events (Round 8,
// Bug 1 — previously a floating button awkwardly mid-screen).
// UI Redesign Final, section 2: each row is a full-bleed image card (the
// community's own photo, or its sport's stock photo as a fallback) with a
// bottom-up gradient wash and text on top, instead of a plain white row.
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
        contentContainerStyle={{ paddingTop: spacing.md, paddingBottom: 80 }}
        ListEmptyComponent={<Text style={styles.empty}>No communities yet — be the first to create one.</Text>}
        renderItem={({ item }) => {
          const uri = resolveMediaUrl(item.photoUrl ?? item.activity.iconUrl);
          return (
            <Pressable style={styles.card} onPress={() => router.push(`/communities/${item.id}`)}>
              {uri ? (
                <ImageBackground source={{ uri }} style={styles.cardImage} resizeMode="cover">
                  <CardOverlay item={item} />
                </ImageBackground>
              ) : (
                <LinearGradient colors={[colors.coral, colors.sageDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cardImage}>
                  <CardOverlay item={item} />
                </LinearGradient>
              )}
            </Pressable>
          );
        }}
      />

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable style={[styles.createButton, unlocked ? styles.createButtonActive : styles.createButtonLocked]} onPress={tapCreate}>
          <Text style={[styles.createButtonLabel, !unlocked && styles.createButtonLabelLocked]}>+ Create Community</Text>
        </Pressable>
      </View>

      <Toast message={toastMessage} onHide={() => setToastMessage(null)} />
    </View>
  );
}

function CardOverlay({ item }: { item: CommunitySummary }) {
  return (
    <>
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.15)", "rgba(0,0,0,0.65)"]}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.sportPill}>
        <Text style={styles.sportPillLabel}>{item.activity.name}</Text>
      </View>
      <View style={styles.cardTextWrap}>
        <Text style={styles.cardName} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.memberCount}>{item.memberCount} members</Text>
      </View>
    </>
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
  card: { height: 160, borderRadius: 16, overflow: "hidden", marginBottom: spacing.md, marginHorizontal: spacing.md },
  cardImage: { flex: 1, justifyContent: "flex-end" },
  sportPill: {
    position: "absolute",
    top: 12,
    right: 12,
    height: 24,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  sportPillLabel: { fontFamily: typography.fontFamilyBold, fontSize: 12, color: colors.coral },
  cardTextWrap: { padding: 14 },
  cardName: { fontFamily: typography.fontFamilyBold, fontSize: 17, color: colors.textOnDark },
  memberCount: { fontFamily: typography.fontFamilyRegular, fontSize: 12, color: "rgba(248,250,252,0.85)", marginTop: 2 },
  empty: { fontFamily: typography.fontFamilyRegular, color: colors.muted, textAlign: "center", marginTop: spacing.xl },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingTop: 12,
  },
  createButton: { height: 52, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  createButtonActive: { backgroundColor: colors.coral },
  createButtonLocked: { backgroundColor: "#E2E8F0" },
  createButtonLabel: { fontFamily: typography.fontFamilyBold, fontSize: 15, color: colors.white },
  createButtonLabelLocked: { color: colors.textMuted },
});
