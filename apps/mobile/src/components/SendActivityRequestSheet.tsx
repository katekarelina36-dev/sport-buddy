import { useEffect, useState } from "react";
import { View, Text, Modal, Pressable, StyleSheet, Alert, ScrollView, ImageBackground } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "./Button";
import { WeeklyAvailabilityWidget, type DaySlot } from "./WeeklyAvailabilityWidget";
import { api, resolveMediaUrl } from "../api/client";
import { colors, spacing, typography } from "../theme";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSent: () => void;
  targetUserId: string;
  targetUserName: string;
  activityId: string;
  activityName: string;
  activityPhotoUrl?: string | null;
  slots: DaySlot[];
}

// Bug fix batch 3, section 9.3: Mon..Sun, matching every other day picker.
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

// UI Redesign Final, section 5: Send Activity Request is now a full-screen
// modal (was a bottom sheet) with a photo hero, matching the Figma mock.
// Requester must still pick one specific day+time from the target's
// availability for this sport before submitting (F7). Bug fix batch 3,
// section 9.2: the earliest available day (Mon-first) is pre-selected on
// open, so its time range is visible immediately without an extra tap.
export function SendActivityRequestSheet({
  visible,
  onClose,
  onSent,
  targetUserId,
  targetUserName,
  activityId,
  activityName,
  activityPhotoUrl,
  slots,
}: Props) {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<DaySlot | null>(null);
  const [sending, setSending] = useState(false);
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  useEffect(() => {
    if (!visible) return;
    const earliestDay = DAY_ORDER.find((d) => slots.some((s) => s.dayOfWeek === d));
    setSelected(slots.find((s) => s.dayOfWeek === earliestDay) ?? null);
  }, [visible, slots]);

  async function submit() {
    if (!selected) return;
    setSending(true);
    try {
      await api.post("/activity-requests", {
        targetUserId,
        activityId,
        selectedDayOfWeek: selected.dayOfWeek,
        selectedStartTime: selected.startTime,
        selectedEndTime: selected.endTime,
      });
      onSent();
      onClose();
      setSelected(null);
    } catch (err) {
      Alert.alert("Couldn't send request", (err as Error).message);
    } finally {
      setSending(false);
    }
  }

  const heroUri = resolveMediaUrl(activityPhotoUrl);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={styles.screen}>
        {heroUri ? (
          <ImageBackground source={{ uri: heroUri }} style={styles.hero} resizeMode="cover">
            <HeroOverlay activityName={activityName} targetUserName={targetUserName} />
          </ImageBackground>
        ) : (
          <LinearGradient colors={[colors.coral, colors.sageDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <HeroOverlay activityName={activityName} targetUserName={targetUserName} />
          </LinearGradient>
        )}
        <Pressable accessibilityLabel="Close" style={[styles.closeButton, { top: insets.top + 8 }]} onPress={onClose}>
          <Text style={styles.closeIcon}>×</Text>
        </Pressable>

        <View style={styles.content}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text style={styles.sectionLabel}>{targetUserName}'s availability</Text>

            <WeeklyAvailabilityWidget slots={slots} variant="select" selectedDay={selected?.dayOfWeek ?? null} onSelectDay={setSelected} />

            {selected && (
              <View style={styles.selectedPill}>
                <Text style={styles.selectedPillText}>
                  {dayNames[selected.dayOfWeek]} · {selected.startTime} – {selected.endTime}
                </Text>
              </View>
            )}
            <Text style={styles.helperText}>Available times shown based on their schedule</Text>
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
            <Pressable style={[styles.submitButton, (!selected || sending) && styles.submitButtonDisabled]} disabled={!selected || sending} onPress={submit}>
              <Text style={[styles.submitButtonLabel, (!selected || sending) && styles.submitButtonLabelDisabled]}>
                {sending ? "Sending…" : "Send Request"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function HeroOverlay({ activityName, targetUserName }: { activityName: string; targetUserName: string }) {
  return (
    <>
      <View style={styles.heroOverlay} />
      <View style={styles.heroText}>
        <Text style={styles.heroTitle}>Request to play {activityName}</Text>
        <Text style={styles.heroSubtitle}>with {targetUserName}</Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  hero: { height: 240, justifyContent: "flex-end" },
  heroOverlay: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,0.40)" },
  heroText: { padding: 16 },
  heroTitle: { fontFamily: typography.fontFamilyBold, fontSize: 22, color: colors.textOnDark },
  heroSubtitle: { fontFamily: typography.fontFamilyRegular, fontSize: 15, color: "rgba(248,250,252,0.85)", marginTop: 2 },
  closeButton: { position: "absolute", right: 16, width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  closeIcon: { fontSize: 26, color: colors.textOnDark },
  content: { flex: 1, backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -20 },
  scrollContent: { padding: spacing.lg, paddingBottom: 80 },
  sectionLabel: { fontFamily: typography.fontFamilyBold, fontSize: 14, color: colors.charcoal, marginBottom: spacing.md },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.white },
  selectedPill: {
    alignSelf: "center",
    backgroundColor: colors.primaryTint1,
    borderWidth: 1.5,
    borderColor: colors.coral,
    borderRadius: 20,
    height: 40,
    paddingHorizontal: spacing.md,
    justifyContent: "center",
    marginTop: spacing.md,
  },
  selectedPillText: { fontFamily: typography.fontFamily, fontSize: 14, color: colors.coral },
  helperText: { fontFamily: typography.fontFamilyRegular, fontSize: 12, color: colors.textMuted, fontStyle: "italic", textAlign: "center", marginTop: spacing.sm },
  submitButton: { height: 52, borderRadius: 24, backgroundColor: colors.coral, alignItems: "center", justifyContent: "center" },
  submitButtonDisabled: { backgroundColor: colors.primaryTint2 },
  submitButtonLabel: { fontFamily: typography.fontFamilyBold, fontSize: 16, color: colors.textOnDark },
  submitButtonLabelDisabled: { color: "rgba(248,250,252,0.6)" },
});
