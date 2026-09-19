import { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../src/api/client";
import { Avatar } from "../../src/components/Avatar";
import { colors, spacing, typography } from "../../src/theme";
import { useAuth } from "../../src/hooks/useAuth";
import type { ChatSummary } from "../../src/api/types";

// F10: chats list, only approved-request threads, sorted by recency.
// UI Redesign Final, section 1: plain full-width rows — no card borders,
// shadows, or rounded containers.
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
        ListEmptyComponent={<Text style={styles.empty}>No chats yet — go find a match to start one.</Text>}
        renderItem={({ item }) => {
          const partner = item.userA.id === profile?.id ? item.userB : item.userA;
          const timestamp = new Date(item.lastMessageAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          return (
            <Pressable style={styles.row} onPress={() => router.push(`/chat/${item.id}`)}>
              <Avatar photoUrl={partner.profile?.photoUrl} size={48} />
              <View style={styles.center}>
                <View style={styles.nameRow}>
                  <Text style={styles.name} numberOfLines={1}>
                    {partner.profile?.displayName ?? "Teameo user"}
                  </Text>
                  {item.isClosed && (
                    <View style={styles.closedPill}>
                      <Text style={styles.closedPillText}>Closed</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.preview} numberOfLines={1}>
                  {item.messages[0]?.body ?? "Say hello!"}
                </Text>
              </View>
              <View style={styles.right}>
                <Text style={styles.timestamp}>{timestamp}</Text>
                {item.unreadCount > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.unreadCount}</Text>
                  </View>
                ) : (
                  <View style={styles.iconRow}>
                    <Text style={styles.rowIcon}>💬</Text>
                    <Text style={styles.rowIcon}>🔔</Text>
                  </View>
                )}
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.offWhite },
  title: { fontFamily: typography.fontFamilyBold, fontSize: 24, color: colors.charcoal, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, marginBottom: spacing.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    height: 72,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.offWhite,
  },
  center: { flex: 1, marginLeft: spacing.sm, marginRight: spacing.sm },
  nameRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  name: { fontFamily: typography.fontFamilyBold, fontSize: 15, color: colors.charcoal, flexShrink: 1 },
  closedPill: { backgroundColor: colors.borderSubtle, borderRadius: 10, paddingHorizontal: 8, height: 18, justifyContent: "center" },
  closedPillText: { fontFamily: typography.fontFamilyRegular, fontSize: 10, color: colors.muted },
  preview: { fontFamily: typography.fontFamilyRegular, color: colors.muted, fontSize: 13, marginTop: 2 },
  right: { alignItems: "flex-end", gap: 6 },
  timestamp: { fontFamily: typography.fontFamilyRegular, fontSize: 11, color: colors.textMuted },
  iconRow: { flexDirection: "row", gap: 8 },
  rowIcon: { fontSize: 18, color: colors.textMuted },
  badge: { backgroundColor: colors.coral, borderRadius: 10, minWidth: 20, height: 20, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  badgeText: { color: colors.textOnDark, fontSize: 11, fontFamily: typography.fontFamilyBold },
  empty: { fontFamily: typography.fontFamilyRegular, color: colors.muted, textAlign: "center", marginTop: spacing.xl },
});
