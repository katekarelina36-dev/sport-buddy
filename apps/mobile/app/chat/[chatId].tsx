import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, FlatList, TextInput, StyleSheet, Pressable, Alert, Modal, ScrollView } from "react-native";
import { useLocalSearchParams } from "expo-router";
import type { Socket } from "socket.io-client";
import { api } from "../../src/api/client";
import { getChatSocket } from "../../src/api/socket";
import { Button } from "../../src/components/Button";
import { AvailabilityPicker } from "../../src/components/AvailabilityPicker";
import { colors, spacing, typography, radii } from "../../src/theme";
import { useAuth } from "../../src/hooks/useAuth";
import type { Message, ChatSummary, TrainingSession, AvailabilitySlot } from "../../src/api/types";

// F11 (real-time messaging + auto starters) + F12 (in-chat scheduler, sticky
// banner, calendar sync status) + F13 (challenge card render, delivered as a
// "system" message by the backend on Event creation) + F14 (completion flow,
// mutual for the first Event, single-tap after).
export default function ChatScreen() {
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const { profile } = useAuth();
  const [chat, setChat] = useState<ChatSummary | null>(null);
  const [trainings, setTrainings] = useState<TrainingSession[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [schedulerOpen, setSchedulerOpen] = useState(false);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [completingFirst, setCompletingFirst] = useState<TrainingSession | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const load = useCallback(async () => {
    const res = await api.get<{ chat: any; messages: Message[] }>(`/chats/${chatId}`);
    setChat(res.chat);
    setTrainings(res.chat.trainingSessions ?? []);
    setMessages(res.messages);
    api.post(`/chats/${chatId}/read`);
  }, [chatId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let active = true;
    getChatSocket().then((socket) => {
      if (!active) return;
      socketRef.current = socket;
      socket.emit("chat:join", chatId);
      socket.on("chat:message", (message: Message) => {
        if (message.chatId === chatId) setMessages((prev) => [...prev, message]);
      });
    });
    return () => {
      active = false;
      socketRef.current?.off("chat:message");
    };
  }, [chatId]);

  function send() {
    if (!input.trim()) return;
    const socket = socketRef.current;
    if (socket?.connected) {
      socket.emit("chat:message", { chatId, body: input });
    } else {
      // REST fallback per spec when the socket is unavailable.
      api.post<Message>(`/chats/${chatId}/messages`, { body: input }).then((m) => setMessages((prev) => [...prev, m]));
    }
    setInput("");
  }

  async function scheduleEvent() {
    const firstSlot = slots[0];
    if (!firstSlot || !chat) {
      Alert.alert("Pick a time first");
      return;
    }
    const scheduledAt = nextDateForDayAndTime(firstSlot.dayOfWeek ?? 0, firstSlot.startTime);
    await api.post("/training", { chatId, activityId: chat.activity.id, scheduledAt: scheduledAt.toISOString() });
    setSchedulerOpen(false);
    load();
  }

  const activeTraining = trainings.find((t) => t.status === "scheduled");
  const isFirstEverTraining = trainings.length <= 1;

  async function completeTapped(training: TrainingSession) {
    if (isFirstEverTraining) {
      setCompletingFirst(training);
    } else {
      await api.post(`/training/${training.id}/complete`);
      load();
    }
  }

  return (
    <View style={styles.container}>
      {activeTraining && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            {new Date(activeTraining.scheduledAt).toLocaleString()} {activeTraining.locationText ? `· ${activeTraining.locationText}` : ""}
          </Text>
          <View style={styles.bannerRow}>
            <Text style={styles.syncStatus}>
              {activeTraining.calendarSyncStatus === "synced" ? "📅 Synced" : activeTraining.calendarSyncStatus === "pending" ? "📅 Syncing…" : "📅 Sync failed"}
            </Text>
            <Pressable onPress={() => completeTapped(activeTraining)}>
              <Text style={styles.completeLink}>Complete</Text>
            </Pressable>
          </View>
        </View>
      )}

      <FlatList
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
        renderItem={({ item }) => <MessageBubble message={item} mine={item.senderId === profile?.id} />}
      />

      {chat?.isClosed ? (
        <View style={styles.closedBanner}>
          <Text style={styles.closedText}>This chat is closed to new messages.</Text>
        </View>
      ) : (
        <>
          <View style={styles.composerRow}>
            <TextInput style={styles.input} placeholder="Message" value={input} onChangeText={setInput} onSubmitEditing={send} />
            <Button label="Send" onPress={send} />
          </View>
          <View style={{ padding: spacing.md, paddingTop: 0 }}>
            <Button label="Schedule Event" variant="secondary" onPress={() => setSchedulerOpen(true)} />
          </View>
        </>
      )}

      <Modal visible={schedulerOpen} animationType="slide">
        <ScrollView style={styles.modalScreen} contentContainerStyle={styles.modalContainer}>
          <Text style={styles.modalTitle}>Schedule Event</Text>
          <AvailabilityPicker value={slots} onChange={setSlots} />
          <Button label="Confirm" onPress={scheduleEvent} />
          <Button label="Cancel" variant="outline" onPress={() => setSchedulerOpen(false)} />
        </ScrollView>
      </Modal>

      <Modal visible={Boolean(completingFirst)} animationType="slide" transparent>
        {completingFirst && (
          <FirstCompletionForm
            onSubmit={async (answers) => {
              await api.post(`/training/${completingFirst.id}/complete-first`, answers);
              setCompletingFirst(null);
              load();
            }}
            onCancel={() => setCompletingFirst(null)}
          />
        )}
      </Modal>
    </View>
  );
}

