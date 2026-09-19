import { useState } from "react";
import { View, Text, TextInput, StyleSheet, Pressable, ScrollView, Alert } from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "../../src/components/Button";
import { Avatar } from "../../src/components/Avatar";
import { CityAutocomplete } from "../../src/components/CityAutocomplete";
import { colors, spacing, typography, radii } from "../../src/theme";
import { api, uploadPhoto } from "../../src/api/client";
import { useAuth } from "../../src/hooks/useAuth";

// F5: My Profile edit — photo, name, city, bio. Preferred activities (sport +
// level + per-sport availability) moved to its own dedicated screen
// (profile/activities.tsx), matching the Round 2 spec.
export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, refresh } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.profile?.displayName ?? "");
  const [city, setCity] = useState(profile?.profile?.city ?? "");
  const [bio, setBio] = useState(profile?.profile?.bio ?? "");
  const [photoUrl, setPhotoUrl] = useState<string | null>(profile?.profile?.photoUrl ?? null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);

  async function pickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow photo library access to change your profile photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
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
      await api.patch("/profile/me", { displayName, city, bio });
      await refresh();
      router.back();
    } catch (err) {
      Alert.alert("Couldn't save", (err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container}>
        <Pressable style={styles.photoRow} onPress={pickPhoto} disabled={uploadingPhoto}>
          <Avatar photoUrl={photoUrl} size={88} />
          <Text style={styles.changePhotoLabel}>{uploadingPhoto ? "Uploading…" : "Change photo"}</Text>
        </Pressable>

        <Text style={styles.label}>Name</Text>
        <TextInput style={styles.input} value={displayName} onChangeText={setDisplayName} placeholder="Display name" />

        <Text style={styles.label}>City</Text>
        <CityAutocomplete value={city} onChangeText={setCity} />

        <Text style={styles.label}>Bio</Text>
        <TextInput style={[styles.input, styles.multiline]} value={bio} onChangeText={setBio} placeholder="Intro bio" multiline />
      </ScrollView>

      {/* Bug fix batch 2, Bug 4: primary CTAs fixed outside the ScrollView. */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button label={saving ? "Saving…" : "Save"} onPress={save} disabled={saving} />
        <Button label="Cancel" variant="outline" onPress={() => router.back()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.offWhite },
  container: { padding: spacing.lg, gap: spacing.sm, paddingBottom: 80 },
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
  footer: {
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.offWhite,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
});
