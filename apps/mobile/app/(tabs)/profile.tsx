import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Badge } from "../../src/components/Badge";
import { Avatar } from "../../src/components/Avatar";
import { colors, spacing, typography, radii, shadow } from "../../src/theme";
import { useAuth } from "../../src/hooks/useAuth";
import { usePendingRequestsCount } from "../../src/hooks/usePendingRequestsCount";
import { calculateAge } from "../../src/utils/age";

type ProfileTab = "activities" | "communities";

// Profile redesign: a fixed User Card + a fixed Requests row (received-only
// badge, per the bug-fix-round-6 correction — sent requests never count
// toward it) at the top, with a two-tab area (Preferred Activities /
// Communities) below that scrolls independently of the fixed header above it.
export default function ProfileScreen() {
  const { profile, logout } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const pendingCount = usePendingRequestsCount();
  const [tab, setTab] = useState<ProfileTab>("activities");

  if (!profile) return null;

  const ageCity = [profile.profile?.dateOfBirth ? calculateAge(profile.profile.dateOfBirth) : null, profile.profile?.city]
    .filter(Boolean)
    .join(" · ");

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.userCard}>
        <Pressable style={styles.photoWrap} onPress={() => router.push("/profile/edit")}>
          <Avatar photoUrl={profile.profile?.photoUrl} size={80} />
          <View style={styles.photoEditBadge}>
            <Text style={styles.photoEditIcon}>✎</Text>
          </View>
        </Pressable>
        <Text style={styles.name}>{profile.profile?.displayName}</Text>
        {Boolean(ageCity) && <Text style={styles.subtitle}>{ageCity}</Text>}
        <View style={styles.statPill}>
          <Text style={styles.statPillText}>{profile.profile?.completedTrainingsCount ?? 0} completed events</Text>
        </View>
        <Pressable style={styles.editButton} onPress={() => router.push("/profile/edit")}>
          <Text style={styles.editButtonLabel}>Edit Profile</Text>
        </Pressable>
      </View>

      <Pressable style={styles.requestsRow} onPress={() => router.push("/requests")}>
        <Text style={styles.requestsIcon}>👥</Text>
        <Text style={styles.requestsLabel}>Requests</Text>
        {pendingCount > 0 && (
          <View style={styles.requestsBadge}>
            <Text style={styles.requestsBadgeText}>{pendingCount > 49 ? "50+" : pendingCount > 9 ? "10+" : pendingCount}</Text>
          </View>
        )}
        <Text style={styles.requestsChevron}>›</Text>
      </Pressable>

      <View style={styles.tabBar}>
        <Pressable style={[styles.tab, tab === "activities" && styles.tabActive]} onPress={() => setTab("activities")}>
          <Text style={[styles.tabLabel, tab === "activities" && styles.tabLabelActive]}>Preferred Activities</Text>
        </Pressable>
        <Pressable style={[styles.tab, tab === "communities" && styles.tabActive]} onPress={() => setTab("communities")}>
          <Text style={[styles.tabLabel, tab === "communities" && styles.tabLabelActive]}>Communities</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.tabContent}>
        {tab === "activities" ? (
          profile.activities.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No preferred activities yet.</Text>
              <Pressable onPress={() => router.push("/profile/activities")}>
                <Text style={styles.emptyCta}>Edit</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.chipRow}>
                {profile.activities.map((a) => (
                  <Badge key={a.activityId} label={`${a.activity.name} · ${a.level}`} tone="coral" />
                ))}
              </View>
              <Pressable onPress={() => router.push("/profile/activities")}>
                <Text style={styles.editLink}>Edit</Text>
              </Pressable>
            </>
          )
        ) : profile.communityMembers.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>You haven't joined a community yet.</Text>
            <Pressable onPress={() => router.push("/communities")}>
              <Text style={styles.emptyCta}>Explore Communities</Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {profile.communityMembers.map((m) => (
              <Pressable key={m.community.id} style={styles.communityRow} onPress={() => router.push(`/communities/${m.community.id}`)}>
                <Text style={styles.communityName}>{m.community.name}</Text>
                {m.role !== "member" && <Badge label={m.role === "organiser" ? "Organiser" : "Assistant"} />}
              </Pressable>
            ))}
          </View>
        )}

        <Pressable style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutButtonLabel}>Log out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.offWhite },
  userCard: { alignItems: "center", backgroundColor: colors.white, paddingVertical: spacing.lg, paddingHorizontal: spacing.lg, marginHorizontal: spacing.lg, marginTop: spacing.md, borderRadius: radii.lg, ...shadow },
  photoWrap: { position: "relative" },
  photoEditBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.coral,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.white,
  },
  photoEditIcon: { fontSize: 12, color: colors.white },
  name: { fontFamily: typography.fontFamilyBold, fontSize: 20, color: colors.charcoal, marginTop: spacing.sm },
  subtitle: { fontFamily: typography.fontFamilyRegular, fontSize: 14, color: colors.muted, marginTop: 2 },
  statPill: { backgroundColor: colors.sageLight, height: 28, paddingHorizontal: 14, borderRadius: 14, justifyContent: "center", marginTop: spacing.sm },
  statPillText: { fontFamily: typography.fontFamily, fontSize: 13, color: colors.sageDark },
  editButton: { height: 40, paddingHorizontal: 20, borderRadius: 20, borderWidth: 1, borderColor: colors.coral, alignItems: "center", justifyContent: "center", marginTop: spacing.md },
  editButtonLabel: { fontFamily: typography.fontFamilyBold, fontSize: 14, color: colors.coral },
  requestsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.white,
    height: 56,
    paddingHorizontal: spacing.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    borderRadius: radii.sm,
    ...shadow,
  },
  requestsIcon: { fontSize: 18 },
  requestsLabel: { flex: 1, fontFamily: typography.fontFamilyRegular, fontSize: 15, color: colors.charcoal },
  requestsBadge: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, backgroundColor: colors.coral, alignItems: "center", justifyContent: "center" },
  requestsBadgeText: { fontFamily: typography.fontFamilyBold, fontSize: 11, color: colors.white },
  requestsChevron: { fontSize: 20, color: colors.muted },
  tabBar: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.border, marginTop: spacing.lg, marginHorizontal: spacing.lg },
  tab: { flex: 1, alignItems: "center", paddingVertical: spacing.sm, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabActive: { borderBottomColor: colors.coral },
  tabLabel: { fontFamily: typography.fontFamilyRegular, fontSize: 14, color: colors.muted },
  tabLabelActive: { fontFamily: typography.fontFamilyBold, color: colors.coral },
  tabContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl, flexGrow: 1 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  editLink: { fontFamily: typography.fontFamily, color: colors.coral, fontSize: 13, marginTop: spacing.sm },
  emptyState: { alignItems: "center", paddingVertical: spacing.xl, gap: spacing.sm },
  emptyText: { fontFamily: typography.fontFamilyRegular, fontSize: 14, color: colors.muted, textAlign: "center" },
  emptyCta: { fontFamily: typography.fontFamilyBold, fontSize: 14, color: colors.coral },
  communityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 52,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  communityName: { fontFamily: typography.fontFamilyRegular, fontSize: 15, color: colors.charcoal },
  logoutButton: { height: 48, alignItems: "center", justifyContent: "center", marginTop: spacing.xl },
  logoutButtonLabel: { fontFamily: typography.fontFamilyRegular, fontSize: 14, color: colors.error },
});
