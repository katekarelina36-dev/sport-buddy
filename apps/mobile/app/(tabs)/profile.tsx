import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Image, Modal, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar } from "../../src/components/Avatar";
import { ActivityIcon } from "../../src/components/icons/ActivityIcon";
import { DAY_ORDER } from "../../src/components/SportAvailabilityCard";
import { resolveMediaUrl } from "../../src/api/client";
import { colors, spacing, typography, radii, shadow } from "../../src/theme";
import { useAuth } from "../../src/hooks/useAuth";
import { usePendingRequestsCount } from "../../src/hooks/usePendingRequestsCount";
import { calculateAge } from "../../src/utils/age";

type ProfileTab = "activities" | "communities";
const DAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
  const [menuOpen, setMenuOpen] = useState(false);

  if (!profile) return null;

  const ageCity = [profile.profile?.dateOfBirth ? calculateAge(profile.profile.dateOfBirth) : null, profile.profile?.city]
    .filter(Boolean)
    .join(" · ");

  function formatAvailability(activityId: string): string {
    const slots = profile!.availability.filter((s) => s.activityId === activityId && s.dayOfWeek !== undefined);
    const sorted = [...slots].sort((a, b) => DAY_ORDER.indexOf(a.dayOfWeek!) - DAY_ORDER.indexOf(b.dayOfWeek!));
    return sorted.map((s) => `${DAY_ABBR[s.dayOfWeek!]} ${s.startTime}–${s.endTime}`).join(", ");
  }

  function confirmLogout() {
    setMenuOpen(false);
    Alert.alert("Are you sure you want to log out?", undefined, [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: logout },
    ]);
  }

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
        <Pressable style={styles.statPill} onPress={() => router.push("/profile/completed-events")}>
          <Text style={styles.statPillText}>{profile.profile?.completedTrainingsCount ?? 0} completed events</Text>
          <Text style={styles.statPillChevron}>›</Text>
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
          <>
            {profile.activities.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No preferred activities yet.</Text>
                <Pressable onPress={() => router.push("/profile/edit")}>
                  <Text style={styles.emptyCta}>Edit Profile</Text>
                </Pressable>
              </View>
            ) : (
              <View>
                {profile.activities.map((a, i) => {
                  const availability = formatAvailability(a.activityId);
                  const odd = i % 2 === 0;
                  return (
                    <Pressable
                      key={a.activityId}
                      style={[styles.sportRow, odd ? styles.rowTintPrimary : styles.rowTintSecondary]}
                      onPress={() => router.push({ pathname: "/profile/edit", params: { initialExpandedActivity: a.activityId } })}
                    >
                      <View style={styles.sportIconBadge}>
                        <ActivityIcon name={a.activity.name} size={18} />
                      </View>
                      <View style={styles.sportRowCenter}>
                        <Text style={styles.sportRowName}>{a.activity.name}</Text>
                        {Boolean(availability) && (
                          <Text style={styles.sportRowAvailability} numberOfLines={2}>
                            {availability}
                          </Text>
                        )}
                      </View>
                      <View style={styles.levelBadge}>
                        <Text style={styles.levelBadgeLabel}>{a.level}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </>
        ) : profile.communityMembers.length === 0 ? (
          <View style={styles.communitiesEmptyCard}>
            <Text style={styles.communitiesEmptyIcon}>👥</Text>
            <Text style={styles.communitiesEmptyTitle}>No communities yet</Text>
            <Text style={styles.communitiesEmptyBody}>Join a community to meet people who share your sport interests.</Text>
            <Pressable style={styles.communitiesEmptyButton} onPress={() => router.push("/communities")}>
              <Text style={styles.communitiesEmptyButtonLabel}>Explore Communities</Text>
            </Pressable>
          </View>
        ) : (
          <View>
            {profile.communityMembers.map((m, i) => {
              const odd = i % 2 === 0;
              const photoUri = resolveMediaUrl(m.community.photoUrl ?? m.community.activity?.iconUrl);
              return (
                <Pressable
                  key={m.community.id}
                  style={[styles.communityRow, odd ? styles.rowTintPrimary : styles.rowTintSecondary]}
                  onPress={() => router.push(`/communities/${m.community.id}`)}
                >
                  {photoUri ? (
                    <Image source={{ uri: photoUri }} style={styles.communityPhoto} />
                  ) : (
                    <View style={[styles.communityPhoto, styles.communityPhotoFallback]}>
                      <ActivityIcon name={m.community.activity?.name ?? ""} size={20} />
                    </View>
                  )}
                  <View style={styles.sportRowCenter}>
                    <Text style={styles.sportRowName}>{m.community.name}</Text>
                    <Text style={styles.sportRowAvailability}>
                      {[m.community.activity?.name, m.community.memberCount != null ? `${m.community.memberCount} members` : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </Text>
                  </View>
                  {m.role !== "member" && (
                    <View style={styles.organiserBadge}>
                      <Text style={styles.organiserBadgeLabel}>{m.role === "organiser" ? "Organiser" : "Assistant"}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Pressable
        accessibilityLabel="Account menu"
        style={[styles.accountFab, { bottom: insets.bottom + 16 }]}
        onPress={() => setMenuOpen(true)}
      >
        <Text style={styles.accountFabIcon}>⋮</Text>
      </Pressable>

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setMenuOpen(false)}>
          <View style={[styles.accountMenu, { bottom: insets.bottom + 64 }]}>
            <Pressable style={styles.accountMenuItem} onPress={confirmLogout}>
              <Text style={styles.accountMenuItemLabel}>Log out</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
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
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.coral,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.white,
  },
  photoEditIcon: { fontSize: 12, color: colors.white },
  name: { fontFamily: typography.fontFamilyBold, fontSize: 20, color: colors.charcoal, marginTop: spacing.sm },
  subtitle: { fontFamily: typography.fontFamilyRegular, fontSize: 14, color: colors.muted, marginTop: 2 },
  statPill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.sageLight, height: 28, paddingHorizontal: 14, borderRadius: 14, marginTop: spacing.sm },
  statPillText: { fontFamily: typography.fontFamily, fontSize: 13, color: colors.sageDark },
  statPillChevron: { fontSize: 14, color: colors.sageDark },
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
  tabContent: { paddingTop: spacing.md, paddingBottom: 96, flexGrow: 1 },
  emptyState: { alignItems: "center", paddingVertical: spacing.xl, gap: spacing.sm, paddingHorizontal: spacing.lg },
  emptyText: { fontFamily: typography.fontFamilyRegular, fontSize: 14, color: colors.muted, textAlign: "center" },
  emptyCta: { fontFamily: typography.fontFamilyBold, fontSize: 14, color: colors.coral },
  // UI Redesign Final, section 3: full-width alternating-tint rows, no card
  // borders — replaces the earlier bordered white card per sport.
  rowTintPrimary: { backgroundColor: "rgba(0, 49, 97, 0.05)" },
  rowTintSecondary: { backgroundColor: "rgba(0, 106, 103, 0.05)" },
  sportRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 96,
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  sportIconBadge: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  sportRowCenter: { flex: 1 },
  sportRowName: { fontFamily: typography.fontFamilyBold, fontSize: 16, color: colors.charcoal },
  sportRowAvailability: { fontFamily: typography.fontFamilyRegular, fontSize: 13, color: colors.muted, marginTop: 2 },
  levelBadge: { backgroundColor: colors.secondaryTint2, height: 22, paddingHorizontal: 10, borderRadius: 11, justifyContent: "center" },
  levelBadgeLabel: { fontFamily: typography.fontFamilyRegular, fontSize: 12, color: colors.sageDark },
  // UI Redesign Final, section 4: same full-width list style as Preferred Activities.
  communitiesEmptyCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    alignItems: "center",
    marginHorizontal: spacing.lg,
    ...shadow,
  },
  communitiesEmptyIcon: { fontSize: 40, color: colors.coral },
  communitiesEmptyTitle: { fontFamily: typography.fontFamilyBold, fontSize: 16, color: colors.charcoal, marginTop: 12, textAlign: "center" },
  communitiesEmptyBody: { fontFamily: typography.fontFamilyRegular, fontSize: 14, color: colors.muted, textAlign: "center", lineHeight: 20, marginTop: 6 },
  communitiesEmptyButton: { height: 44, paddingHorizontal: 20, borderRadius: 22, backgroundColor: colors.coral, alignItems: "center", justifyContent: "center", marginTop: 16 },
  communitiesEmptyButtonLabel: { fontFamily: typography.fontFamilyBold, fontSize: 14, color: colors.white },
  communityRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 72,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  communityPhoto: { width: 44, height: 44, borderRadius: 10, marginRight: 14 },
  communityPhotoFallback: { backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  organiserBadge: { backgroundColor: colors.primaryTint2, height: 22, paddingHorizontal: 10, borderRadius: 11, justifyContent: "center" },
  organiserBadgeLabel: { fontFamily: typography.fontFamilyRegular, fontSize: 11, color: colors.coral },
  accountFab: {
    position: "absolute",
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    ...shadow,
  },
  accountFabIcon: { fontSize: 18, color: colors.muted },
  menuBackdrop: { flex: 1 },
  accountMenu: {
    position: "absolute",
    right: 16,
    width: 160,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  accountMenuItem: { height: 44, paddingHorizontal: 16, justifyContent: "center" },
  accountMenuItemLabel: { fontFamily: typography.fontFamilyBold, fontSize: 15, color: colors.coral },
});
