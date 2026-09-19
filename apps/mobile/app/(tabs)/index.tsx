import { useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { api } from "../../src/api/client";
import { ActivityIcon } from "../../src/components/icons/ActivityIcon";
import { colors, radii, spacing, shadow, typography, minTouchTarget, topInset } from "../../src/theme";
import type { Activity } from "../../src/api/types";

// F2: server-driven activity grid; tapping a card goes to the feed pre-filtered
// by that activity (F3).
export default function HomeScreen() {
  const router = useRouter();
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    api.get<Activity[]>("/activities").then(setActivities);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Explore activity</Text>
      <FlatList
        data={activities}
        numColumns={2}
        keyExtractor={(a) => a.id}
        columnWrapperStyle={{ gap: spacing.md }}
        contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xl }}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => router.push(`/feed/${item.id}`)}>
            <ActivityIcon name={item.name} size={40} />
            <Text style={styles.label}>{item.name}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.offWhite, paddingHorizontal: spacing.lg, paddingTop: topInset, paddingBottom: spacing.lg },
  title: { fontFamily: typography.fontFamilyBold, fontSize: 24, color: colors.charcoal, marginBottom: spacing.md },
  card: {
    flex: 1,
    minHeight: 100,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    minWidth: minTouchTarget,
    ...shadow,
  },
  label: { fontFamily: typography.fontFamily, color: colors.charcoal },
});
