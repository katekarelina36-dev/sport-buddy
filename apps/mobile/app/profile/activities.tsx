import { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Modal, Alert, Platform } from "react-native";
import { useRouter } from "expo-router";
import { api } from "../../src/api/client";
import { useAuth } from "../../src/hooks/useAuth";
import { SportAvailabilityCard, type SportSelection } from "../../src/components/SportAvailabilityCard";
import { colors, spacing, typography, radii } from "../../src/theme";
import type { Activity } from "../../src/api/types";

// F5 (Round 2): dedicated "Preferred Activities" editor — each sport as an
// expanded card (level + per-day availability, same component as onboarding
// step 3), with remove + "+ Add Sport" (opens a catalog picker sheet).
export default function PreferredActivitiesScreen() {
  const router = useRouter();
  const { profile, refresh } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [sports, setSports] = useState<Record<string, SportSelection>>({});
  const [initialSports, setInitialSports] = useState<Record<string, SportSelection>>({});
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<Activity[]>("/activities").then(setActivities);
  }, []);

  // Availability is per-sport server-side; fetch each selected sport's slots
  // directly (GET /availability?activityId=) rather than relying on the
  // profile payload, which doesn't disambiguate per-sport rows for this view.
  // "How many partners" (maxParticipants) lives on the auto-generated
  // ActivityPost, read back via GET /activity-posts/mine.
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

  const hasChanges = useMemo(() => JSON.stringify(sports) !== JSON.stringify(initialSports), [sports, initialSports]);
  const availableToAdd = activities.filter((a) => !sports[a.id]);

  function addSport(activityId: string) {
    setSports((prev) => ({ ...prev, [activityId]: { activityId, level: "beginner", days: {}, maxParticipants: 1 } }));
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

  async function save() {
    setSaving(true);
    try {
      await api.patch("/profile/me", {
        preferredActivities: Object.values(sports).map((s) => ({ activityId: s.activityId, level: s.level })),
      });
      for (const sport of Object.values(sports)) {
        const slots = Object.entries(sport.days).map(([dayOfWeek, time]) => ({
          dayOfWeek: Number(dayOfWeek),
          startTime: time.startTime,
          endTime: time.endTime,
          recurring: true,
        }));
        await api.put(`/availability?activityId=${sport.activityId}&maxParticipants=${sport.maxParticipants}`, slots);
      }
      await refresh();
      Alert.alert("Profile updated");
      router.back();
    } catch (err) {
      Alert.alert("Couldn't save", (err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.headerButtonLeft}>Cancel</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Preferred Activities</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
        {Object.values(sports).map((sport) => (
          <SportAvailabilityCard
            key={sport.activityId}
            activityName={activities.find((a) => a.id === sport.activityId)?.name ?? ""}
            sport={sport}
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

      {/* Bug fix batch 2, Bug 4: primary CTA must be a fixed footer, never
          inside the ScrollView, so it can't be scrolled out of reach. */}
      <View style={styles.footer}>
        <Pressable style={[styles.saveButton, (!hasChanges || saving) && styles.saveButtonDisabled]} disabled={!hasChanges || saving} onPress={save}>
          <Text style={[styles.saveButtonLabel, (!hasChanges || saving) && styles.saveButtonLabelDisabled]}>{saving ? "Saving…" : "Save"}</Text>
        </Pressable>
      </View>

      <Modal visible={pickerOpen} animationType="slide" transparent onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setPickerOpen(false)} />
        <View style={styles.sheet}>
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
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", height: 56, paddingHorizontal: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerButtonLeft: { fontFamily: typography.fontFamily, fontSize: 15, color: colors.coral },
  headerSpacer: { width: 44 },
  headerTitle: { fontFamily: typography.fontFamilyBold, fontSize: 17, color: colors.charcoal },
  content: { padding: spacing.lg, paddingBottom: 80, gap: spacing.sm },
  addButton: { height: 52, borderRadius: radii.sm, borderWidth: 1.5, borderColor: colors.border, borderStyle: "dashed", alignItems: "center", justifyContent: "center", marginTop: spacing.md },
  addButtonLabel: { fontFamily: typography.fontFamily, fontSize: 15, color: colors.coral },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: Platform.OS === "ios" ? spacing.xl : spacing.md,
  },
  saveButton: { height: 52, borderRadius: radii.lg, backgroundColor: colors.coral, alignItems: "center", justifyContent: "center" },
  saveButtonDisabled: { backgroundColor: colors.border },
  saveButtonLabel: { fontFamily: typography.fontFamilyBold, fontSize: 16, color: colors.white },
  saveButtonLabelDisabled: { color: "#94A3B8" },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)" },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg, padding: spacing.lg, maxHeight: "70%" },
  handle: { width: 32, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: spacing.sm },
  sheetTitle: { fontFamily: typography.fontFamilyBold, fontSize: 17, color: colors.charcoal, textAlign: "center", marginBottom: spacing.md },
  sportGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  sportOption: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: radii.lg, backgroundColor: colors.offWhite, borderWidth: 1, borderColor: colors.border },
  sportOptionLabel: { fontFamily: typography.fontFamily, fontSize: 14, color: colors.charcoal },
});
