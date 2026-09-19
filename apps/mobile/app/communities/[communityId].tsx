import { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, Alert, Modal, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, uploadPhoto } from "../../src/api/client";
import { useAuth } from "../../src/hooks/useAuth";
import { Avatar } from "../../src/components/Avatar";
import { ActivityIcon } from "../../src/components/icons/ActivityIcon";
import { CreateClubEventSheet, type ClubEventValues } from "../../src/components/CreateClubEventSheet";
import { PostComposerSheet } from "../../src/components/PostComposerSheet";
import { Toast } from "../../src/components/Toast";
import { colors, spacing, typography, radii } from "../../src/theme";
import type { CommunitySummary, ClubEvent, CommunityMemberRow, CommunityJoinRequest, CommunityPost } from "../../src/api/types";

type Tab = "events" | "members" | "feed";

// Communities — Community Detail: hero + Join/Manage action + three tabs
// (Events / Members / Feed) switched by tap (no navigation, same screen).
export default function CommunityDetailScreen() {
  const { communityId } = useLocalSearchParams<{ communityId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const [community, setCommunity] = useState<CommunitySummary | null>(null);
  const [tab, setTab] = useState<Tab>("events");
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [joining, setJoining] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [members, setMembers] = useState<CommunityMemberRow[]>([]);
  const [joinRequests, setJoinRequests] = useState<CommunityJoinRequest[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);

  const [eventSheetOpen, setEventSheetOpen] = useState(false);
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [postSheetOpen, setPostSheetOpen] = useState(false);
  const [creatingPost, setCreatingPost] = useState(false);

  const loadCommunity = useCallback(() => {
    api.get<CommunitySummary>(`/communities/${communityId}`).then(setCommunity);
  }, [communityId]);

  useFocusEffect(loadCommunity);

  useEffect(() => {
    api.get<ClubEvent[]>(`/communities/${communityId}/events`).then(setEvents);
    api.get<CommunityMemberRow[]>(`/communities/${communityId}/members`).then(setMembers);
    api.get<CommunityPost[]>(`/communities/${communityId}/posts`).then(setPosts);
  }, [communityId]);

  useEffect(() => {
    if (community?.myRole === "organiser") {
      api.get<CommunityJoinRequest[]>(`/communities/${communityId}/join-requests`).then(setJoinRequests);
    }
  }, [communityId, community?.myRole]);

  if (!community) return <ActivityIndicator style={{ marginTop: spacing.xl }} />;

  const canManage = community.myRole === "organiser" || community.myRole === "assistant";

  async function join() {
    setJoining(true);
    try {
      await api.post(`/communities/${communityId}/join`);
      loadCommunity();
    } catch (err) {
      Alert.alert("Couldn't send join request", (err as Error).message);
    } finally {
      setJoining(false);
    }
  }

  async function leave() {
    setMenuOpen(false);
    await api.post(`/communities/${communityId}/leave`);
    router.back();
  }

  async function submitEvent(values: ClubEventValues) {
    setCreatingEvent(true);
    const scheduledAt = new Date(values.date);
    scheduledAt.setHours(values.time.getHours(), values.time.getMinutes(), 0, 0);
    try {
      await api.post(`/communities/${communityId}/events`, {
        title: values.title,
        scheduledAt: scheduledAt.toISOString(),
        locationText: values.locationText || undefined,
        isRecurring: values.isRecurring,
        recurrenceRule: values.recurrenceRule ?? undefined,
        maxParticipants: values.maxParticipants ?? undefined,
      });
      setEventSheetOpen(false);
      setToastMessage("Event created!");
      api.get<ClubEvent[]>(`/communities/${communityId}/events`).then(setEvents);
    } catch (err) {
      Alert.alert("Couldn't create event", (err as Error).message);
    } finally {
      setCreatingEvent(false);
    }
  }

  async function rsvp(eventId: string, status: "going" | "not_going") {
    await api.post(`/communities/events/${eventId}/rsvp`, { status });
    api.get<ClubEvent[]>(`/communities/${communityId}/events`).then(setEvents);
  }

  async function submitPost(values: { body: string; isPinned: boolean }) {
    setCreatingPost(true);
    try {
      await api.post(`/communities/${communityId}/posts`, values);
      setPostSheetOpen(false);
      api.get<CommunityPost[]>(`/communities/${communityId}/posts`).then(setPosts);
    } catch (err) {
      Alert.alert("Couldn't post", (err as Error).message);
    } finally {
      setCreatingPost(false);
    }
  }

  async function togglePin(postId: string) {
    await api.post(`/communities/posts/${postId}/pin`);
    api.get<CommunityPost[]>(`/communities/${communityId}/posts`).then(setPosts);
  }

  async function deletePost(postId: string) {
    await api.delete<{ ok: boolean }>(`/communities/posts/${postId}`);
    api.get<CommunityPost[]>(`/communities/${communityId}/posts`).then(setPosts);
  }

  async function approveJoin(requestId: string) {
    await api.post(`/communities/${communityId}/join-requests/${requestId}/approve`);
    api.get<CommunityJoinRequest[]>(`/communities/${communityId}/join-requests`).then(setJoinRequests);
    api.get<CommunityMemberRow[]>(`/communities/${communityId}/members`).then(setMembers);
    loadCommunity();
  }

  async function declineJoin(requestId: string) {
    await api.post(`/communities/${communityId}/join-requests/${requestId}/decline`);
    api.get<CommunityJoinRequest[]>(`/communities/${communityId}/join-requests`).then(setJoinRequests);
  }

  async function setRole(userId: string, role: "assistant" | "member") {
    await api.post(`/communities/${communityId}/members/${userId}/role`, { role });
    api.get<CommunityMemberRow[]>(`/communities/${communityId}/members`).then(setMembers);
  }

  async function removeMember(userId: string) {
    await api.delete<{ ok: boolean }>(`/communities/${communityId}/members/${userId}`);
    api.get<CommunityMemberRow[]>(`/communities/${communityId}/members`).then(setMembers);
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top, height: 56 + insets.top }]}>
        <Pressable accessibilityLabel="Back" style={styles.headerButton} onPress={() => router.back()}>
          <Text style={styles.headerIcon}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {community.name}
        </Text>
        <View style={{ flexDirection: "row" }}>
          <Pressable accessibilityLabel="Chat" style={styles.headerButton} onPress={() => router.push(`/communities/${communityId}/chat`)}>
            <Text style={styles.headerIcon}>💬</Text>
          </Pressable>
          <Pressable accessibilityLabel="More" style={styles.headerButton} onPress={() => setMenuOpen(true)}>
            <Text style={styles.headerIcon}>⋮</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.heroPhoto}>
            <ActivityIcon name={community.activity.name} size={32} />
          </View>
          <Text style={styles.heroName}>{community.name}</Text>
          <View style={styles.sportBadge}>
            <Text style={styles.sportBadgeText}>{community.activity.name}</Text>
          </View>
          <Text style={styles.memberCount}>{community.memberCount} members</Text>
          {community.description && (
            <Text style={styles.description} numberOfLines={descriptionExpanded ? undefined : 3} onPress={() => setDescriptionExpanded((e) => !e)}>
              {community.description}
            </Text>
          )}

          {community.myRole === "organiser" ? (
            <Pressable style={styles.actionButton} onPress={() => setTab("members")}>
              <Text style={styles.actionButtonLabel}>Manage</Text>
            </Pressable>
          ) : community.myRole ? null : community.joinRequestPending ? (
            <View style={[styles.actionButton, styles.actionButtonPending]}>
              <Text style={styles.actionButtonLabelPending}>Request Sent</Text>
            </View>
          ) : (
            <Pressable style={styles.actionButton} onPress={join} disabled={joining}>
              <Text style={styles.actionButtonLabel}>{joining ? "Sending…" : "Join Community"}</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.tabBar}>
          {(["events", "members", "feed"] as Tab[]).map((t) => (
            <Pressable key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
              <Text style={[styles.tabLabel, tab === t && styles.tabLabelActive]}>{t === "events" ? "Events" : t === "members" ? "Members" : "Feed"}</Text>
            </Pressable>
          ))}
        </View>

        {tab === "events" && (
          <View style={styles.tabContent}>
            {canManage && (
              <Pressable style={styles.createButton} onPress={() => setEventSheetOpen(true)}>
                <Text style={styles.createButtonLabel}>+ Create Event</Text>
              </Pressable>
            )}
            {events.length === 0 ? (
              <Text style={styles.emptyText}>No events yet. Check back soon.</Text>
            ) : (
              events.map((event) => {
                const myRsvp = event.rsvps.find((r) => r.userId === profile?.id);
                const going = myRsvp?.status === "going";
                const d = new Date(event.scheduledAt);
                return (
                  <View key={event.id} style={styles.eventCard}>
                    <Text style={styles.eventTitle}>{event.title}</Text>
                    {event.isRecurring && (
                      <View style={styles.recurringPill}>
                        <Text style={styles.recurringPillText}>↻ Recurring</Text>
                      </View>
                    )}
                    <Text style={styles.eventMeta}>
                      🗓 {d.toDateString()} · {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </Text>
                    {event.locationText && <Text style={styles.eventMeta}>📍 {event.locationText}</Text>}
                    <Text style={styles.attendeesText}>{event.rsvps.length} going</Text>
                    <View style={styles.rsvpRow}>
                      <Pressable style={[styles.rsvpButton, going && styles.rsvpButtonGoing]} onPress={() => rsvp(event.id, "going")}>
                        <Text style={[styles.rsvpButtonLabel, going && styles.rsvpButtonLabelGoing]}>Going ✓</Text>
                      </Pressable>
                      <Pressable style={[styles.rsvpButton, !going && styles.rsvpButtonNotGoing]} onPress={() => rsvp(event.id, "not_going")}>
                        <Text style={styles.rsvpButtonLabel}>Not going</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {tab === "members" && (
          <View style={styles.tabContent}>
            {community.myRole === "organiser" && joinRequests.length > 0 && (
              <View style={{ marginBottom: spacing.md }}>
                <Text style={styles.membersHeader}>Join Requests ({joinRequests.length})</Text>
                {joinRequests.map((r) => (
                  <View key={r.id} style={styles.joinRequestRow}>
                    <Avatar photoUrl={r.requester.profile?.photoUrl} size={36} />
                    <Text style={styles.memberName}>{r.requester.profile?.displayName}</Text>
                    <Pressable style={styles.approveButton} onPress={() => approveJoin(r.id)}>
                      <Text style={styles.approveButtonLabel}>Approve</Text>
                    </Pressable>
                    <Pressable style={styles.declineButton} onPress={() => declineJoin(r.id)}>
                      <Text style={styles.declineButtonLabel}>Decline</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
            <Text style={styles.membersHeader}>{members.length} members</Text>
            {members.map((m) => (
              <View key={m.userId} style={styles.memberRow}>
                <Avatar photoUrl={m.user.profile?.photoUrl} size={40} />
                <Text style={styles.memberName}>{m.user.profile?.displayName}</Text>
                {m.role !== "member" && (
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleBadgeText}>{m.role === "organiser" ? "Organiser" : "Assistant"}</Text>
                  </View>
                )}
                <Text style={styles.memberEvents}>{m.user.profile?.completedTrainingsCount ?? 0} events</Text>
                {community.myRole === "organiser" && m.role !== "organiser" && (
                  <Pressable
                    style={styles.memberMenuButton}
                    onPress={() =>
                      Alert.alert(m.user.profile?.displayName ?? "Member", undefined, [
                        {
                          text: m.role === "assistant" ? "Remove assistant" : "Make assistant",
                          onPress: () => setRole(m.userId, m.role === "assistant" ? "member" : "assistant"),
                        },
                        { text: "Remove from community", style: "destructive", onPress: () => removeMember(m.userId) },
                        { text: "Cancel", style: "cancel" },
                      ])
                    }
                  >
                    <Text style={styles.memberMenuIcon}>⋮</Text>
                  </Pressable>
                )}
              </View>
            ))}
          </View>
        )}

        {tab === "feed" && (
          <View style={styles.tabContent}>
            {canManage && (
              <Pressable style={styles.createButton} onPress={() => setPostSheetOpen(true)}>
                <Text style={styles.createButtonLabel}>+ Post</Text>
              </Pressable>
            )}
            {posts.length === 0 ? (
              <Text style={styles.emptyText}>No posts yet.</Text>
            ) : (
              posts.map((post) => (
                <View key={post.id} style={styles.postCard}>
                  <View style={styles.postHeader}>
                    <Avatar photoUrl={post.author.profile?.photoUrl} size={36} />
                    <Text style={styles.postAuthor}>{post.author.profile?.displayName}</Text>
                    <Text style={styles.postTimestamp}>{new Date(post.createdAt).toLocaleDateString()}</Text>
                  </View>
                  {post.isPinned && <Text style={styles.pinnedLabel}>📌 Pinned</Text>}
                  <Text style={styles.postBody}>{post.body}</Text>
                  {canManage && (
                    <Pressable
                      style={styles.memberMenuButton}
                      onPress={() =>
                        Alert.alert("Post options", undefined, [
                          { text: post.isPinned ? "Unpin" : "Pin post", onPress: () => togglePin(post.id) },
                          { text: "Delete", style: "destructive", onPress: () => deletePost(post.id) },
                          { text: "Cancel", style: "cancel" },
                        ])
                      }
                    >
                      <Text style={styles.memberMenuIcon}>⋮</Text>
                    </Pressable>
                  )}
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      <CreateClubEventSheet visible={eventSheetOpen} onClose={() => setEventSheetOpen(false)} onSubmit={submitEvent} submitting={creatingEvent} />
      <PostComposerSheet visible={postSheetOpen} onClose={() => setPostSheetOpen(false)} onSubmit={submitPost} submitting={creatingPost} />
      <Toast message={toastMessage} onHide={() => setToastMessage(null)} />

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setMenuOpen(false)}>
          <View style={styles.menu}>
            {community.myRole === "organiser" ? (
              <>
                <Pressable style={styles.menuItem} onPress={() => { setMenuOpen(false); router.push(`/communities/${communityId}/edit`); }}>
                  <Text style={styles.menuItemLabel}>Edit community</Text>
                </Pressable>
                <Pressable style={styles.menuItem} onPress={() => { setMenuOpen(false); setTab("members"); }}>
                  <Text style={styles.menuItemLabel}>Manage members</Text>
                </Pressable>
              </>
            ) : (
              <Pressable style={styles.menuItem} onPress={leave}>
                <Text style={[styles.menuItemLabel, { color: colors.error }]}>Leave community</Text>
              </Pressable>
            )}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.offWhite },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.sm, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerIcon: { fontSize: 18, color: colors.charcoal },
  headerTitle: { flex: 1, fontFamily: typography.fontFamilyBold, fontSize: 17, color: colors.charcoal, textAlign: "center" },
  content: { paddingBottom: 80 },
  hero: { alignItems: "center", paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  heroPhoto: { width: 80, height: 80, borderRadius: 16, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  heroName: { fontFamily: typography.fontFamilyBold, fontSize: 20, color: colors.charcoal, marginTop: spacing.sm, textAlign: "center" },
  sportBadge: { backgroundColor: colors.coral, height: 24, paddingHorizontal: 10, borderRadius: 12, justifyContent: "center", marginTop: 6 },
  sportBadgeText: { fontFamily: typography.fontFamily, fontSize: 12, color: colors.white },
  memberCount: { fontFamily: typography.fontFamilyRegular, fontSize: 14, color: colors.muted, marginTop: 4 },
  description: { fontFamily: typography.fontFamilyRegular, fontSize: 14, color: colors.muted, textAlign: "center", marginTop: spacing.sm, lineHeight: 20 },
  actionButton: { height: 44, paddingHorizontal: 24, borderRadius: 22, backgroundColor: colors.coral, alignItems: "center", justifyContent: "center", marginTop: spacing.md },
  actionButtonLabel: { fontFamily: typography.fontFamilyBold, fontSize: 15, color: colors.white },
  actionButtonPending: { backgroundColor: colors.border },
  actionButtonLabelPending: { fontFamily: typography.fontFamilyRegular, fontSize: 15, color: colors.muted },
  tabBar: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.border, marginTop: spacing.lg },
  tab: { flex: 1, alignItems: "center", paddingVertical: spacing.sm, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabActive: { borderBottomColor: colors.coral },
  tabLabel: { fontFamily: typography.fontFamilyRegular, fontSize: 14, color: colors.muted },
  tabLabelActive: { fontFamily: typography.fontFamilyBold, color: colors.coral },
  tabContent: { padding: spacing.lg },
  createButton: { alignSelf: "flex-end", height: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: colors.coral, alignItems: "center", justifyContent: "center", marginBottom: spacing.sm },
  createButtonLabel: { fontFamily: typography.fontFamilyBold, fontSize: 13, color: colors.white },
  emptyText: { fontFamily: typography.fontFamilyRegular, fontSize: 14, color: colors.muted, textAlign: "center", marginTop: spacing.lg },
  eventCard: { borderRadius: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginTop: spacing.sm },
  eventTitle: { fontFamily: typography.fontFamilyBold, fontSize: 15, color: colors.charcoal },
  recurringPill: { alignSelf: "flex-start", backgroundColor: "#F1F5F9", height: 20, paddingHorizontal: 8, borderRadius: 10, justifyContent: "center", marginTop: 4 },
  recurringPillText: { fontFamily: typography.fontFamilyRegular, fontSize: 12, color: colors.muted },
  eventMeta: { fontFamily: typography.fontFamilyRegular, fontSize: 13, color: colors.muted, marginTop: 4 },
  attendeesText: { fontFamily: typography.fontFamilyRegular, fontSize: 13, color: colors.muted, marginTop: spacing.sm },
  rsvpRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  rsvpButton: { height: 32, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, justifyContent: "center" },
  rsvpButtonGoing: { backgroundColor: colors.sageDark, borderColor: colors.sageDark },
  rsvpButtonNotGoing: { borderColor: colors.border },
  rsvpButtonLabel: { fontFamily: typography.fontFamily, fontSize: 12, color: colors.charcoal },
  rsvpButtonLabelGoing: { color: colors.white },
  membersHeader: { fontFamily: typography.fontFamilyBold, fontSize: 14, color: colors.charcoal, marginBottom: spacing.sm },
  joinRequestRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.sm },
  approveButton: { height: 32, paddingHorizontal: 12, borderRadius: 16, backgroundColor: colors.coral, alignItems: "center", justifyContent: "center" },
  approveButtonLabel: { fontFamily: typography.fontFamily, fontSize: 12, color: colors.white },
  declineButton: { height: 32, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  declineButtonLabel: { fontFamily: typography.fontFamily, fontSize: 12, color: colors.charcoal },
  memberRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, height: 56, borderBottomWidth: 1, borderBottomColor: colors.border },
  memberName: { flex: 1, fontFamily: typography.fontFamilyRegular, fontSize: 15, color: colors.charcoal },
  roleBadge: { backgroundColor: "#F1F5F9", height: 22, paddingHorizontal: 8, borderRadius: 11, justifyContent: "center" },
  roleBadgeText: { fontFamily: typography.fontFamilyRegular, fontSize: 12, color: colors.muted },
  memberEvents: { fontFamily: typography.fontFamilyRegular, fontSize: 13, color: colors.muted, marginLeft: spacing.sm },
  memberMenuButton: { width: 32, height: 32, alignItems: "center", justifyContent: "center", marginLeft: spacing.xs },
  memberMenuIcon: { fontSize: 16, color: colors.muted },
  postCard: { borderRadius: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginTop: spacing.sm },
  postHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  postAuthor: { flex: 1, fontFamily: typography.fontFamilyBold, fontSize: 14, color: colors.charcoal },
  postTimestamp: { fontFamily: typography.fontFamilyRegular, fontSize: 12, color: colors.muted },
  pinnedLabel: { fontFamily: typography.fontFamilyRegular, fontSize: 12, color: colors.muted, marginTop: spacing.xs },
  postBody: { fontFamily: typography.fontFamilyRegular, fontSize: 15, color: colors.charcoal, lineHeight: 22, marginTop: spacing.sm },
  menuBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "flex-end" },
  menu: { backgroundColor: colors.white, borderRadius: radii.sm, margin: spacing.lg, overflow: "hidden" },
  menuItem: { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  menuItemLabel: { fontFamily: typography.fontFamily, fontSize: 15, color: colors.charcoal },
});
