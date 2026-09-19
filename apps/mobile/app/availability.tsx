import { useState } from "react";
import { View, Text, StyleSheet, Alert, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AvailabilityPicker } from "../src/components/AvailabilityPicker";
import { Button } from "../src/components/Button";
import { colors, spacing, typography } from "../src/theme";
import { api } from "../src/api/client";
import type { AvailabilitySlot } from "../src/api/types";

// F9: "Couldn't find a match?" waitlist subscribe sheet.
// Bug fix batch 3, section 8.1: this screen's other mode (a standalone
// general "Edit Availability" for My Profile) has been removed — availability
// is edited inline within each sport card on the Preferred Activities screen.
export default function AvailabilityScreen() {
  const { activityId } = useLocalSearchParams<{ activityId?: string }>();
  const router = useRouter();
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await api.post("/waitlist", { activityId, availabilityWindow: { slots } });
      Alert.alert("Subscribed", "We'll notify you when a match opens up.");
      router.back();
    } catch (err) {
      Alert.alert("Couldn't save", (err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Choose time & get notified</Text>
      <AvailabilityPicker value={slots} onChange={setSlots} />
      <Button label="Subscribe" onPress={save} disabled={saving} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.offWhite },
  container: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xl },
  title: { fontFamily: typography.fontFamilyBold, fontSize: 20, color: colors.charcoal },
});
