import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, FlatList, TextInput, StyleSheet, Pressable, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Socket } from "socket.io-client";
import { api } from "../../../src/api/client";
import { getChatSocket } from "../../../src/api/socket";
import { Button } from "../../../src/components/Button";
import { Avatar } from "../../../src/components/Avatar";
import { ActivityIcon } from "../../../src/components/icons/ActivityIcon";
import { colors, spacing, typography, radii } from "../../../src/theme";
import { useAuth } from "../../../src/hooks/useAuth";
import type { CommunityMessage, CommunitySummary } from "../../../src/api/types";

// Communities — Community Chat: same layout as a 1:1 chat, but group-scoped
// (no Schedule Event footer) and lets organisers/assistants pin a message.
export default function CommunityChatScreen() {
  const { communityId } = useLocalSearchParams<{ communityId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const [community, setCommunity] = useState<CommunitySummary | null>(null);
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [input, setInput] = useState("");
  const socketRef = useRef<Socket | null>(null);

  const canManage = community?.myRole === "organiser" || community?.myRole === "assistant";

  const load = useCallback(async () => {
    const [c, msgs] = await Promise.all([
      api.get<CommunitySummary>(`/communities/${communityId}`),
      api.get<CommunityMessage[]>(`/communities/${communityId}/messages`),
    ]);
    setCommunity(c);
    setMessages(msgs);
  }, [communityId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let active = true;
    getChatSocket().then((socket) => {
      if (!active) return;
      socketRef.current = socket;
      socket.emit("community:join", communityId);
      socket.on("community:message", (message: CommunityMessage) => {
        if (message.communityId === communityId) setMessages((prev) => [...prev, message]);
      });
    });
    return () => {
      active = false;
      socketRef.current?.off("community:message");
    };
  }, [communityId]);

  function send() {
    if (!input.trim()) return;
    const socket = socketRef.current;
    if (socket?.connected) {
      socket.emit("community:message", { communityId, body: input });
    } else {
      api.post<CommunityMessage>(`/communities/${communityId}/messages`, { body: input }).then((m) => setMessages((prev) => [...prev, m]));
    }
    setInput("");
  }

  async function togglePin(messageId: string) {
    await api.post(`/communities/messages/${messageId}/pin`);
    load();
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top, height: 64 + insets.top }]}>
        <Pressable accessibilityLabel="Back" style={styles.headerButton} onPress={() => router.back()}>
          <Text style={styles.headerBackIcon}>←</Text>
        </Pressable>
        <View style={styles.headerPhoto}>
          <ActivityIcon name={community?.activity.name ?? ""} size={20} />
        </View>
        <View style={styles.headerNameCol}>
          <Text style={styles.headerName} numberOfLines={1}>
            {community?.name ?? "Community"}
          </Text>
          {community && (
            <Text style={styles.headerStatus} numberOfLines={1}>
              {community.memberCount} members
            </Text>
          )}
        </View>
      </View>

      <FlatList
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: spacing.md, gap: 4 }}
        renderItem={({ item, index }) => {
          const next = messages[index + 1];
          const showAvatar = item.type === "text" && (!next || next.senderId !== item.senderId || next.type !== "text");
          return (
            <MessageBubble
              message={item}
              mine={item.senderId === profile?.id}
              showAvatar={showAvatar}
              avatarUri={item.sender?.profile?.photoUrl}
              senderName={item.sender?.profile?.displayName}
              canManage={Boolean(canManage)}
              onLongPress={() => {
                if (!canManage) return;
                Alert.alert("Message options", undefined, [
                  { text: item.isPinned ? "Unpin" : "Pin message", onPress: () => togglePin(item.id) },
                  { text: "Cancel", style: "cancel" },
                ]);
              }}
            />
          );
        }}
      />

      <View style={styles.composerRow}>
        <TextInput style={styles.input} placeholder="Message" value={input} onChangeText={setInput} onSubmitEditing={send} />
        <Button label="Send" onPress={send} />
      </View>
      <View style={{ height: insets.bottom }} />
    </View>
  );
}

