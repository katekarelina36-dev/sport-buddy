import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, Modal, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing, typography, radii } from "../theme";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (values: { body: string; isPinned: boolean }) => void;
  submitting?: boolean;
}

// Communities, Tab 3 — Feed: "New Post" composer (organiser/assistant only).
export function PostComposerSheet({ visible, onClose, onSubmit, submitting }: Props) {
  const insets = useSafeAreaInsets();
  const [body, setBody] = useState("");
  const [isPinned, setIsPinned] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setBody("");
    setIsPinned(false);
  }, [visible]);

  const canSubmit = body.trim().length > 0 && !submitting;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}>
          <View style={styles.handle} />
          <Text style={styles.title}>New Post</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Share an update with your community..."
            placeholderTextColor={colors.muted}
            value={body}
            onChangeText={setBody}
            multiline
          />
          <Pressable style={styles.toggleRow} onPress={() => setIsPinned((p) => !p)}>
            <Text style={styles.toggleLabel}>Pin this post</Text>
            <View style={[styles.toggleTrack, isPinned && styles.toggleTrackOn]}>
              <View style={[styles.toggleThumb, isPinned && styles.toggleThumbOn]} />
            </View>
          </Pressable>
          <Pressable
            style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
            disabled={!canSubmit}
            onPress={() => onSubmit({ body: body.trim(), isPinned })}
          >
            <Text style={[styles.submitButtonLabel, !canSubmit && styles.submitButtonLabelDisabled]}>{submitting ? "Posting…" : "Post"}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg, padding: spacing.lg },
  handle: { width: 32, height: 4, borderRadius: 2, backgroundColor: "#CBD5E0", alignSelf: "center", marginBottom: spacing.sm },
  title: { fontFamily: typography.fontFamilyBold, fontSize: 17, color: colors.charcoal, textAlign: "center" },
  textArea: { backgroundColor: colors.white, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border, padding: spacing.md, minHeight: 120, fontFamily: typography.fontFamilyRegular, fontSize: 15, color: colors.charcoal, marginTop: spacing.md, textAlignVertical: "top" },
  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.md },
  toggleLabel: { fontFamily: typography.fontFamilyRegular, fontSize: 14, color: colors.charcoal },
  toggleTrack: { width: 44, height: 26, borderRadius: 13, backgroundColor: colors.border, padding: 2 },
  toggleTrackOn: { backgroundColor: colors.coral },
  toggleThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.white },
  toggleThumbOn: { transform: [{ translateX: 18 }] },
  submitButton: { height: 52, borderRadius: radii.lg, backgroundColor: colors.coral, alignItems: "center", justifyContent: "center", marginTop: spacing.lg },
  submitButtonDisabled: { backgroundColor: colors.border },
  submitButtonLabel: { fontFamily: typography.fontFamilyBold, fontSize: 16, color: colors.white },
  submitButtonLabelDisabled: { color: "#94A3B8" },
});
