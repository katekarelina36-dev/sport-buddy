import { useEffect, useState } from "react";
import { View, Text, Pressable, Modal, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { getChatSocket } from "../api/socket";
import { colors, spacing, typography, radii } from "../theme";

// Communities — Unlock Pop-up: fired once, the moment the caller's third
// completed Event flips UserProfile.communityUnlockNotified server-side
// (see bumpCompletedTrainings in routes/training.ts), delivered over the
// same per-user socket room used for the pending-requests badge.
export function CommunityUnlockModal() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let active = true;
    getChatSocket().then((socket) => {
      socket.on("community:unlocked", () => {
        if (active) setVisible(true);
      });
    });
    return () => {
      active = false;
      getChatSocket().then((socket) => socket.off("community:unlocked"));
    };
  }, []);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.emoji}>🎉</Text>
          <Text style={styles.title}>You've unlocked Communities!</Text>
          <Text style={styles.body}>You've completed 3 Events — you can now create your own Community and bring your sport buddies together.</Text>
          <Pressable
            style={styles.primaryButton}
            onPress={() => {
              setVisible(false);
              router.push("/communities/create");
            }}
          >
            <Text style={styles.primaryButtonLabel}>Create a Community</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => setVisible(false)}>
            <Text style={styles.secondaryButtonLabel}>Maybe later</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center", padding: spacing.lg },
  card: { width: "100%", maxWidth: 340, backgroundColor: colors.white, borderRadius: radii.lg, padding: spacing.lg, alignItems: "center" },
  emoji: { fontSize: 40, marginBottom: spacing.sm },
  title: { fontFamily: typography.fontFamilyBold, fontSize: 19, color: colors.charcoal, textAlign: "center" },
  body: { fontFamily: typography.fontFamilyRegular, fontSize: 14, color: colors.muted, textAlign: "center", marginTop: spacing.sm, lineHeight: 20 },
  primaryButton: { height: 48, width: "100%", borderRadius: radii.lg, backgroundColor: colors.coral, alignItems: "center", justifyContent: "center", marginTop: spacing.lg },
  primaryButtonLabel: { fontFamily: typography.fontFamilyBold, fontSize: 15, color: colors.white },
  secondaryButton: { height: 44, width: "100%", alignItems: "center", justifyContent: "center", marginTop: spacing.xs },
  secondaryButtonLabel: { fontFamily: typography.fontFamilyRegular, fontSize: 14, color: colors.muted },
});
