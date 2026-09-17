import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { api } from "../../src/api/client";
import { Card } from "../../src/components/Card";
import { Badge } from "../../src/components/Badge";
import { Button } from "../../src/components/Button";
import { colors, spacing, typography } from "../../src/theme";
import type { ActivityPost } from "../../src/api/types";

// F4: full Activity Post detail. F7: "Send Activity Request" for a chosen slot.
export default function PostDetailScreen() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const router = useRouter();
  const [post, setPost] = useState<ActivityPost | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api.get<ActivityPost>(`/activity-posts/${postId}`).then(setPost);
  }, [postId]);

  if (!post) return <ActivityIndicator style={{ marginTop: spacing.xl }} />;

  async function sendRequest() {
    if (!selectedSlot) {
      Alert.alert("Pick a time slot first");
      return;
    }
    setSending(true);
    try {
      await api.post("/activity-requests", { postId: post!.id, slotId: selectedSlot });
      Alert.alert("Request sent!", "You'll be notified if it's accepted.");
      router.back();
    } catch (err) {
      Alert.alert("Couldn't send request", (err as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card style={{ gap: spacing.sm }}>
        <Text style={styles.name}>{post.author.profile?.displayName}</Text>
        <Badge label={post.level} />
        {post.author.profile?.bio && <Text style={styles.bio}>{post.author.profile.bio}</Text>}
        <Text style={styles.stat}>{post.author.profile?.successfulTrainingsCount ?? 0} completed sessions on the platform</Text>
      </Card>

      <Card style={{ gap: spacing.sm, marginTop: spacing.md }}>
        <Text style={styles.sectionHeader}>Available slots</Text>
        {post.slots.map((slot) => (
          <Pressable
            key={slot.id}
            disabled={slot.isFilled}
            onPress={() => setSelectedSlot(slot.id)}
            style={[styles.slot, selectedSlot === slot.id && styles.slotSelected, slot.isFilled && styles.slotFilled]}
          >
            <Text style={styles.slotText}>
              {new Date(slot.date).toDateString()} · {slot.startTime}–{slot.endTime} {slot.isFilled ? "(filled)" : ""}
            </Text>
          </Pressable>
        ))}
      </Card>

      <View style={styles.actions}>
        <Button label={sending ? "Sending…" : "Send Activity Request"} onPress={sendRequest} disabled={sending} />
        <Button label="Back" variant="outline" onPress={() => router.back()} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, backgroundColor: colors.offWhite, flexGrow: 1 },
  name: { fontFamily: typography.fontFamilyBold, fontSize: 20, color: colors.charcoal },
  bio: { fontFamily: typography.fontFamilyRegular, color: colors.muted },
  stat: { fontFamily: typography.fontFamily, fontSize: 13, color: colors.sageDark },
  sectionHeader: { fontFamily: typography.fontFamily, color: colors.sageDark },
  slot: { padding: spacing.sm, borderRadius: 12, backgroundColor: colors.offWhite },
  slotSelected: { backgroundColor: colors.coral },
  slotFilled: { opacity: 0.4 },
  slotText: { fontFamily: typography.fontFamilyRegular, color: colors.charcoal },
  actions: { gap: spacing.sm, marginTop: spacing.lg },
});
