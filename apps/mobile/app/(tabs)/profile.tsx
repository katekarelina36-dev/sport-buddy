import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Card } from "../../src/components/Card";
import { Badge } from "../../src/components/Badge";
import { Button } from "../../src/components/Button";
import { Avatar } from "../../src/components/Avatar";
import { colors, spacing, typography, topInset } from "../../src/theme";
import { useAuth } from "../../src/hooks/useAuth";
import { calculateAge } from "../../src/utils/age";

// F5: My Profile (view). Editing (photo, name, bio, preferred activities)
// lives on a dedicated screen (profile/edit.tsx) rather than per-field inline
// affordances — see docs/FEATURES.md backlog for the inline-edit variant.
export default function ProfileScreen() {
  const { profile, logout } = useAuth();
  const router = useRouter();

  if (!profile) return null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>My profile</Text>

      <Card style={{ gap: spacing.sm, alignItems: "center" }}>
        <Avatar photoUrl={profile.profile?.photoUrl} size={88} />
        <Text style={styles.name}>{profile.profile?.displayName}</Text>
        {(profile.profile?.dateOfBirth || profile.profile?.city) && (
          <Text style={styles.subtitle}>
            {[profile.profile?.dateOfBirth ? calculateAge(profile.profile.dateOfBirth) : null, profile.profile?.city]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        )}
        {profile.profile?.bio && <Text style={styles.bio}>{profile.profile.bio}</Text>}
        <Text style={styles.stat}>{profile.profile?.successfulTrainingsCount ?? 0} successful trainings</Text>
      </Card>

      <Card style={{ gap: spacing.sm, marginTop: spacing.md }}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeader}>Preferred Activities</Text>
          <Text style={styles.editLink} onPress={() => router.push("/profile/activities")}>
            Edit
          </Text>
        </View>
        <View style={styles.chipRow}>
          {profile.activities.map((a) => (
            <Badge key={a.activityId} label={`${a.activity.name} · ${a.level}`} tone="coral" />
          ))}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit availability"
          style={styles.availabilityRow}
          onPress={() => router.push({ pathname: "/availability", params: { mode: "profile" } })}
        >
          <Text style={styles.editLink}>Edit availability</Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      </Card>

      <Card style={{ gap: spacing.sm, marginTop: spacing.md }}>
        <Text style={styles.sectionHeader}>Communities</Text>
        {profile.communityMembers.length === 0 ? (
          <Text style={styles.bio}>No communities yet — keep completing activities to unlock Organiser status.</Text>
        ) : (
          <View style={styles.chipRow}>
            {profile.communityMembers.map((m) => (
              <Badge key={m.community.id} label={m.community.name} />
            ))}
          </View>
        )}
      </Card>

      <View style={styles.actions}>
        <Button label="Edit profile" onPress={() => router.push("/profile/edit")} />
        <Button label="Pending requests" onPress={() => router.push("/requests")} />
        <Button label="Log out" variant="outline" onPress={logout} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing.lg, paddingTop: topInset, paddingBottom: spacing.lg, backgroundColor: colors.offWhite, flexGrow: 1 },
  title: { fontFamily: typography.fontFamilyBold, fontSize: 24, color: colors.charcoal, marginBottom: spacing.md },
  name: { fontFamily: typography.fontFamilyBold, fontSize: 20, color: colors.charcoal },
  subtitle: { fontFamily: typography.fontFamilyRegular, fontSize: 14, color: colors.muted },
  bio: { fontFamily: typography.fontFamilyRegular, color: colors.muted },
  stat: { fontFamily: typography.fontFamily, fontSize: 13, color: colors.sageDark },
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionHeader: { fontFamily: typography.fontFamily, color: colors.sageDark },
  editLink: { fontFamily: typography.fontFamily, color: colors.coral, fontSize: 13 },
  chevron: { fontFamily: typography.fontFamilyBold, fontSize: 18, color: colors.muted },
  availabilityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  actions: { gap: spacing.sm, marginTop: spacing.lg },
});
