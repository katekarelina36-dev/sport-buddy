import { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../src/api/client";
import { Avatar } from "../../src/components/Avatar";
import { colors, spacing, typography, radii, shadow } from "../../src/theme";
import { useAuth } from "../../src/hooks/useAuth";
import type { ChatSummary } from "../../src/api/types";

// F10: chats list, only approved-request threads, sorted by recency.
export default function ChatsScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [chats, setChats] = useState<ChatSummary[]>([]);

  const load = useCallback(() => {
    api.get<ChatSummary[]>("/chats").then(setChats);
  }, []);

  useFocusEffect(load);
  useEffect(load, [load]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.title}>Chats</Text>
      <FlatList
        data={chats}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ gap: spacing.sm }}
        ListEmptyComponent={<Text style={styles.empty}>No chats yet — go find a match to start one.</Text>}
        renderItem={({ item }) => {
          const partner = item.userA.id === profile?.id ? item.userB : item.userA;
          return (
            <Pressable style={styles.row} onPress={() => router.push(`/chat/${item.id}`)}>
              <Avatar photoUrl={partner.profile?.photoUrl} />
              <View style={{ flex: 1 }}>
                <View style={styles.nameRow}>
                  <Text style={styles.name}>{partner.profile?.displayName ?? "Sport Buddy user"}</Text>
                  {item.isClosed && (
                    <View style={styles.closedPill}>
                      <Text style={styles.closedPillText}>Closed</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.preview, item.isClosed && styles.previewClosed]} numberOfLines={1}>
                  {item.messages[0]?.body ?? "Say hello!"}
                </Text>
              </View>
              {item.unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.unreadCount}</Text>
                </View>
              )}
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.offWhite, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  title: { fontFamily: typography.fontFamilyBold, fontSize: 24, color: colors.charcoal, marginBottom: spacing.md },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.white, padding: spacing.sm, borderRadius: radii.sm, ...shadow },
  nameRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  name: { fontFamily: typography.fontFamily, color: colors.charcoal },
  closedPill: { backgroundColor: "#F1F5F9", borderRadius: 10, paddingHorizontal: 8, height: 18, justifyContent: "center" },
  closedPillText: { fontFamily: typography.fontFamilyRegular, fontSize: 10, color: colors.muted },
  preview: { fontFamily: typography.fontFamilyRegular, color: colors.muted, fontSize: 13 },
  previewClosed: { color: "#94A3B8" },
  badge: { backgroundColor: colors.coral, borderRadius: 10, minWidth: 20, height: 20, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  badgeText: { color: colors.white, fontSize: 12, fontFamily: typography.fontFamily },
  empty: { fontFamily: typography.fontFamilyRegular, color: colors.muted, textAlign: "center", marginTop: spacing.xl },
});
