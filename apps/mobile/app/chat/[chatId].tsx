import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, FlatList, TextInput, StyleSheet, Pressable, Alert, Modal } from "react-native";
import { useLocalSearchParams } from "expo-router";
import type { Socket } from "socket.io-client";
import { api } from "../../src/api/client";
import { getChatSocket } from "../../src/api/socket";
import { Button } from "../../src/components/Button";
import { ScheduleEventSheet, type ScheduleEventValues } from "../../src/components/ScheduleEventSheet";
import { Toast } from "../../src/components/Toast";
import type { DaySlot } from "../../src/components/WeeklyAvailabilityWidget";
import { colors, spacing, typography, radii } from "../../src/theme";
import { useAuth } from "../../src/hooks/useAuth";
import type { Message, ChatSummary, TrainingSession, PublicUser } from "../../src/api/types";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
  const [editingTraining, setEditingTraining] = useState<TrainingSession | null>(null);
  const [scheduling, setScheduling] = useState(false);
  const [partnerSlots, setPartnerSlots] = useState<DaySlot[]>([]);
  const [completingFirst, setCompletingFirst] = useState<TrainingSession | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const load = useCallback(async () => {
    const res = await api.get<{ chat: ChatSummary & { trainingSessions: TrainingSession[] }; messages: Message[] }>(`/chats/${chatId}`);
    setChat(res.chat);
    setTrainings(res.chat.trainingSessions ?? []);
    setMessages(res.messages);
    api.post(`/chats/${chatId}/read`);

    // Bug fix batch: the Schedule Event sheet shows the OTHER participant's
    // availability for this chat's sport, per section 4 of the spec.
    const otherUserId = res.chat.userA.id === profile?.id ? res.chat.userB.id : res.chat.userA.id;
    if (otherUserId) {
      const other = await api.get<PublicUser>(`/users/${otherUserId}`);
      setPartnerSlots(
        other.availability
          .filter((s) => s.dayOfWeek !== undefined && s.activityId === res.chat.activity.id)
          .map((s) => ({ dayOfWeek: s.dayOfWeek!, startTime: s.startTime, endTime: s.endTime }))
      );
    }
  }, [chatId, profile?.id]);

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

  const activeTraining = trainings.find((t) => t.status === "scheduled");
  const isFirstEverTraining = trainings.length <= 1;

  function openScheduler() {
    setEditingTraining(null);
    setSchedulerOpen(true);
  }

  function openEditScheduler(training: TrainingSession) {
    setEditingTraining(training);
    setSchedulerOpen(true);
  }

  async function submitSchedule(values: ScheduleEventValues) {
    if (!chat) return;
    setScheduling(true);
    const scheduledAt = new Date(values.date);
    scheduledAt.setHours(values.time.getHours(), values.time.getMinutes(), 0, 0);
    try {
      if (editingTraining) {
        await api.patch(`/training/${editingTraining.id}`, {
          scheduledAt: scheduledAt.toISOString(),
          locationText: values.locationText || undefined,
        });
      } else {
        await api.post("/training", {
          chatId,
          activityId: chat.activity.id,
          scheduledAt: scheduledAt.toISOString(),
          locationText: values.locationText || undefined,
        });
      }
      setSchedulerOpen(false);
      setEditingTraining(null);
      setToastMessage("Event scheduled! ✓");
      await load();
    } catch (err) {
      Alert.alert("Couldn't schedule event", (err as Error).message);
    } finally {
      setScheduling(false);
    }
  }

  async function completeTapped(training: TrainingSession) {
    if (isFirstEverTraining) {
      setCompletingFirst(training);
    } else {
      await api.post(`/training/${training.id}/complete`);
      load();
    }
  }

  function formatBannerDate(scheduledAt: string): string {
    const d = new Date(scheduledAt);
    return `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${d.toLocaleDateString([], { month: "short" })} · ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  }

  return (
    <View style={styles.container}>
      {activeTraining && (
        <Pressable style={styles.banner} onPress={() => openEditScheduler(activeTraining)}>
          <View style={styles.bannerTopRow}>
            <Text style={styles.bannerSport}>🏅 {chat?.activity.name}</Text>
            <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>Scheduled</Text>
            </View>
          </View>
          <View style={styles.bannerBottomRow}>
            <Text style={styles.bannerMeta}>
              {formatBannerDate(activeTraining.scheduledAt)}
              {activeTraining.locationText ? `  📍 ${activeTraining.locationText}` : ""}
            </Text>
            <Pressable onPress={() => completeTapped(activeTraining)}>
              <Text style={styles.completeLink}>Complete</Text>
            </Pressable>
          </View>
        </Pressable>
      )}
      {!activeTraining && trainings.some((t) => t.status === "completed") && (
        <View style={[styles.banner, styles.bannerCompleted]}>
          <View style={styles.bannerTopRow}>
            <Text style={styles.bannerSport}>🏅 {chat?.activity.name}</Text>
            <View style={[styles.statusPill, styles.statusPillCompleted]}>
              <Text style={styles.statusPillText}>Completed ✓</Text>
            </View>
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
            <Button label="Schedule Event" variant="secondary" onPress={openScheduler} />
          </View>
        </>
      )}

      <ScheduleEventSheet
        visible={schedulerOpen}
        onClose={() => {
          setSchedulerOpen(false);
          setEditingTraining(null);
        }}
        onSubmit={submitSchedule}
        submitting={scheduling}
        partnerSlots={partnerSlots}
        initial={editingTraining ? { scheduledAt: editingTraining.scheduledAt, locationText: editingTraining.locationText } : null}
      />

      <Toast message={toastMessage} onHide={() => setToastMessage(null)} />

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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.offWhite },
  banner: { minHeight: 56, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.white, gap: spacing.xs, justifyContent: "center" },
  bannerCompleted: { opacity: 0.9 },
  bannerTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  bannerSport: { fontFamily: typography.fontFamilyBold, fontSize: 14, color: colors.charcoal },
  bannerBottomRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  bannerMeta: { fontFamily: typography.fontFamilyRegular, fontSize: 13, color: colors.muted, flex: 1 },
  statusPill: { backgroundColor: colors.sageLight, height: 22, paddingHorizontal: 8, borderRadius: 11, justifyContent: "center" },
  statusPillCompleted: { backgroundColor: colors.sageLight },
  statusPillText: { fontFamily: typography.fontFamily, fontSize: 12, color: colors.sageDark },
  completeLink: { fontFamily: typography.fontFamily, fontSize: 13, color: colors.coral },
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
  modalTitle: { fontFamily: typography.fontFamilyBold, fontSize: 18, color: colors.charcoal },
  formOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  formCard: { backgroundColor: colors.white, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg, padding: spacing.lg, gap: spacing.md },
  formRow: { flexDirection: "row", gap: spacing.sm },
});
