import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, FlatList, TextInput, StyleSheet, Pressable, Alert, Modal } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { Socket } from "socket.io-client";
import { api } from "../../src/api/client";
import { getChatSocket } from "../../src/api/socket";
import { Button } from "../../src/components/Button";
import { Avatar } from "../../src/components/Avatar";
import { ScheduleEventSheet, type ScheduleEventValues } from "../../src/components/ScheduleEventSheet";
import { CompletionSheet, type CompletionAnswers } from "../../src/components/CompletionSheet";
import { Toast } from "../../src/components/Toast";
import type { DaySlot } from "../../src/components/WeeklyAvailabilityWidget";
import { colors, spacing, typography, radii } from "../../src/theme";
import { useAuth } from "../../src/hooks/useAuth";
import type { Message, ChatSummary, TrainingSession, PublicUser } from "../../src/api/types";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// F11 (real-time messaging + auto starters) + F12 (in-chat scheduler, sticky
// banner, calendar sync status) + F13 (challenge card render, delivered as a
// "system" message by the backend on Event creation) + F14/bug-fix-batch-2
// (post-completion flow: "did it happen?" / "would you play again?" for
// every Event, driving the banner's Scheduled -> Waiting -> Next-session /
// Closed states) + bug-fix-batch-2 (custom header with partner name+photo,
// grouped message avatars).
export default function ChatScreen() {
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const [chat, setChat] = useState<ChatSummary | null>(null);
  const [trainings, setTrainings] = useState<TrainingSession[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [partner, setPartner] = useState<PublicUser | null>(null);
  const [input, setInput] = useState("");
  const [schedulerOpen, setSchedulerOpen] = useState(false);
  const [editingTraining, setEditingTraining] = useState<TrainingSession | null>(null);
  const [scheduling, setScheduling] = useState(false);
  const [partnerSlots, setPartnerSlots] = useState<DaySlot[]>([]);
  const [completingTraining, setCompletingTraining] = useState<TrainingSession | null>(null);
  const [completing, setCompleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const socketRef = useRef<Socket | null>(null);

  const load = useCallback(async () => {
    const res = await api.get<{ chat: ChatSummary & { trainingSessions: TrainingSession[] }; messages: Message[] }>(`/chats/${chatId}`);
    setChat(res.chat);
    setTrainings(res.chat.trainingSessions ?? []);
    setMessages(res.messages);
    api.post(`/chats/${chatId}/read`);

    // Bug fix batch: header (name+photo) and the Schedule Event sheet's
    // "their availability" both need the other participant's public profile.
    const otherUserId = res.chat.userA.id === profile?.id ? res.chat.userB.id : res.chat.userA.id;
    if (otherUserId) {
      const other = await api.get<PublicUser>(`/users/${otherUserId}`);
      setPartner(other);
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

  function isHostOf(training: TrainingSession): boolean {
    return training.hostId === profile?.id;
  }

  const activeTraining = trainings.find((t) => t.status === "scheduled");
  const mostRecentCompleted = trainings.find((t) => t.status === "completed");
  const eventHasPassed = activeTraining ? new Date(activeTraining.scheduledAt).getTime() <= Date.now() : false;
  const myCompletedActive = activeTraining ? (isHostOf(activeTraining) ? activeTraining.completedByUserA : activeTraining.completedByUserB) : false;

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

  async function submitCompletion(answers: CompletionAnswers) {
    if (!completingTraining) return;
    setCompleting(true);
    try {
      await api.post(`/training/${completingTraining.id}/complete`, answers);
      setCompletingTraining(null);
      await load();
    } catch (err) {
      Alert.alert("Couldn't submit", (err as Error).message);
    } finally {
      setCompleting(false);
    }
  }

  function formatBannerDate(scheduledAt: string): string {
    const d = new Date(scheduledAt);
    return `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${d.toLocaleDateString([], { month: "short" })} · ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  }

  async function block() {
    if (!partner) return;
    setMenuOpen(false);
    await api.post(`/users/${partner.id}/block`);
    Alert.alert("Blocked", "You won't see this user again.");
    router.back();
  }

  async function submitReport() {
    if (!reportReason.trim() || !partner) return;
    await api.post(`/users/${partner.id}/report`, { reason: reportReason });
    setReportOpen(false);
    setReportReason("");
    Alert.alert("Reported", "Thank you — our team will review this.");
  }

  return (
    <View style={styles.container}>
      {/* Bug fix batch 2, Bug 2: custom header with the partner's name+photo
          instead of a generic "Chat" title. */}
      <View style={styles.header}>
        <Pressable accessibilityLabel="Back" style={styles.headerButton} onPress={() => router.back()}>
          <Text style={styles.headerBackIcon}>←</Text>
        </Pressable>
        <Avatar photoUrl={partner?.profile?.photoUrl} size={40} />
        <View style={styles.headerNameCol}>
          <Text style={styles.headerName} numberOfLines={1}>
            {partner?.profile?.displayName ?? "Sport Buddy user"}
          </Text>
          {chat && <Text style={styles.headerStatus}>{chat.activity.name}</Text>}
        </View>
        <Pressable accessibilityLabel="More" style={styles.headerButton} onPress={() => setMenuOpen(true)}>
          <Text style={styles.headerMenuIcon}>⋮</Text>
        </Pressable>
      </View>

      {/* Case: upcoming Event, not yet due — tap to edit. */}
      {activeTraining && !eventHasPassed && (
        <Pressable style={styles.banner} onPress={() => openEditScheduler(activeTraining)}>
          <View style={styles.bannerTopRow}>
            <Text style={styles.bannerSport}>🏅 {chat?.activity.name}</Text>
            <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>Scheduled</Text>
            </View>
          </View>
          <Text style={styles.bannerMeta}>
            {formatBannerDate(activeTraining.scheduledAt)}
            {activeTraining.locationText ? `  📍 ${activeTraining.locationText}` : ""}
          </Text>
        </Pressable>
      )}

      {/* Case: Event time has passed, this user hasn't completed it yet — the "Complete" button. */}
      {activeTraining && eventHasPassed && !myCompletedActive && (
        <View style={styles.banner}>
          <View style={styles.bannerTopRow}>
            <Text style={styles.bannerSport}>🏅 {chat?.activity.name}</Text>
            <Pressable style={styles.completeButton} onPress={() => setCompletingTraining(activeTraining)}>
              <Text style={styles.completeButtonLabel}>Complete</Text>
            </Pressable>
          </View>
          <Text style={styles.bannerMeta}>{formatBannerDate(activeTraining.scheduledAt)}</Text>
        </View>
      )}

      {/* Case C: this user already answered, waiting on the other side. */}
      {activeTraining && eventHasPassed && myCompletedActive && (
        <View style={[styles.banner, styles.bannerWaiting]}>
          <Text style={styles.bannerWaitingText}>Waiting for {partner?.profile?.displayName ?? "them"} to confirm…</Text>
        </View>
      )}

      {/* Case A: both said yes last time — prompt to schedule the next one. */}
      {!activeTraining && mostRecentCompleted && !chat?.isClosed && (
        <Pressable style={[styles.banner, styles.bannerNextSession]} onPress={openScheduler}>
          <Text style={styles.bannerNextSessionText}>📅 Schedule your next session</Text>
        </Pressable>
      )}

      {/* Case B: chat closed — someone said no. */}
      {!activeTraining && mostRecentCompleted && chat?.isClosed && (
        <View style={[styles.banner, styles.bannerClosed]}>
          <Text style={styles.bannerClosedText}>Session completed</Text>
        </View>
      )}

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
              avatarUri={item.senderId === profile?.id ? profile?.profile?.photoUrl : partner?.profile?.photoUrl}
            />
          );
        }}
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

      <CompletionSheet
        visible={Boolean(completingTraining)}
        onClose={() => setCompletingTraining(null)}
        onSubmit={submitCompletion}
        submitting={completing}
      />

      <Toast message={toastMessage} onHide={() => setToastMessage(null)} />

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setMenuOpen(false)}>
          <View style={styles.menu}>
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setMenuOpen(false);
                setReportOpen(true);
              }}
            >
              <Text style={styles.menuItemLabel}>Report user</Text>
            </Pressable>
            <Pressable style={styles.menuItem} onPress={block}>
              <Text style={[styles.menuItemLabel, { color: colors.error }]}>Block user</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={reportOpen} transparent animationType="slide" onRequestClose={() => setReportOpen(false)}>
        <View style={styles.menuBackdrop}>
          <View style={styles.reportSheet}>
            <Text style={styles.sectionLabel}>Why are you reporting this user?</Text>
            <TextInput style={styles.reportInput} placeholder="Describe the issue" value={reportReason} onChangeText={setReportReason} multiline />
            <Button label="Submit report" onPress={submitReport} disabled={!reportReason.trim()} />
            <Button label="Cancel" variant="outline" onPress={() => setReportOpen(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Bug fix batch 2, Bug 3: avatar attached to the last message of a
// consecutive run from the same sender, asymmetric bubble corners, and a
// timestamp below the bubble. System messages ("This chat has been closed.",
// challenge cards) render as centered pills with no avatar.
function MessageBubble({ message, mine, showAvatar, avatarUri }: { message: Message; mine: boolean; showAvatar: boolean; avatarUri?: string | null }) {
  if (message.type === "system") {
    if (message.body.startsWith("Challenge:")) {
      return (
        <View style={styles.challengeCard}>
          <Text style={styles.challengeLabel}>🏆 Challenge</Text>
          <Text style={styles.challengeBody}>{message.body.replace("Challenge: ", "")}</Text>
        </View>
      );
    }
    return (
      <View style={styles.systemPill}>
        <Text style={styles.systemPillText}>{message.body}</Text>
      </View>
    );
  }

  const time = new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <View style={[styles.messageRow, mine ? styles.messageRowMine : styles.messageRowTheirs]}>
      {!mine && <View style={styles.avatarSlot}>{showAvatar && <Avatar photoUrl={avatarUri} size={28} />}</View>}
      <View style={mine ? styles.bubbleColMine : styles.bubbleColTheirs}>
        <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
          <Text style={mine ? styles.bubbleTextMine : styles.bubbleText}>{message.body}</Text>
        </View>
        <Text style={[styles.timestamp, mine ? styles.timestampMine : styles.timestampTheirs]}>{time}</Text>
      </View>
      {mine && <View style={styles.avatarSlot}>{showAvatar && <Avatar photoUrl={avatarUri} size={28} />}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.offWhite },
  header: { flexDirection: "row", alignItems: "center", height: 64, paddingHorizontal: spacing.xs, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing.xs },
  headerButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerBackIcon: { fontSize: 20, color: colors.charcoal },
  headerMenuIcon: { fontSize: 20, color: colors.charcoal },
  headerNameCol: { flex: 1, justifyContent: "center" },
  headerName: { fontFamily: typography.fontFamilyBold, fontSize: 16, color: colors.charcoal },
  headerStatus: { fontFamily: typography.fontFamilyRegular, fontSize: 12, color: colors.muted, marginTop: 2 },
  banner: { minHeight: 56, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.white, gap: spacing.xs, justifyContent: "center" },
  bannerTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  bannerSport: { fontFamily: typography.fontFamilyBold, fontSize: 14, color: colors.charcoal },
  bannerMeta: { fontFamily: typography.fontFamilyRegular, fontSize: 13, color: colors.muted },
  statusPill: { backgroundColor: colors.sageLight, height: 22, paddingHorizontal: 8, borderRadius: 11, justifyContent: "center" },
  statusPillText: { fontFamily: typography.fontFamily, fontSize: 12, color: colors.sageDark },
  completeButton: { height: 28, paddingHorizontal: 12, borderRadius: 14, backgroundColor: colors.coral, justifyContent: "center" },
  completeButtonLabel: { fontFamily: typography.fontFamilyBold, fontSize: 12, color: colors.white },
  bannerWaiting: { backgroundColor: "#F8FAFC", alignItems: "center" },
  bannerWaitingText: { fontFamily: typography.fontFamilyRegular, fontSize: 14, color: colors.muted, textAlign: "center" },
  bannerNextSession: { backgroundColor: "#F0FDF4", alignItems: "center", height: 52, minHeight: 52 },
  bannerNextSessionText: { fontFamily: typography.fontFamilyBold, fontSize: 14, color: colors.sageDark },
  bannerClosed: { backgroundColor: "#F8FAFC", alignItems: "center" },
  bannerClosedText: { fontFamily: typography.fontFamilyRegular, fontSize: 14, color: colors.muted },
  messageRow: { flexDirection: "row", alignItems: "flex-end", gap: spacing.xs },
  messageRowMine: { justifyContent: "flex-end" },
  messageRowTheirs: { justifyContent: "flex-start" },
  avatarSlot: { width: 28, height: 28 },
  bubbleColMine: { alignItems: "flex-end", maxWidth: "75%" },
  bubbleColTheirs: { alignItems: "flex-start", maxWidth: "75%" },
  bubble: { paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMine: { backgroundColor: colors.coral, borderRadius: 16, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 16, borderBottomLeftRadius: 4 },
  bubbleText: { fontFamily: typography.fontFamilyRegular, color: colors.charcoal, fontSize: 15, lineHeight: 22 },
  bubbleTextMine: { fontFamily: typography.fontFamilyRegular, color: colors.white, fontSize: 15, lineHeight: 22 },
  timestamp: { fontFamily: typography.fontFamilyRegular, fontSize: 11, color: colors.muted, marginTop: 2 },
  timestampMine: { textAlign: "right" },
  timestampTheirs: { textAlign: "left" },
  systemPill: { alignSelf: "center", backgroundColor: "#F1F5F9", borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8, marginVertical: spacing.xs },
  systemPillText: { fontFamily: typography.fontFamilyRegular, fontSize: 13, color: colors.muted, fontStyle: "italic", textAlign: "center" },
  challengeCard: { borderWidth: 1.5, borderColor: colors.coral, borderRadius: radii.sm, padding: spacing.sm, backgroundColor: colors.white, alignSelf: "center" },
  challengeLabel: { fontFamily: typography.fontFamily, color: colors.coral, marginBottom: spacing.xs },
  challengeBody: { fontFamily: typography.fontFamilyRegular, color: colors.charcoal },
  composerRow: { flexDirection: "row", gap: spacing.sm, padding: spacing.md, alignItems: "center" },
  input: { flex: 1, backgroundColor: colors.white, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, minHeight: 44 },
  closedBanner: { padding: spacing.md, alignItems: "center" },
  closedText: { fontFamily: typography.fontFamilyRegular, color: colors.muted },
  menuBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "flex-end" },
  menu: { backgroundColor: colors.white, borderRadius: radii.sm, margin: spacing.lg, overflow: "hidden" },
  menuItem: { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  menuItemLabel: { fontFamily: typography.fontFamily, fontSize: 15, color: colors.charcoal },
  sectionLabel: { fontFamily: typography.fontFamilyBold, fontSize: 12, color: colors.muted, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: spacing.sm },
  reportSheet: { backgroundColor: colors.white, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg, padding: spacing.lg, gap: spacing.md },
  reportInput: { minHeight: 90, borderWidth: 1, borderColor: colors.border, borderRadius: radii.sm, padding: spacing.md, fontFamily: typography.fontFamilyRegular, textAlignVertical: "top" },
});
