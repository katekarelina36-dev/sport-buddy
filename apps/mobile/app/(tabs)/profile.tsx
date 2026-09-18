import { View, Text, StyleSheet, ScrollView, Image } from "react-native";
import { useRouter } from "expo-router";
import { Card } from "../../src/components/Card";
import { Badge } from "../../src/components/Badge";
import { Button } from "../../src/components/Button";
import { colors, spacing, typography } from "../../src/theme";
import { useAuth } from "../../src/hooks/useAuth";
import { API_BASE_URL } from "../../src/api/client";

// F5: My Profile (view/edit). Inline sections per spec; edit affordances are
// left as a follow-up wiring pass (PATCH /profile/me is already live from
// onboarding), this screen focuses on the view + navigation entry points.
export default function ProfileScreen() {
  const { profile, logout } = useAuth();
  const router = useRouter();

  if (!profile) return null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>My profile</Text>

      <Card style={{ gap: spacing.sm, alignItems: "center" }}>
        {profile.profile?.photoUrl ? (
          <Image source={{ uri: `${API_BASE_URL}${profile.profile.photoUrl}` }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]} />
        )}
        <Text style={styles.name}>{profile.profile?.displayName}</Text>
        <Badge label={profile.profile?.level ?? "beginner"} />
        {profile.profile?.bio && <Text style={styles.bio}>{profile.profile.bio}</Text>}
        <Text style={styles.stat}>{profile.profile?.successfulTrainingsCount ?? 0} successful trainings</Text>
      </Card>

      <Card style={{ gap: spacing.sm, marginTop: spacing.md }}>
        <Text style={styles.sectionHeader}>Preferred activities</Text>
        <View style={styles.chipRow}>
          {profile.activities.map((a) => (
            <Badge key={a.activityId} label={a.activity.name} tone="coral" />
          ))}
        </View>
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
        <Button label="Pending requests" onPress={() => router.push("/requests")} />
        <Button label="Edit availability" variant="secondary" onPress={() => router.push({ pathname: "/availability", params: { mode: "profile" } })} />
        <Button label="Log out" variant="outline" onPress={logout} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, backgroundColor: colors.offWhite, flexGrow: 1 },
  title: { fontFamily: typography.fontFamilyBold, fontSize: 24, color: colors.charcoal, marginBottom: spacing.md },
  avatar: { width: 88, height: 88, borderRadius: 44 },
  avatarPlaceholder: { backgroundColor: colors.sageLight },
  name: { fontFamily: typography.fontFamilyBold, fontSize: 20, color: colors.charcoal },
  bio: { fontFamily: typography.fontFamilyRegular, color: colors.muted },
  stat: { fontFamily: typography.fontFamily, fontSize: 13, color: colors.sageDark },
  sectionHeader: { fontFamily: typography.fontFamily, color: colors.sageDark },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  actions: { gap: spacing.sm, marginTop: spacing.lg },
});