function MessageBubble({
  message,
  mine,
  showAvatar,
  avatarUri,
  senderName,
  canManage,
  onLongPress,
}: {
  message: CommunityMessage;
  mine: boolean;
  showAvatar: boolean;
  avatarUri?: string | null;
  senderName?: string;
  canManage: boolean;
  onLongPress: () => void;
}) {
  if (message.type === "system") {
    return (
      <View style={styles.systemPill}>
        <Text style={styles.systemPillText}>{message.body}</Text>
      </View>
    );
  }

  const time = new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <Pressable
      style={[styles.messageRow, mine ? styles.messageRowMine : styles.messageRowTheirs]}
      onLongPress={canManage ? onLongPress : undefined}
    >
      {!mine && <View style={styles.avatarSlot}>{showAvatar && <Avatar photoUrl={avatarUri} size={28} />}</View>}
      <View style={mine ? styles.bubbleColMine : styles.bubbleColTheirs}>
        {!mine && showAvatar && senderName && <Text style={styles.senderName}>{senderName}</Text>}
        <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
          {message.isPinned && <Text style={styles.pinnedIcon}>📌</Text>}
          <Text style={mine ? styles.bubbleTextMine : styles.bubbleText}>{message.body}</Text>
        </View>
        <Text style={[styles.timestamp, mine ? styles.timestampMine : styles.timestampTheirs]}>{time}</Text>
      </View>
      {mine && <View style={styles.avatarSlot}>{showAvatar && <Avatar photoUrl={avatarUri} size={28} />}</View>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.offWhite },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.xs, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing.xs },
  headerButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerBackIcon: { fontSize: 20, color: colors.charcoal },
  headerPhoto: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  headerNameCol: { flex: 1, justifyContent: "center" },
  headerName: { fontFamily: typography.fontFamilyBold, fontSize: 16, color: colors.charcoal },
  headerStatus: { fontFamily: typography.fontFamilyRegular, fontSize: 12, color: colors.muted, marginTop: 2 },
  messageRow: { flexDirection: "row", alignItems: "flex-end", gap: spacing.xs },
  messageRowMine: { justifyContent: "flex-end" },
  messageRowTheirs: { justifyContent: "flex-start" },
  avatarSlot: { width: 28, height: 28 },
  bubbleColMine: { alignItems: "flex-end", maxWidth: "75%" },
  bubbleColTheirs: { alignItems: "flex-start", maxWidth: "75%" },
  senderName: { fontFamily: typography.fontFamilyRegular, fontSize: 12, color: colors.muted, marginBottom: 2, marginLeft: 4 },
  bubble: { paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMine: { backgroundColor: colors.coral, borderRadius: 16, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 16, borderBottomLeftRadius: 4 },
  bubbleText: { fontFamily: typography.fontFamilyRegular, color: colors.charcoal, fontSize: 15, lineHeight: 22 },
  bubbleTextMine: { fontFamily: typography.fontFamilyRegular, color: colors.white, fontSize: 15, lineHeight: 22 },
  pinnedIcon: { fontSize: 11, marginBottom: 2 },
  timestamp: { fontFamily: typography.fontFamilyRegular, fontSize: 11, color: colors.muted, marginTop: 2 },
  timestampMine: { textAlign: "right" },
  timestampTheirs: { textAlign: "left" },
  systemPill: { alignSelf: "center", backgroundColor: "#F1F5F9", borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8, marginVertical: spacing.xs },
  systemPillText: { fontFamily: typography.fontFamilyRegular, fontSize: 13, color: colors.muted, fontStyle: "italic", textAlign: "center" },
  composerRow: { flexDirection: "row", gap: spacing.sm, padding: spacing.md, alignItems: "center" },
  input: { flex: 1, backgroundColor: colors.white, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, minHeight: 44 },
});
