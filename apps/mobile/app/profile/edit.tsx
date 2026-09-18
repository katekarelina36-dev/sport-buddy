import { useEffect, useState } from "react";
import { View, Text, TextInput, StyleSheet, Pressable, ScrollView, Alert } from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Button } from "../../src/components/Button";
import { Avatar } from "../../src/components/Avatar";
import { colors, spacing, typography, radii } from "../../src/theme";
import { api, uploadPhoto } from "../../src/api/client";
import { useAuth } from "../../src/hooks/useAuth";
import type { Activity } from "../../src/api/types";

// F5: My Profile edit — photo, name, bio, and preferred activities. Level is
// intentionally not editable here yet (see docs/FEATURES.md backlog: level
// should become per-sport, not a single profile-wide value).
export default function EditProfileScreen() {
  const router = useRouter();
  const { profile, refresh } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [displayName, setDisplayName] = useState(profile?.profile?.displayName ?? "");
  const [bio, setBio] = useState(profile?.profile?.bio ?? "");
  const [selectedActivities, setSelectedActivities] = useState<string[]>(profile?.activities.map((a) => a.activityId) ?? []);
  const [photoUrl, setPhotoUrl] = useState<string | null>(profile?.profile?.photoUrl ?? null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<Activity[]>("/activities").then(setActivities);
  }, []);

  async function pickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow photo library access to change your profile photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled) return;

    setUploadingPhoto(true);
    try {
      const { photoUrl: newUrl } = await uploadPhoto(result.assets[0].uri);
      setPhotoUrl(newUrl);
    } catch (err) {
      Alert.alert("Couldn't upload photo", (err as Error).message);
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      await api.patch("/profile/me", {
        displayName,
        bio,
        preferredActivityIds: selectedActivities,
      });
      await refresh();
      router.back();
    } catch (err) {
      Alert.alert("Couldn't save", (err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Pressable style={styles.photoRow} onPress={pickPhoto} disabled={uploadingPhoto}>
        <Avatar photoUrl={photoUrl} size={88} />
        <Text style={styles.changePhotoLabel}>{uploadingPhoto ? "Uploading…" : "Change photo"}</Text>
      </Pressable>

      <Text style={styles.label}>Name</Text>
      <TextInput style={styles.input} value={displayName} onChangeText={setDisplayName} placeholder="Display name" />

      <Text style={styles.label}>Bio</Text>
      <TextInput style={[styles.input, styles.multiline]} value={bio} onChangeText={setBio} placeholder="Intro bio" multiline />

      <Text style={styles.label}>Preferred activities</Text>
      <View style={styles.chipRow}>
        {activities.map((a) => {
          const selected = selectedActivities.includes(a.id);
          return (
            <Pressable
              key={a.id}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => setSelectedActivities((prev) => (selected ? prev.filter((id) => id !== a.id) : [...prev, a.id]))}
            >
              <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{a.name}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.actions}>
        <Button label={saving ? "Saving…" : "Save"} onPress={save} disabled={saving} />
        <Button label="Cancel" variant="outline" onPress={() => router.back()} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.offWhite },
  container: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xl },
  photoRow: { alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
  changePhotoLabel: { fontFamily: typography.fontFamily, color: colors.coral, fontSize: 13 },
  label: { fontFamily: typography.fontFamily, color: colors.sageDark, marginTop: spacing.sm },
  input: {
    backgroundColor: colors.white,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    minHeight: 44,
    fontFamily: typography.fontFamilyRegular,
  },
  multiline: { minHeight: 90, paddingTop: spacing.sm, textAlignVertical: "top" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: radii.lg, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, minHeight: 44, justifyContent: "center" },
  chipSelected: { backgroundColor: colors.coral, borderColor: colors.coral },
  chipLabel: { fontFamily: typography.fontFamily, color: colors.charcoal },
  chipLabelSelected: { color: colors.white },
  actions: { gap: spacing.sm, marginTop: spacing.lg },
});
