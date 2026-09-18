import { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { api } from "../../src/api/client";
import { Avatar } from "../../src/components/Avatar";
import { colors, spacing, typography, radii, shadow } from "../../src/theme";
import { useAuth } from "../../src/hooks/useAuth";
import type { ChatSummary } from "../../src/api/types";

// F10: chats list, only approved-request threads, sorted by recency.
export default function ChatsScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const [chats, setChats] = useState<ChatSummary[]>([]);

  const load = useCallback(() => {
    api.get<ChatSummary[]>("/chats").then(setChats);
  }, []);

  useFocusEffect(load);
  useEffect(load, [load]);

  return (
    <View style={styles.container}>
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
                <Text style={styles.name}>{partner.profile?.displayName ?? "Sport Buddy user"}</Text>
                <Text style={styles.preview} numberOfLines={1}>
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
  container: { flex: 1, backgroundColor: colors.offWhite, padding: spacing.lg },
  title: { fontFamily: typography.fontFamilyBold, fontSize: 24, color: colors.charcoal, marginBottom: spacing.md },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.white, padding: spacing.sm, borderRadius: radii.sm, ...shadow },
  name: { fontFamily: typography.fontFamily, color: colors.charcoal },
  preview: { fontFamily: typography.fontFamilyRegular, color: colors.muted, fontSize: 13 },
  badge: { backgroundColor: colors.coral, borderRadius: 10, minWidth: 20, height: 20, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  badgeText: { color: colors.white, fontSize: 12, fontFamily: typography.fontFamily },
  empty: { fontFamily: typography.fontFamilyRegular, color: colors.muted, textAlign: "center", marginTop: spacing.xl },
});
