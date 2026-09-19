import { useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { api } from "../../src/api/client";
import { ActivityIcon } from "../../src/components/icons/ActivityIcon";
import { colors, radii, spacing, shadow, typography, minTouchTarget, topInset } from "../../src/theme";
import type { Activity } from "../../src/api/types";

// F2/F3 (Round 2): "Explore Activities" sport picker — server-driven 3-column
// grid; tapping a card goes to the feed pre-filtered by that activity (F3).
export default function HomeScreen() {
  const router = useRouter();
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    api.get<Activity[]>("/activities").then(setActivities);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Explore Activities</Text>
      <Text style={styles.subtitle}>Choose a sport to find a partner</Text>
      <FlatList
        data={activities}
        numColumns={3}
        keyExtractor={(a) => a.id}
        columnWrapperStyle={{ gap: spacing.sm }}
        contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.xl, paddingTop: spacing.md }}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => router.push(`/feed/${item.id}`)}>
            <ActivityIcon name={item.name} size={40} />
            <Text style={styles.label} numberOfLines={2}>
              {item.name}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.offWhite, paddingHorizontal: spacing.lg, paddingTop: topInset, paddingBottom: spacing.lg },
  title: { fontFamily: typography.fontFamilyBold, fontSize: 22, color: colors.charcoal },
  subtitle: { fontFamily: typography.fontFamilyRegular, fontSize: 15, color: colors.muted, marginTop: 4 },
  card: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minWidth: minTouchTarget,
    padding: spacing.xs,
    ...shadow,
  },
  label: { fontFamily: typography.fontFamily, fontSize: 12, color: colors.charcoal, textAlign: "center" },
});
