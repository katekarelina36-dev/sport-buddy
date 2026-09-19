import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator, Alert, Modal, TextInput } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { api } from "../../src/api/client";
import { Badge } from "../../src/components/Badge";
import { Button } from "../../src/components/Button";
import { Avatar } from "../../src/components/Avatar";
import { WeeklyAvailabilityWidget } from "../../src/components/WeeklyAvailabilityWidget";
import { SendActivityRequestSheet } from "../../src/components/SendActivityRequestSheet";
import { colors, spacing, typography, radii } from "../../src/theme";
import { calculateAge } from "../../src/utils/age";
import type { PublicUser } from "../../src/api/types";

// F4 (Round 2): full public profile detail, reached by tapping a card in F3.
// Availability is shown ONLY for the sport the viewer navigated through
// (?activityId=), as a tappable weekly calendar widget instead of a plain
// list. "Also plays" lists other sports (level only, no availability).
export default function UserProfileScreen() {
  const { userId, activityId } = useLocalSearchParams<{ userId: string; activityId?: string }>();
  const router = useRouter();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [requested, setRequested] = useState(false);
  const [requestSheetOpen, setRequestSheetOpen] = useState(false);

  useEffect(() => {
    api.get<PublicUser>(`/users/${userId}`).then((u) => {
      setUser(u);
      if (u.alreadyRequested) setRequested(true);
    });
  }, [userId]);

  if (!user) return <ActivityIndicator style={{ marginTop: spacing.xl }} />;

  const age = user.profile?.dateOfBirth ? calculateAge(user.profile.dateOfBirth) : null;
  const primaryActivityId = activityId ?? user.activities[0]?.activityId;
  const primaryActivity = user.activities.find((a) => a.activityId === primaryActivityId) ?? user.activities[0];
  const otherSports = user.activities.filter((a) => a.activityId !== primaryActivity?.activityId);
  const primarySlots = user.availability
    .filter((s) => s.dayOfWeek !== undefined)
    .map((s) => ({ dayOfWeek: s.dayOfWeek!, startTime: s.startTime, endTime: s.endTime }));

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

        {primaryActivity && (
          <View>
            <View style={styles.sportHeaderRow}>
              <Text style={styles.sportIcon}>🏅</Text>
              <Text style={styles.sportName}>{primaryActivity.activity.name}</Text>
              <Badge label={primaryActivity.level} />
            </View>
            <View style={{ marginTop: spacing.md }}>
              <WeeklyAvailabilityWidget slots={primarySlots} variant="view" />
            </View>
          </View>
        )}

        {otherSports.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>ALSO PLAYS</Text>
            {otherSports.map((a) => (
              <View key={a.activityId} style={styles.otherSportRow}>
                <Text style={styles.sportIconSmall}>🏅</Text>
                <Text style={styles.otherSportName}>{a.activity.name}</Text>
                <Badge label={a.level} />
              </View>
            ))}
          </>
        )}

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
        <Button
          label={requested ? "Request Sent" : "Send Activity Request"}
          variant="glassPrimary"
          disabled={requested}
          onPress={() => setRequestSheetOpen(true)}
        />
      </View>

      {primaryActivity && (
        <SendActivityRequestSheet
          visible={requestSheetOpen}
          onClose={() => setRequestSheetOpen(false)}
          onSent={() => setRequested(true)}
          targetUserId={user.id}
          targetUserName={user.profile?.displayName ?? "this user"}
          activityId={primaryActivity.activityId}
          activityName={primaryActivity.activity.name}
          slots={primarySlots}
        />
      )}

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
  sportHeaderRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  sportIcon: { fontSize: 20 },
  sportIconSmall: { fontSize: 16 },
  sportName: { fontFamily: typography.fontFamilyBold, fontSize: 16, color: colors.charcoal, flex: 1 },
  otherSportRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.sm },
  otherSportName: { fontFamily: typography.fontFamilyRegular, fontSize: 14, color: colors.charcoal, flex: 1 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  communityChip: { height: 28, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, justifyContent: "center" },
  communityChipLabel: { fontFamily: typography.fontFamilyRegular, fontSize: 13, color: colors.charcoal },
  bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border, padding: spacing.md, paddingBottom: spacing.xl },
  menuBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "flex-end" },
  menu: { backgroundColor: colors.white, borderRadius: radii.sm, margin: spacing.lg, overflow: "hidden" },
  menuItem: { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  menuItemLabel: { fontFamily: typography.fontFamily, fontSize: 15, color: colors.charcoal },
  reportSheet: { backgroundColor: colors.white, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg, padding: spacing.lg, gap: spacing.md },
  reportInput: { minHeight: 90, borderWidth: 1, borderColor: colors.border, borderRadius: radii.sm, padding: spacing.md, fontFamily: typography.fontFamilyRegular, textAlignVertical: "top" },
});
