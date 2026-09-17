import { useEffect, useState } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AvailabilityPicker } from "../src/components/AvailabilityPicker";
import { Button } from "../src/components/Button";
import { colors, spacing, typography } from "../src/theme";
import { api } from "../src/api/client";
import type { AvailabilitySlot } from "../src/api/types";

// F6 screen wrapper: same component used from My Profile edit (F5) and as the
// "Couldn't find a match?" waitlist subscribe sheet (F9), switched by `mode`.
export default function AvailabilityScreen() {
  const { mode, activityId } = useLocalSearchParams<{ mode?: string; activityId?: string }>();
  const router = useRouter();
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [saving, setSaving] = useState(false);
  const isWaitlist = mode === "waitlist";

  useEffect(() => {
    if (!isWaitlist) {
      api.get<AvailabilitySlot[]>("/availability").then(setSlots);
    }
  }, [isWaitlist]);

  async function save() {
    setSaving(true);
    try {
      if (isWaitlist) {
        await api.post("/waitlist", { activityId, availabilityWindow: { slots } });
        Alert.alert("Subscribed", "We'll notify you when a match opens up.");
      } else {
        await api.put("/availability", slots);
      }
      router.back();
    } catch (err) {
      Alert.alert("Couldn't save", (err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{isWaitlist ? "Choose time & get notified" : "Your availability"}</Text>
      <AvailabilityPicker value={slots} onChange={setSlots} />
      <Button label={isWaitlist ? "Subscribe" : "Save"} onPress={save} disabled={saving} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.offWhite, padding: spacing.lg, gap: spacing.lg },
  title: { fontFamily: typography.fontFamilyBold, fontSize: 20, color: colors.charcoal },
});
