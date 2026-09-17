import { useEffect, useState } from "react";
import { View, Text, TextInput, StyleSheet, Pressable, ScrollView, ActivityIndicator, Image, Alert } from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Button } from "../../src/components/Button";
import { colors, spacing, typography, radii } from "../../src/theme";
import { api, uploadPhoto } from "../../src/api/client";
import { useAuth } from "../../src/hooks/useAuth";
import type { Activity, SkillLevel } from "../../src/api/types";

const STEPS = ["name", "photo", "sports", "level", "bio", "permissions"] as const;

// F1: Onboarding wizard. Mandatory profile completion (name, photo, >=1
// activity, level) gates reaching Home; location + calendar permissions are
// soft-asks, deferrable, but required before F12 (calendar sync) works.
export default function OnboardingScreen() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [stepIndex, setStepIndex] = useState(0);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [saving, setSaving] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [level, setLevel] = useState<SkillLevel>("beginner");
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    api.get<Activity[]>("/activities").then(setActivities);
  }, []);

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  async function pickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow photo library access to add a profile photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6, // client-side compression toward the spec's <=2MB upload target
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled) return;

    setUploadingPhoto(true);
    try {
      await uploadPhoto(result.assets[0].uri);
      setPhotoUri(result.assets[0].uri);
    } catch (err) {
      Alert.alert("Couldn't upload photo", (err as Error).message);
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function next() {
    if (!isLast) {
      setStepIndex((i) => i + 1);
      return;
    }
    if (!photoUri) {
      Alert.alert("Add a photo first", "A profile photo is required before you can finish onboarding.");
      setStepIndex(STEPS.indexOf("photo"));
      return;
    }
    setSaving(true);
    try {
      await api.patch("/profile/me", {
        displayName,
        bio,
        level,
        preferredActivityIds: selectedActivities,
      });
      await refresh();
      router.replace("/(tabs)");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.progressTrack}>
        {STEPS.map((_, i) => (
          <View key={i} style={[styles.progressDot, i <= stepIndex && styles.progressDotActive]} />
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {step === "name" && (
          <>
            <Text style={styles.heading}>What should we call you?</Text>
            <TextInput style={styles.input} placeholder="Display name" value={displayName} onChangeText={setDisplayName} />
          </>
        )}

        {step === "photo" && (
          <>
            <Text style={styles.heading}>Add a photo</Text>
            <Pressable style={styles.photoPlaceholder} onPress={pickPhoto} disabled={uploadingPhoto}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.photoPreview} />
              ) : (
                <Text style={{ color: colors.muted }}>{uploadingPhoto ? "Uploading…" : "Tap to choose a photo"}</Text>
              )}
            </Pressable>
          </>
        )}

        {step === "sports" && (
          <>
            <Text style={styles.heading}>Pick your sports</Text>
            <View style={styles.chipRow}>
              {activities.map((a) => {
                const selected = selectedActivities.includes(a.id);
                return (
                  <Pressable
                    key={a.id}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() =>
                      setSelectedActivities((prev) => (selected ? prev.filter((id) => id !== a.id) : [...prev, a.id]))
                    }
                  >
                    <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{a.name}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {step === "level" && (
          <>
            <Text style={styles.heading}>Your activity level</Text>
            <View style={styles.chipRow}>
              {(["beginner", "intermediate", "advanced"] as SkillLevel[]).map((l) => (
                <Pressable key={l} style={[styles.chip, level === l && styles.chipSelected]} onPress={() => setLevel(l)}>
                  <Text style={[styles.chipLabel, level === l && styles.chipLabelSelected]}>{l}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {step === "bio" && (
          <>
            <Text style={styles.heading}>Tell people about yourself</Text>
            <TextInput style={[styles.input, styles.multiline]} placeholder="Intro bio" multiline value={bio} onChangeText={setBio} />
          </>
        )}

        {step === "permissions" && (
          <>
            <Text style={styles.heading}>Almost there</Text>
            <Text style={styles.body}>
              Sport Buddy uses your location to find nearby partners, and your calendar to sync scheduled events. You can
              grant these now or later from your profile.
            </Text>
            <Button
              label="Allow location & calendar"
              variant="secondary"
              onPress={() => api.patch("/profile/me/permissions", { locationGranted: true, calendarGranted: true })}
            />
          </>
        )}
      </ScrollView>

      <Button label={isLast ? (saving ? "Saving…" : "Finish") : "Continue"} onPress={next} disabled={saving} />
      {saving && <ActivityIndicator style={{ marginTop: spacing.sm }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.offWhite, padding: spacing.lg },
  progressTrack: { flexDirection: "row", gap: spacing.xs, justifyContent: "center", marginBottom: spacing.lg },
  progressDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  progressDotActive: { backgroundColor: colors.sageDark },
  content: { flexGrow: 1, gap: spacing.md },
  heading: { fontFamily: typography.fontFamilyBold, fontSize: 22, color: colors.charcoal },
  body: { fontFamily: typography.fontFamilyRegular, color: colors.muted },
  input: {
    backgroundColor: colors.white,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    minHeight: 44,
    fontFamily: typography.fontFamilyRegular,
  },
  multiline: { minHeight: 100, paddingTop: spacing.sm, textAlignVertical: "top" },
  photoPlaceholder: {
    height: 160,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  photoPreview: { width: "100%", height: "100%" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: radii.lg, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, minHeight: 44, justifyContent: "center" },
  chipSelected: { backgroundColor: colors.coral, borderColor: colors.coral },
  chipLabel: { fontFamily: typography.fontFamily, color: colors.charcoal },
  chipLabelSelected: { color: colors.white },
});
