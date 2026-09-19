import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Card } from "../../src/components/Card";
import { Badge } from "../../src/components/Badge";
import { Button } from "../../src/components/Button";
import { Avatar } from "../../src/components/Avatar";
import { colors, spacing, typography } from "../../src/theme";
import { useAuth } from "../../src/hooks/useAuth";

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
        <Badge label={profile.profile?.level ?? "beginner"} />
        {profile.profile?.bio && <Text style={styles.bio}>{profile.profile.bio}</Text>}
        <Text style={styles.stat}>{profile.profile?.successfulTrainingsCount ?? 0} successful trainings</Text>
      </Card>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Edit activities/availability"
        onPress={() => router.push({ pathname: "/availability", params: { mode: "profile" } })}
      >
        <Card style={{ gap: spacing.sm, marginTop: spacing.md }}>
          <View style={styles.cardHeader}>
            <Text style={styles.sectionHeader}>Edit activities/availability</Text>
            <Text style={styles.chevron}>›</Text>
          </View>
          <View style={styles.chipRow}>
            {profile.activities.map((a) => (
              <Badge key={a.activityId} label={a.activity.name} tone="coral" />
            ))}
          </View>
        </Card>
      </Pressable>

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
  container: { padding: spacing.lg, backgroundColor: colors.offWhite, flexGrow: 1 },
  title: { fontFamily: typography.fontFamilyBold, fontSize: 24, color: colors.charcoal, marginBottom: spacing.md },
  name: { fontFamily: typography.fontFamilyBold, fontSize: 20, color: colors.charcoal },
  bio: { fontFamily: typography.fontFamilyRegular, color: colors.muted },
  stat: { fontFamily: typography.fontFamily, fontSize: 13, color: colors.sageDark },
  sectionHeader: { fontFamily: typography.fontFamily, color: colors.sageDark },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  chevron: { fontFamily: typography.fontFamilyBold, fontSize: 18, color: colors.muted },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  actions: { gap: spacing.sm, marginTop: spacing.lg },
});
