import { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, FlatList, TextInput, Pressable, StyleSheet, Keyboard } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../src/api/client";
import { ActivityCard } from "../../src/components/ActivityCard";
import { ActivityIcon } from "../../src/components/icons/ActivityIcon";
import { SearchIcon } from "../../src/components/icons/SearchIcon";
import { EXPLORE_ACTIVITIES } from "../../src/constants/exploreActivities";

// No photo pipeline entry for Padel yet — bundled fallback so its card
// isn't stuck on the flat gradient tile.
const PADEL_IMAGE = require("../../assets/activities/padel.jpg");
import { colors, spacing, typography, radii } from "../../src/theme";
import type { Activity } from "../../src/api/types";

// Explore Activity screen (Round 3 card redesign): full-width photo rows for
// a fixed six-sport shortlist. Round 8, Bug 3: since the shortlist alone
// can't reach the other 19 sports in the catalog, the search field above it
// is an autocomplete over the FULL catalog (not just the six cards) — typing
// opens a dropdown, tapping a result jumps straight into that sport's feed.
// Round 10, Fix 1: the card list below also live-filters (starts-with
// matches first) instead of just dimming, and the dropdown no longer
// depends on the TextInput's onBlur to close — that raced against the row's
// own onPress on some devices, so a tap could lose the touch entirely and
// leave the input looking "stuck" mid-word. A full-screen backdrop (behind
// the dropdown, above the card list) now handles the "tap outside" close.
export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [query, setQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    api.get<Activity[]>("/activities").then(setActivities);
  }, []);

  const byName = new Map(activities.map((a) => [a.name, a]));
  const cards = EXPLORE_ACTIVITIES.map((name) => byName.get(name)).filter((a): a is Activity => a !== undefined);

  const q = query.trim().toLowerCase();
  const matches = q.length > 0 ? activities.filter((a) => a.name.toLowerCase().includes(q)).slice(0, 5) : [];

  const filteredCards = useMemo(() => {
    if (q.length === 0) return cards;
    return cards
      .filter((a) => a.name.toLowerCase().includes(q))
      .sort((a, b) => {
        const aStarts = a.name.toLowerCase().startsWith(q) ? 1 : 0;
        const bStarts = b.name.toLowerCase().startsWith(q) ? 1 : 0;
        return bStarts - aStarts;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, activities]);

  function handleSportSelect(activity: Activity) {
    setQuery(activity.name);
    setDropdownOpen(false);
    Keyboard.dismiss();
    inputRef.current?.blur();
    router.push({ pathname: "/feed/[activityId]", params: { activityId: activity.id, sportName: activity.name } });
  }

  function closeDropdown() {
    setDropdownOpen(false);
    Keyboard.dismiss();
    inputRef.current?.blur();
  }

  function clearQuery() {
    setQuery("");
    setDropdownOpen(false);
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.title}>Choose your activity</Text>

      <View style={styles.searchWrap}>
        <View style={styles.searchIcon}>
          <SearchIcon size={24} color="#94A3B8" />
        </View>
        <TextInput
          ref={inputRef}
          style={styles.searchInput}
          placeholder="Search activities..."
          placeholderTextColor={colors.muted}
          value={query}
          onChangeText={(text) => {
            setQuery(text);
            setDropdownOpen(text.trim().length > 0);
          }}
          onFocus={() => setDropdownOpen(query.trim().length > 0)}
          autoCapitalize="none"
        />
        {query.length > 0 && (
          <Pressable accessibilityLabel="Clear search" style={styles.clearButton} onPress={clearQuery}>
            <Text style={styles.clearButtonIcon}>×</Text>
          </Pressable>
        )}
      </View>

      <View style={{ flex: 1 }}>
        {dropdownOpen && matches.length > 0 && (
          <Pressable style={styles.backdrop} onPress={closeDropdown} />
        )}

        {dropdownOpen && matches.length > 0 && (
          <View style={styles.dropdown}>
            <FlatList
              data={matches}
              keyExtractor={(a) => a.id}
              nestedScrollEnabled
              renderItem={({ item, index }) => (
                <Pressable
                  style={[styles.dropdownRow, index === matches.length - 1 && styles.dropdownRowLast]}
                  onPress={() => handleSportSelect(item)}
                >
                  <ActivityIcon name={item.name} size={20} />
                  <HighlightedLabel text={item.name} query={query.trim()} />
                </Pressable>
              )}
            />
          </View>
        )}

        <FlatList
          data={filteredCards}
          keyExtractor={(a) => a.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.empty}>No activities match "{query}"</Text>}
          renderItem={({ item }) => (
            <ActivityCard
              name={item.name}
              photoUrl={item.iconUrl}
              localImage={item.name === "Padel" ? PADEL_IMAGE : undefined}
              imageFocalPoint={item.name === "Padel" ? { top: "0%", left: "30%" } : undefined}
              onPress={() => handleSportSelect(item)}
            />
          )}
        />
      </View>
    </View>
  );
}

function HighlightedLabel({ text, query }: { text: string; query: string }) {
  const index = text.toLowerCase().indexOf(query.toLowerCase());
  if (index === -1 || !query) return <Text style={styles.dropdownRowLabel}>{text}</Text>;
  return (
    <Text style={styles.dropdownRowLabel}>
      {text.slice(0, index)}
      <Text style={styles.dropdownRowLabelMatch}>{text.slice(index, index + query.length)}</Text>
      {text.slice(index + query.length)}
    </Text>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.offWhite },
  title: { fontFamily: typography.fontFamilyRegular, fontSize: 29.25, color: colors.charcoal, textAlign: "center", paddingHorizontal: spacing.lg, paddingTop: 20 },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    marginHorizontal: spacing.lg,
    marginTop: 30,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
  },
  searchIcon: { position: "relative", width: 24, height: 24, marginRight: spacing.xs },
  searchInput: { flex: 1, fontFamily: typography.fontFamilyRegular, fontSize: 14, color: colors.charcoal },
  clearButton: { width: 44, height: 44, marginRight: -14, alignItems: "center", justifyContent: "center" },
  clearButtonIcon: { fontSize: 18, color: "#94A3B8" },
  backdrop: { ...StyleSheet.absoluteFill, zIndex: 5 },
  dropdown: {
    marginHorizontal: spacing.lg,
    marginTop: 4,
    maxHeight: 5 * 44,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    zIndex: 10,
  },
  dropdownRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, height: 44, paddingHorizontal: spacing.md, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  dropdownRowLast: { borderBottomWidth: 0 },
  dropdownRowLabel: { fontFamily: typography.fontFamilyRegular, fontSize: 15, color: colors.charcoal },
  dropdownRowLabelMatch: { fontFamily: typography.fontFamilyBold, color: colors.coral },
  listContent: { paddingHorizontal: spacing.lg, paddingTop: 30, paddingBottom: spacing.xl, gap: spacing.md },
  empty: { fontFamily: typography.fontFamilyRegular, color: colors.muted, textAlign: "center", marginTop: spacing.xl },
});
