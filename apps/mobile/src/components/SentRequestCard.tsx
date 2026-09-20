import { Pressable, Text, View, StyleSheet } from "react-native";
import { Avatar } from "./Avatar";
import { colors, radii, spacing, typography, shadow } from "../theme";

interface Props {
  name: string;
  activityName: string;
  photoUrl?: string | null;
  status: "pending" | "approved";
  onStartChat?: () => void;
}

// Flat single-layer card for "Requests sent by me" — replaces the old
// nested outer/inner Card + Badge treatment with a dedicated component so
// the "Requests to me" tab (Approve/Decline queue, a different layout
// entirely) is untouched.
export function SentRequestCard({ name, activityName, photoUrl, status, onStartChat }: Props) {
  const approved = status === "approved";
  return (
    <View style={styles.card}>
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <View style={[styles.badge, approved ? styles.badgeApproved : styles.badgePending]}>
            <Text style={[styles.badgeLabel, approved ? styles.badgeLabelApproved : styles.badgeLabelPending]}>
              {approved ? "Approved" : "Pending"}
            </Text>
          </View>
        </View>
        <Text style={styles.subtitle}>{activityName}</Text>
        <Avatar photoUrl={photoUrl} size={48} />
      </View>
      {approved && (
        <Pressable style={styles.footer} onPress={onStartChat}>
          <Text style={styles.footerLabel}>Start a chat</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    ...shadow,
  },
  content: { padding: spacing.md, gap: spacing.sm },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.sm },
  name: { flex: 1, fontFamily: typography.fontFamilyBold, fontSize: 16, color: colors.charcoal },
  subtitle: { fontFamily: typography.fontFamilyRegular, fontSize: 13, color: colors.muted },
  badge: { borderRadius: radii.sm, paddingHorizontal: 10, paddingVertical: 4 },
  badgePending: { backgroundColor: colors.sageLight },
  badgeApproved: { backgroundColor: colors.sageDark },
  badgeLabel: { fontFamily: typography.fontFamily, fontSize: 12 },
  badgeLabelPending: { color: colors.sageDark },
  badgeLabelApproved: { color: colors.white },
  // Flush full-width footer, no side/bottom margins: the card's own
  // overflow:"hidden" + borderRadius clips this rectangle's bottom corners
  // to match, so it reads as an integrated footer rather than a button
  // floating inside the card.
  footer: { height: 48, backgroundColor: colors.coral, alignItems: "center", justifyContent: "center" },
  footerLabel: { fontFamily: typography.fontFamilyBold, fontSize: 15, color: colors.white },
});
