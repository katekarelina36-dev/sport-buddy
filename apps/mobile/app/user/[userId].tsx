import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator, Alert, Modal, TextInput } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { api } from "../../src/api/client";
import { Card } from "../../src/components/Card";
import { Badge } from "../../src/components/Badge";
import { Button } from "../../src/components/Button";
import { Avatar } from "../../src/components/Avatar";
import { colors, spacing, typography, radii } from "../../src/theme";
import { calculateAge } from "../../src/utils/age";
import type { PublicUser } from "../../src/api/types";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// F4: full public profile detail, reached by tapping a card in F3. Shows all
// sports the user has set availability for, plus communities and a safety
// menu (report/block).
export default function UserProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [sending, setSending] = useState(false);
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    api.get<PublicUser>(`/users/${userId}`).then((u) => {
      setUser(u);
      if (u.alreadyRequested) setRequested(true);
    });
  }, [userId]);

  if (!user) return <ActivityIndicator style={{ marginTop: spacing.xl }} />;

  const age = user.profile?.dateOfBirth ? calculateAge(user.profile.dateOfBirth) : null;
  const sportsWithAvailability = user.activities.filter((a) => user.availability.some((slot) => slot.dayOfWeek !== undefined));

  async function sendRequest() {
    const primaryActivity = user!.activities[0];
    if (!primaryActivity) return;
    setSending(true);
    try {
      await api.post("/activity-requests", { targetUserId: user!.id, activityId: primaryActivity.activityId });
      setRequested(true);
    } catch (err) {
      Alert.alert("Couldn't send request", (err as Error).message);
    } finally {
      setSending(false);
    }
  }

  async function block() {
    setMenuOpen(false);
    await api.post(`/users/${userId}/block`);
    Alert.alert("Blocked", "You won't see this user again.");
    router.back();
  }

  async function submitReport() {
    if (!reportReason.trim()) return;
    await api.post(`/users/${userId}/report`, { reason: reportReason });
    setReportOpen(false);
    setReportReason("");
    Alert.alert("Reported", "Thank you — our team will review this.");
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Back" style={styles.headerButton} onPress={() => router.back()}>
          <Text style={styles.headerIcon}>←</Text>
        </Pressable>
        <Pressable accessibilityLabel="More" style={styles.headerButton} onPress={() => setMenuOpen(true)}>
          <Text style={styles.headerIcon}>⋮</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Avatar photoUrl={user.profile?.photoUrl} size={88} />
          <Text style={styles.name}>{user.profile?.displayName}</Text>
          {(age !== null || user.profile?.city) && (
            <Text style={styles.subtitle}>{[age, user.profile?.city].filter(Boolean).join(" · ")}</Text>
          )}
          <View style={styles.statBadge}>
            <Text style={styles.statBadgeText}>✓ {user.profile?.successfulTrainingsCount ?? 0} events completed</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <Text style={styles.sectionLabel}>SPORTS & AVAILABILITY</Text>
        {user.activities.map((a) => {
          const slots = user.availability.filter((s) => s.dayOfWeek !== undefined || s.date);
          return (
            <View key={a.activityId} style={styles.sportBlock}>
              <View style={styles.sportHeaderRow}>
                <Text style={styles.sportIcon}>🏅</Text>
                <Text style={styles.sportName}>{a.activity.name}</Text>
                <Badge label={a.level} />
              </View>
              {slots.length > 0 ? (
                slots.map((slot, i) => (
                  <Text key={i} style={styles.slotRow}>
                    {slot.dayOfWeek !== undefined ? DAY_NAMES[slot.dayOfWeek].padEnd(4) : ""} {slot.startTime} – {slot.endTime}
                  </Text>
                ))
              ) : (
                <Text style={styles.noAvailability}>No availability set yet</Text>
              )}
            </View>
          );
        })}

        {user.communityMembers.length > 0 && (
          <>
            <View style={styles.divider} />
            <Text style={styles.sectionLabel}>COMMUNITIES</Text>
            <View style={styles.chipRow}>
              {user.communityMembers.map((m) => (
                <View key={m.community.id} style={styles.communityChip}>
                  <Text style={styles.communityChipLabel}>{m.community.name}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <View style={styles.bottomBar}>
        <Pressable style={[styles.sendButton, requested && styles.sendButtonSent]} disabled={requested || sending} onPress={sendRequest}>
          <Text style={[styles.sendButtonLabel, requested && styles.sendButtonLabelSent]}>
            {requested ? "Request Sent" : sending ? "Sending…" : "Send Activity Request"}
          </Text>
        </Pressable>
      </View>

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
            <TextInput
              style={styles.reportInput}
              placeholder="Describe the issue"
              value={reportReason}
              onChangeText={setReportReason}
              multiline
            />
            <Button label="Submit report" onPress={submitReport} disabled={!reportReason.trim()} />
            <Button label="Cancel" variant="outline" onPress={() => setReportOpen(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.offWhite },
  header: { flexDirection: "row", justifyContent: "space-between", height: 56, paddingHorizontal: spacing.sm, alignItems: "center" },
  headerButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerIcon: { fontSize: 20, color: colors.charcoal },
  content: { paddingHorizontal: spacing.lg, paddingBottom: 100 },
  hero: { alignItems: "center", marginTop: spacing.sm },
  name: { fontFamily: typography.fontFamilyBold, fontSize: 22, color: colors.charcoal, marginTop: spacing.sm },
  subtitle: { fontFamily: typography.fontFamilyRegular, fontSize: 15, color: colors.muted, marginTop: 4 },
  statBadge: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 16, height: 32, paddingHorizontal: 12, justifyContent: "center", marginTop: spacing.md },
  statBadgeText: { fontFamily: typography.fontFamilyRegular, fontSize: 13, color: colors.charcoal },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.lg },
  sectionLabel: { fontFamily: typography.fontFamilyBold, fontSize: 12, color: colors.muted, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: spacing.sm },
  sportBlock: { marginTop: spacing.md },
  sportHeaderRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  sportIcon: { fontSize: 18 },
  sportName: { fontFamily: typography.fontFamilyBold, fontSize: 16, color: colors.charcoal, flex: 1 },
  slotRow: { fontFamily: typography.fontFamilyRegular, fontSize: 13, color: colors.muted, marginTop: 4 },
  noAvailability: { fontFamily: typography.fontFamilyRegular, fontSize: 13, color: colors.muted, marginTop: 4, fontStyle: "italic" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  communityChip: { height: 28, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, justifyContent: "center" },
  communityChipLabel: { fontFamily: typography.fontFamilyRegular, fontSize: 13, color: colors.charcoal },
  bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border, padding: spacing.md, paddingBottom: spacing.xl },
  sendButton: { height: 52, borderRadius: radii.lg, backgroundColor: colors.coral, alignItems: "center", justifyContent: "center" },
  sendButtonSent: { backgroundColor: colors.border },
  sendButtonLabel: { fontFamily: typography.fontFamily, fontSize: 16, color: colors.white },
  sendButtonLabelSent: { color: colors.muted },
  menuBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "flex-end" },
  menu: { backgroundColor: colors.white, borderRadius: radii.sm, margin: spacing.lg, overflow: "hidden" },
  menuItem: { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  menuItemLabel: { fontFamily: typography.fontFamily, fontSize: 15, color: colors.charcoal },
  reportSheet: { backgroundColor: colors.white, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg, padding: spacing.lg, gap: spacing.md },
  reportInput: { minHeight: 90, borderWidth: 1, borderColor: colors.border, borderRadius: radii.sm, padding: spacing.md, fontFamily: typography.fontFamilyRegular, textAlignVertical: "top" },
});
