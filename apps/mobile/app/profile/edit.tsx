import { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, StyleSheet, Pressable, ScrollView, Modal, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "../../src/components/Button";
import { Avatar } from "../../src/components/Avatar";
import { CityAutocomplete } from "../../src/components/CityAutocomplete";
import { SportAvailabilityCard, type SportSelection } from "../../src/components/SportAvailabilityCard";
import { colors, spacing, typography, radii } from "../../src/theme";
import { api, uploadPhoto } from "../../src/api/client";
import { useAuth } from "../../src/hooks/useAuth";
import type { Activity } from "../../src/api/types";

// F5: My Profile edit — photo, name, city, bio. Round 10, Fix 5: Preferred
// Activities editing (sport + level + per-sport availability, previously its
// own screen, profile/activities.tsx — now removed) is merged in here, so
// the pencil icon on the profile photo is the single entry point for
// everything. One Save button persists both the profile fields and the
// sports/availability changes together.
export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, refresh } = useAuth();
  // Preferred Activities rows on My Profile deep-link here with the tapped
  // activity's id so its card opens already expanded; every other entry
  // point (photo pencil, empty-state CTA) omits it, so every card starts
  // collapsed there.
  const { initialExpandedActivity } = useLocalSearchParams<{ initialExpandedActivity?: string }>();
  const [expandedActivityId, setExpandedActivityId] = useState<string | null>(initialExpandedActivity ?? null);
  const [displayName, setDisplayName] = useState(profile?.profile?.displayName ?? "");
  const [city, setCity] = useState(profile?.profile?.city ?? "");
  const [bio, setBio] = useState(profile?.profile?.bio ?? "");
  const [photoUrl, setPhotoUrl] = useState<string | null>(profile?.profile?.photoUrl ?? null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);

  const [activities, setActivities] = useState<Activity[]>([]);
  const [sports, setSports] = useState<Record<string, SportSelection>>({});
  const [initialSports, setInitialSports] = useState<Record<string, SportSelection>>({});
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    api.get<Activity[]>("/activities").then(setActivities);
  }, []);

  // Availability is per-sport server-side; fetch each selected sport's slots
  // directly (GET /availability?activityId=) rather than relying on the
  // profile payload, which doesn't disambiguate per-sport rows for this view.
  useEffect(() => {
    if (!profile) return;
    (async () => {
      const myPosts = await api.get<{ activityId: string; maxParticipants: number }[]>("/activity-posts/mine");
      const maxParticipantsByActivity = new Map(myPosts.map((p) => [p.activityId, p.maxParticipants]));

      const built: Record<string, SportSelection> = {};
      for (const ua of profile.activities) {
        const slots = await api.get<{ dayOfWeek?: number; startTime: string; endTime: string }[]>(
          `/availability?activityId=${ua.activityId}`
        );
        const days: SportSelection["days"] = {};
        for (const slot of slots) {
          if (slot.dayOfWeek === undefined) continue;
          days[slot.dayOfWeek] = { startTime: slot.startTime, endTime: slot.endTime };
        }
        built[ua.activityId] = {
          activityId: ua.activityId,
          level: ua.level,
          days,
          maxParticipants: maxParticipantsByActivity.get(ua.activityId) ?? 1,
        };
      }
      setSports(built);
      setInitialSports(built);
    })();
  }, [profile]);

  const availableToAdd = activities.filter((a) => !sports[a.id]);
  const sportsChanged = useMemo(() => JSON.stringify(sports) !== JSON.stringify(initialSports), [sports, initialSports]);

  function addSport(activityId: string) {
    setSports((prev) => ({ ...prev, [activityId]: { activityId, level: "beginner", days: {}, maxParticipants: 1 } }));
    setExpandedActivityId(activityId);
    setPickerOpen(false);
  }

  function removeSport(activityId: string) {
    setSports((prev) => {
      const next = { ...prev };
      delete next[activityId];
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
      if (days[dayOfWeek]) delete days[dayOfWeek];
      else days[dayOfWeek] = { startTime: "18:00", endTime: "20:00" };
      return { ...prev, [activityId]: { ...sport, days } };
    });
  }

  function setSportDayTime(activityId: string, dayOfWeek: number, field: "startTime" | "endTime", value: string) {
    setSports((prev) => {
      const sport = prev[activityId];
      return { ...prev, [activityId]: { ...sport, days: { ...sport.days, [dayOfWeek]: { ...sport.days[dayOfWeek], [field]: value } } } };
    });
  }

  function setSportMaxParticipants(activityId: string, value: number) {
    setSports((prev) => ({ ...prev, [activityId]: { ...prev[activityId], maxParticipants: value } }));
  }

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
      await api.patch("/profile/me", {
        displayName,
        city,
        bio,
        preferredActivities: Object.values(sports).map((s) => ({ activityId: s.activityId, level: s.level })),
      });
      if (sportsChanged) {
        for (const sport of Object.values(sports)) {
          const slots = Object.entries(sport.days).map(([dayOfWeek, time]) => ({
            dayOfWeek: Number(dayOfWeek),
            startTime: time.startTime,
            endTime: time.endTime,
            recurring: true,
          }));
          await api.put(`/availability?activityId=${sport.activityId}&maxParticipants=${sport.maxParticipants}`, slots);
        }
      }
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

        <Text style={styles.sectionHeader}>Preferred Activities</Text>
        <View style={styles.sectionDivider} />

        {Object.values(sports).map((sport) => (
          <SportAvailabilityCard
            key={sport.activityId}
            activityName={activities.find((a) => a.id === sport.activityId)?.name ?? ""}
            sport={sport}
            expanded={expandedActivityId === sport.activityId}
            onToggleExpanded={() =>
              setExpandedActivityId((prev) => (prev === sport.activityId ? null : sport.activityId))
            }
            onSetLevel={(level) => setSportLevel(sport.activityId, level)}
            onToggleDay={(day) => toggleSportDay(sport.activityId, day)}
            onSetDayTime={(day, field, value) => setSportDayTime(sport.activityId, day, field, value)}
            onSetMaxParticipants={(value) => setSportMaxParticipants(sport.activityId, value)}
            onRemove={() => removeSport(sport.activityId)}
          />
        ))}

        <Pressable style={styles.addButton} onPress={() => setPickerOpen(true)}>
          <Text style={styles.addButtonLabel}>+ Add Sport</Text>
        </Pressable>
      </ScrollView>

      {/* Bug fix batch 2, Bug 4: primary CTAs fixed outside the ScrollView. */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button label={saving ? "Saving…" : "Save"} onPress={save} disabled={saving} />
        <Button label="Cancel" variant="outline" onPress={() => router.back()} />
      </View>

      <Modal visible={pickerOpen} animationType="slide" transparent onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setPickerOpen(false)} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>Add a sport</Text>
          <View style={styles.sportGrid}>
            {availableToAdd.map((a) => (
              <Pressable key={a.id} style={styles.sportOption} onPress={() => addSport(a.id)}>
                <Text style={styles.sportOptionLabel}>{a.name}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
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
  sectionHeader: { fontFamily: typography.fontFamilyBold, fontSize: 14, color: colors.charcoal, marginTop: spacing.lg },
  sectionDivider: { height: 1, backgroundColor: colors.border, marginTop: spacing.sm, marginBottom: spacing.sm },
  addButton: { height: 52, borderRadius: radii.sm, borderWidth: 1.5, borderColor: colors.border, borderStyle: "dashed", alignItems: "center", justifyContent: "center", marginTop: spacing.md },
  addButtonLabel: { fontFamily: typography.fontFamily, fontSize: 15, color: colors.coral },
  footer: {
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.offWhite,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)" },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg, padding: spacing.lg, maxHeight: "70%" },
  handle: { width: 32, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: spacing.sm },
  sheetTitle: { fontFamily: typography.fontFamilyBold, fontSize: 17, color: colors.charcoal, textAlign: "center", marginBottom: spacing.md },
  sportGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  sportOption: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: radii.lg, backgroundColor: colors.offWhite, borderWidth: 1, borderColor: colors.border },
  sportOptionLabel: { fontFamily: typography.fontFamily, fontSize: 14, color: colors.charcoal },
});
