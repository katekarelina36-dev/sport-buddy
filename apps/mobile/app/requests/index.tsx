import { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, Pressable } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { api } from "../../src/api/client";
import { Card } from "../../src/components/Card";
import { Button } from "../../src/components/Button";
import { Badge } from "../../src/components/Badge";
import { colors, spacing, typography } from "../../src/theme";
import type { ActivityRequest } from "../../src/api/types";

type Tab = "received" | "sent";

// F8: Pending Requests screen. "Requests to me" (default) is the post owner's
// approve/decline queue; "Requests sent by me" is the requester's own view of
// outgoing requests — pending ones stay plain, approved ones turn green and
// offer a "Start a chat" CTA into the chat the approval created, declined ones
// simply aren't returned by the API so they fall out of the list on their own.
export default function RequestsScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("received");
  const [received, setReceived] = useState<ActivityRequest[]>([]);
  const [sent, setSent] = useState<ActivityRequest[]>([]);

  const load = useCallback(() => {
    api.get<ActivityRequest[]>("/activity-requests/pending").then(setReceived);
    api.get<ActivityRequest[]>("/activity-requests/sent").then(setSent);
  }, []);

  useFocusEffect(load);
  useEffect(load, [load]);

  async function approve(id: string) {
    await api.post(`/activity-requests/${id}/approve`);
    load();
  }
  async function decline(id: string) {
    await api.post(`/activity-requests/${id}/reject`);
    load();
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Requests to me"
          style={[styles.tab, tab === "received" && styles.tabActive]}
          onPress={() => setTab("received")}
        >
          <Text style={[styles.tabLabel, tab === "received" && styles.tabLabelActive]}>Requests to me</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Requests sent by me"
          style={[styles.tab, tab === "sent" && styles.tabActive]}
          onPress={() => setTab("sent")}
        >
          <Text style={[styles.tabLabel, tab === "sent" && styles.tabLabelActive]}>Requests sent by me</Text>
        </Pressable>
      </View>

      {tab === "received" ? (
        <FlatList
          data={received}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ gap: spacing.md }}
          ListEmptyComponent={<Text style={styles.empty}>No pending requests right now.</Text>}
          renderItem={({ item }) => (
            <Card style={{ gap: spacing.sm }}>
              <Text style={styles.name}>{item.requester.profile?.displayName}</Text>
              <Text style={styles.meta}>
                {item.activity.name} · {new Date(item.slot.date).toDateString()} {item.slot.startTime}
              </Text>
              <View style={styles.row}>
                <Button label="Approve" onPress={() => approve(item.id)} />
                <Button label="Decline" variant="outline" onPress={() => decline(item.id)} />
              </View>
            </Card>
          )}
        />
      ) : (
        <FlatList
          data={sent}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ gap: spacing.md }}
          ListEmptyComponent={<Text style={styles.empty}>You haven't sent any requests yet.</Text>}
          renderItem={({ item }) => (
            <Card style={[{ gap: spacing.sm }, item.status === "approved" && styles.approvedCard]}>
              <View style={styles.cardHeader}>
                <Text style={styles.name}>{item.post.author.profile?.displayName}</Text>
                <Badge label={item.status === "approved" ? "Approved" : "Pending"} tone={item.status === "approved" ? "sage" : "coral"} />
              </View>
              <Text style={styles.meta}>
                {item.activity.name} · {new Date(item.slot.date).toDateString()} {item.slot.startTime}
              </Text>
              {item.status === "approved" && item.chatId && (
                <Button label="Start a chat" onPress={() => router.push(`/chat/${item.chatId}`)} />
              )}
            </Card>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.offWhite, padding: spacing.lg },
  tabs: { flexDirection: "row", gap: spacing.lg, marginBottom: spacing.md },
  tab: { paddingBottom: spacing.xs, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabActive: { borderBottomColor: colors.coral },
  tabLabel: { fontFamily: typography.fontFamilyBold, fontSize: 18, color: colors.muted },
  tabLabelActive: { color: colors.charcoal },
  name: { fontFamily: typography.fontFamily, fontSize: 16, color: colors.charcoal },
  meta: { fontFamily: typography.fontFamilyRegular, color: colors.muted, fontSize: 13 },
  row: { flexDirection: "row", gap: spacing.sm },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  approvedCard: { backgroundColor: colors.sageLight },
  empty: { fontFamily: typography.fontFamilyRegular, color: colors.muted, textAlign: "center", marginTop: spacing.xl },
});