function MessageBubble({ message, mine }: { message: Message; mine: boolean }) {
  if (message.type === "system" && message.body.startsWith("Challenge:")) {
    return (
      <View style={styles.challengeCard}>
        <Text style={styles.challengeLabel}>🏆 Challenge</Text>
        <Text style={styles.challengeBody}>{message.body.replace("Challenge: ", "")}</Text>
      </View>
    );
  }
  return (
    <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
      <Text style={mine ? styles.bubbleTextMine : styles.bubbleText}>{message.body}</Text>
    </View>
  );
}

// F14: mutual first-event confirmation ("Did the session take place?" / "Would you play again?").
function FirstCompletionForm({ onSubmit, onCancel }: { onSubmit: (a: { didHappen: boolean; wouldPlayAgain: boolean; reasonIfNo?: string }) => void; onCancel: () => void }) {
  const [didHappen, setDidHappen] = useState<boolean | null>(null);
  const [wouldPlayAgain, setWouldPlayAgain] = useState<boolean | null>(null);
  const [reason, setReason] = useState("");

  return (
    <View style={styles.formOverlay}>
      <View style={styles.formCard}>
        <Text style={styles.modalTitle}>Did the session take place?</Text>
        <View style={styles.formRow}>
          <Button label="Yes" onPress={() => setDidHappen(true)} variant={didHappen === true ? "primary" : "outline"} />
          <Button label="No" onPress={() => setDidHappen(false)} variant={didHappen === false ? "primary" : "outline"} />
        </View>
        <Text style={styles.modalTitle}>Would you play with this person again?</Text>
        <View style={styles.formRow}>
          <Button label="Yes" onPress={() => setWouldPlayAgain(true)} variant={wouldPlayAgain === true ? "primary" : "outline"} />
          <Button label="No" onPress={() => setWouldPlayAgain(false)} variant={wouldPlayAgain === false ? "primary" : "outline"} />
        </View>
        {wouldPlayAgain === false && (
          <TextInput style={styles.input} placeholder="Reason (optional)" value={reason} onChangeText={setReason} />
        )}
        <Button
          label="Submit"
          disabled={didHappen === null || wouldPlayAgain === null}
          onPress={() => onSubmit({ didHappen: Boolean(didHappen), wouldPlayAgain: Boolean(wouldPlayAgain), reasonIfNo: reason || undefined })}
        />
        <Button label="Cancel" variant="outline" onPress={onCancel} />
      </View>
    </View>
  );
}

// Maps a day-of-week + "HH:mm" slot to the next real calendar date/time (UTC).
function nextDateForDayAndTime(dayOfWeek: number, startTime: string): Date {
  const [hours, minutes] = startTime.split(":").map(Number);
  const now = new Date();
  const result = new Date(now);
  const diff = (dayOfWeek - now.getUTCDay() + 7) % 7 || 7;
  result.setUTCDate(now.getUTCDate() + diff);
  result.setUTCHours(hours, minutes, 0, 0);
  return result;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.offWhite },
  banner: { backgroundColor: colors.sageLight, padding: spacing.sm, gap: spacing.xs },
  bannerText: { fontFamily: typography.fontFamily, color: colors.sageDark },
  bannerRow: { flexDirection: "row", justifyContent: "space-between" },
  syncStatus: { fontFamily: typography.fontFamilyRegular, fontSize: 12, color: colors.muted },
  completeLink: { fontFamily: typography.fontFamily, color: colors.coral },
  bubble: { maxWidth: "80%", padding: spacing.sm, borderRadius: radii.sm },
  bubbleMine: { backgroundColor: colors.coral, alignSelf: "flex-end" },
  bubbleTheirs: { backgroundColor: colors.white, alignSelf: "flex-start" },
  bubbleText: { fontFamily: typography.fontFamilyRegular, color: colors.charcoal },
  bubbleTextMine: { fontFamily: typography.fontFamilyRegular, color: colors.white },
  challengeCard: { borderWidth: 1.5, borderColor: colors.coral, borderRadius: radii.sm, padding: spacing.sm, backgroundColor: colors.white, alignSelf: "center" },
  challengeLabel: { fontFamily: typography.fontFamily, color: colors.coral, marginBottom: spacing.xs },
  challengeBody: { fontFamily: typography.fontFamilyRegular, color: colors.charcoal },
  composerRow: { flexDirection: "row", gap: spacing.sm, padding: spacing.md, alignItems: "center" },
  input: { flex: 1, backgroundColor: colors.white, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, minHeight: 44 },
  closedBanner: { padding: spacing.md, alignItems: "center" },
  closedText: { fontFamily: typography.fontFamilyRegular, color: colors.muted },
  modalScreen: { flex: 1, backgroundColor: colors.offWhite },
  modalContainer: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  modalTitle: { fontFamily: typography.fontFamilyBold, fontSize: 18, color: colors.charcoal },
  formOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  formCard: { backgroundColor: colors.white, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg, padding: spacing.lg, gap: spacing.md },
  formRow: { flexDirection: "row", gap: spacing.sm },
});
