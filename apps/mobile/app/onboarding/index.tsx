import { useEffect, useState } from "react";
import { View, Text, TextInput, StyleSheet, Pressable, ScrollView, ActivityIndicator, Image, Alert, Platform } from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Button } from "../../src/components/Button";
import { SportAvailabilityCard, type SportSelection } from "../../src/components/SportAvailabilityCard";
import { colors, spacing, typography, radii } from "../../src/theme";
import { api, uploadPhoto } from "../../src/api/client";
import { useAuth } from "../../src/hooks/useAuth";
import { calculateAge, defaultDateOfBirth, MIN_ONBOARDING_AGE } from "../../src/utils/age";
import type { Activity } from "../../src/api/types";

const STEPS = ["name_city", "dob", "sports", "photo"] as const;

// F1: 4-step onboarding wizard (Name+City, Date of Birth, Sports w/ per-sport
// level+availability, Photo). Mandatory fields gate reaching Home; progress
// bar reflects step (25/50/75/100%). Per spec, sport detail expands inline
// below its card — implemented here as a full-width block beneath the grid
// per selected sport (keeps the grid a clean 3-column layout on small screens
// instead of each card expanding in place, which would misalign siblings).
export default function OnboardingScreen() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [stepIndex, setStepIndex] = useState(0);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [saving, setSaving] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [city, setCity] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState<Date>(defaultDateOfBirth());
  const [showDatePicker, setShowDatePicker] = useState(Platform.OS === "ios");
  const [sports, setSports] = useState<Record<string, SportSelection>>({});
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    api.get<Activity[]>("/activities").then(setActivities);
  }, []);

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;
  const progressPct = ((stepIndex + 1) / STEPS.length) * 100;

  function toggleSport(activityId: string) {
    setSports((prev) => {
      const next = { ...prev };
      if (next[activityId]) {
        delete next[activityId];
      } else {
        next[activityId] = { activityId, level: "beginner", days: {} };
      }
      return next;
    });
  }

  function setSportLevel(activityId: string, level: SportSelection["level"]) {
    setSports((prev) => ({ ...prev, [activityId]: { ...prev[activityId], level } }));
  }

  function toggleSportDay(activityId: string, dayOfWeek: number) {
    setSports((prev) => {
      const sport = prev[activityId];
      const days = { ...sport.days };
      if (days[dayOfWeek]) {
        delete days[dayOfWeek];
      } else {
        days[dayOfWeek] = { startTime: "18:00", endTime: "20:00" };
      }
      return { ...prev, [activityId]: { ...sport, days } };
    });
  }

  function setSportDayTime(activityId: string, dayOfWeek: number, field: "startTime" | "endTime", value: string) {
    setSports((prev) => {
      const sport = prev[activityId];
      return { ...prev, [activityId]: { ...sport, days: { ...sport.days, [dayOfWeek]: { ...sport.days[dayOfWeek], [field]: value } } } };
    });
  }

  async function pickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow photo library access to add a profile photo.");
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
      await uploadPhoto(result.assets[0].uri);
      setPhotoUri(result.assets[0].uri);
    } catch (err) {
      Alert.alert("Couldn't upload photo", (err as Error).message);
    } finally {
      setUploadingPhoto(false);
    }
  }

  function canContinue(): boolean {
    if (step === "name_city") return displayName.trim().length > 0 && city.trim().length > 0;
    if (step === "dob") return calculateAge(dateOfBirth) >= MIN_ONBOARDING_AGE;
    if (step === "sports") return Object.keys(sports).length > 0;
    return true;
  }

  async function next() {
    if (step === "dob" && calculateAge(dateOfBirth) < MIN_ONBOARDING_AGE) {
      Alert.alert("Must be 16 or older", `You need to be at least ${MIN_ONBOARDING_AGE} to use Sport Buddy.`);
      return;
    }
    if (!isLast) {
      setStepIndex((i) => i + 1);
      return;
    }
    if (!photoUri) {
      Alert.alert("Add a photo first", "A profile photo is required before you can finish onboarding.");
      return;
    }
    setSaving(true);
    try {
      await api.patch("/profile/me", {
        displayName,
        city,
        dateOfBirth: dateOfBirth.toISOString(),
        preferredActivities: Object.values(sports).map((s) => ({ activityId: s.activityId, level: s.level })),
      });
      // Per-sport availability (F1 step 3) — saved separately, scoped by ?activityId=.
      for (const sport of Object.values(sports)) {
        const slots = Object.entries(sport.days).map(([dayOfWeek, time]) => ({
          dayOfWeek: Number(dayOfWeek),
          startTime: time.startTime,
          endTime: time.endTime,
          recurring: true,
        }));
        if (slots.length > 0) {
          await api.put(`/availability?activityId=${sport.activityId}`, slots);
        }
      }
      await refresh();
      router.replace("/(tabs)");
    } catch (err) {
      Alert.alert("Couldn't finish onboarding", (err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
      </View>

      <View style={styles.headerRow}>
        {stepIndex > 0 ? (
          <Pressable accessibilityLabel="Back" style={styles.backButton} onPress={() => setStepIndex((i) => i - 1)}>
            <Text style={styles.backArrow}>←</Text>
          </Pressable>
        ) : (
          <View style={styles.backButton} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {step === "name_city" && (
          <>
            <Text style={styles.title}>Tell us about yourself</Text>
            <Text style={styles.label}>Your name</Text>
            <TextInput style={styles.input} placeholder="Enter your name" value={displayName} onChangeText={setDisplayName} />
            <Text style={[styles.label, { marginTop: spacing.md }]}>Your city</Text>
            <TextInput style={styles.input} placeholder="Enter your city" value={city} onChangeText={setCity} />
          </>
        )}

        {step === "dob" && (
          <>
            <Text style={styles.title}>When were you born?</Text>
            <Text style={styles.subtitle}>We use this to show your age on your profile</Text>
            <View style={styles.datePickerWrap}>
              {(showDatePicker || Platform.OS === "ios") && (
                <DateTimePicker
                  value={dateOfBirth}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  maximumDate={(() => {
                    const max = new Date();
                    max.setFullYear(max.getFullYear() - MIN_ONBOARDING_AGE);
                    return max;
                  })()}
                  onChange={(_event, date) => {
                    if (Platform.OS === "android") setShowDatePicker(false);
                    if (date) setDateOfBirth(date);
                  }}
                />
              )}
              {Platform.OS === "android" && !showDatePicker && (
                <Button label={dateOfBirth.toDateString()} variant="outline" onPress={() => setShowDatePicker(true)} />
              )}
            </View>
          </>
        )}

        {step === "sports" && (
          <>
            <Text style={styles.title}>What sports do you play?</Text>
            <Text style={styles.subtitle}>Select all that apply. You can add more later.</Text>
            <View style={styles.sportGrid}>
              {activities.map((a) => {
                const selected = Boolean(sports[a.id]);
                return (
                  <Pressable key={a.id} style={[styles.sportCard, selected && styles.sportCardSelected]} onPress={() => toggleSport(a.id)}>
                    <Text style={styles.sportIcon}>🏅</Text>
                    <Text style={styles.sportName} numberOfLines={2}>
                      {a.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {Object.values(sports).map((sport) => (
              <SportAvailabilityCard
                key={sport.activityId}
                activityName={activities.find((a) => a.id === sport.activityId)?.name ?? ""}
                sport={sport}
                onSetLevel={(level) => setSportLevel(sport.activityId, level)}
                onToggleDay={(day) => toggleSportDay(sport.activityId, day)}
                onSetDayTime={(day, field, value) => setSportDayTime(sport.activityId, day, field, value)}
              />
            ))}
          </>
        )}

        {step === "photo" && (
          <>
            <Text style={styles.title}>Add your photo</Text>
            <Text style={styles.subtitle}>Help others recognize you</Text>
            <Pressable style={styles.photoCircle} onPress={pickPhoto} disabled={uploadingPhoto}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.photoImage} />
              ) : (
                <Text style={styles.photoIcon}>{uploadingPhoto ? "…" : "📷"}</Text>
              )}
            </Pressable>
            <Pressable onPress={pickPhoto} disabled={uploadingPhoto}>
              <Text style={styles.choosePhotoLabel}>{uploadingPhoto ? "Uploading…" : "Choose photo"}</Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      <Button
        label={isLast ? (saving ? "Saving…" : "Complete profile") : "Continue"}
        onPress={next}
        disabled={saving || !canContinue()}
      />
      {saving && <ActivityIndicator style={{ marginTop: spacing.sm }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.offWhite, padding: spacing.md },
  progressTrack: { height: 4, backgroundColor: colors.border, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: 4, backgroundColor: colors.sageDark },
  headerRow: { height: 44, justifyContent: "center", marginTop: spacing.sm },
  backButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  backArrow: { fontSize: 22, color: colors.charcoal },
  content: { flexGrow: 1, paddingHorizontal: spacing.sm },
  title: { fontFamily: typography.fontFamilyBold, fontSize: 20, color: colors.charcoal, textAlign: "center", marginTop: spacing.lg },
  subtitle: { fontFamily: typography.fontFamilyRegular, fontSize: 14, color: colors.muted, textAlign: "center", marginTop: spacing.xs, marginBottom: spacing.lg },
  label: { fontFamily: typography.fontFamilyRegular, fontSize: 14, color: colors.muted, marginBottom: spacing.xs, marginTop: spacing.lg },
  input: {
    backgroundColor: colors.white,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    minHeight: 52,
    fontFamily: typography.fontFamilyRegular,
    fontSize: 16,
    color: colors.charcoal,
  },
  datePickerWrap: { alignItems: "center", marginTop: spacing.lg },
  sportGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  sportCard: {
    width: "30%",
    aspectRatio: 1,
    backgroundColor: colors.white,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xs,
    gap: 4,
  },
  sportCardSelected: { borderColor: colors.coral, backgroundColor: "#FFF5F3" },
  sportIcon: { fontSize: 24 },
  sportName: { fontFamily: typography.fontFamily, fontSize: 12, color: colors.charcoal, textAlign: "center" },
  photoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.border,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  photoImage: { width: "100%", height: "100%" },
  photoIcon: { fontSize: 28 },
  choosePhotoLabel: { fontFamily: typography.fontFamily, fontSize: 15, color: colors.coral, textAlign: "center", marginTop: spacing.md },
});
