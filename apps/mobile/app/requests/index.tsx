import { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import { useFocusEffect } from "expo-router";
import { api } from "../../src/api/client";
import { Card } from "../../src/components/Card";
import { Button } from "../../src/components/Button";
import { colors, spacing, typography } from "../../src/theme";
import type { ActivityRequest } from "../../src/api/types";

// F8: pending Activity Requests queue for the post owner, approve/decline.
export default function RequestsScreen() {
  const [requests, setRequests] = useState<ActivityRequest[]>([]);

  const load = useCallback(() => {
    api.get<ActivityRequest[]>("/activity-requests/pending").then(setRequests);
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
      <Text style={styles.title}>Pending requests</Text>
      <FlatList
        data={requests}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.offWhite, padding: spacing.lg },
  title: { fontFamily: typography.fontFamilyBold, fontSize: 20, color: colors.charcoal, marginBottom: spacing.md },
  name: { fontFamily: typography.fontFamily, fontSize: 16, color: colors.charcoal },
  meta: { fontFamily: typography.fontFamilyRegular, color: colors.muted, fontSize: 13 },
  row: { flexDirection: "row", gap: spacing.sm },
  empty: { fontFamily: typography.fontFamilyRegular, color: colors.muted, textAlign: "center", marginTop: spacing.xl },
});
