import { useEffect, useState } from "react";
import { View, Text, TextInput, StyleSheet, Pressable, Modal } from "react-native";
import { colors, spacing, typography, radii } from "../theme";

const REASONS = ["Different skill level", "They didn't show up", "Poor communication", "Not a good fit", "Safety concern", "Other"];

export interface CompletionAnswers {
  didHappen: boolean;
  wouldPlayAgain: boolean;
  reasonIfNo?: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (answers: CompletionAnswers) => void;
  submitting?: boolean;
}

// Bug fix batch 2, Bug 1: "How did it go?" completion bottom sheet — Q1 (did
// it happen), Q2 (would you play again), and a single-select reason picker
// (with a free-text "Other") when Q2 is "No". Applies to every completed
// Event now, not just the pair's first.
export function CompletionSheet({ visible, onClose, onSubmit, submitting }: Props) {
  const [didHappen, setDidHappen] = useState<boolean | null>(null);
  const [wouldPlayAgain, setWouldPlayAgain] = useState<boolean | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [otherText, setOtherText] = useState("");

  useEffect(() => {
    if (!visible) return;
    setDidHappen(null);
    setWouldPlayAgain(null);
    setReason(null);
    setOtherText("");
  }, [visible]);

  const needsReason = wouldPlayAgain === false;
  const canSubmit = didHappen !== null && wouldPlayAgain !== null && (!needsReason || reason !== null) && !submitting;

  function submit() {
    if (!canSubmit || didHappen === null || wouldPlayAgain === null) return;
    onSubmit({
      didHappen,
      wouldPlayAgain,
      reasonIfNo: needsReason ? (reason === "Other" ? otherText.trim() || "Other" : reason ?? undefined) : undefined,
    });
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>How did it go?</Text>

          <Text style={styles.question}>Did this session take place?</Text>
          <View style={styles.buttonRow}>
            <Pressable style={[styles.choiceButton, didHappen === true && styles.choiceButtonSelected]} onPress={() => setDidHappen(true)}>
              <Text style={[styles.choiceButtonLabel, didHappen === true && styles.choiceButtonLabelSelected]}>Yes</Text>
            </Pressable>
            <Pressable style={[styles.choiceButtonOutline, didHappen === false && styles.choiceButtonOutlineSelected]} onPress={() => setDidHappen(false)}>
              <Text style={styles.choiceButtonOutlineLabel}>No</Text>
            </Pressable>
          </View>

          {didHappen !== null && (
            <>
              <Text style={styles.question}>Would you play with this person again?</Text>
              <View style={styles.buttonRow}>
                <Pressable style={[styles.choiceButton, wouldPlayAgain === true && styles.choiceButtonSelected]} onPress={() => setWouldPlayAgain(true)}>
                  <Text style={[styles.choiceButtonLabel, wouldPlayAgain === true && styles.choiceButtonLabelSelected]}>Yes</Text>
                </Pressable>
                <Pressable
                  style={[styles.choiceButtonOutline, wouldPlayAgain === false && styles.choiceButtonOutlineSelected]}
                  onPress={() => setWouldPlayAgain(false)}
                >
                  <Text style={styles.choiceButtonOutlineLabel}>No</Text>
                </Pressable>
              </View>
            </>
          )}

          {needsReason && (
            <>
              <Text style={styles.reasonLabel}>What was the reason?</Text>
              <View style={styles.reasonRow}>
                {REASONS.map((r) => (
                  <Pressable key={r} style={[styles.reasonPill, reason === r && styles.reasonPillSelected]} onPress={() => setReason(r)}>
                    <Text style={[styles.reasonPillLabel, reason === r && styles.reasonPillLabelSelected]}>{r}</Text>
                  </Pressable>
                ))}
              </View>
              {reason === "Other" && (
                <TextInput
                  style={styles.otherInput}
                  placeholder="Tell us more (optional)"
                  placeholderTextColor={colors.muted}
                  value={otherText}
                  onChangeText={setOtherText}
                  multiline
                />
              )}
            </>
          )}

          <Pressable style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]} disabled={!canSubmit} onPress={submit}>
            <Text style={[styles.submitButtonLabel, !canSubmit && styles.submitButtonLabelDisabled]}>{submitting ? "Submitting…" : "Submit"}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: { minHeight: "50%", backgroundColor: colors.white, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg, paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  handle: { width: 32, height: 4, borderRadius: 2, backgroundColor: "#CBD5E0", alignSelf: "center", marginTop: 12 },
  title: { fontFamily: typography.fontFamilyBold, fontSize: 20, color: colors.charcoal, marginTop: spacing.lg },
  question: { fontFamily: typography.fontFamily, fontSize: 16, color: colors.charcoal, marginTop: spacing.lg },
  buttonRow: { flexDirection: "row", gap: 12, marginTop: spacing.sm },
  choiceButton: { flex: 1, height: 48, borderRadius: 24, backgroundColor: colors.border, alignItems: "center", justifyContent: "center" },
  choiceButtonSelected: { backgroundColor: colors.coral },
  choiceButtonLabel: { fontFamily: typography.fontFamilyBold, fontSize: 15, color: colors.charcoal },
  choiceButtonLabelSelected: { color: colors.white },
  choiceButtonOutline: { flex: 1, height: 48, borderRadius: 24, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  choiceButtonOutlineSelected: { borderColor: colors.charcoal, borderWidth: 1.5 },
  choiceButtonOutlineLabel: { fontFamily: typography.fontFamilyRegular, fontSize: 15, color: colors.charcoal },
  reasonLabel: { fontFamily: typography.fontFamilyRegular, fontSize: 14, color: colors.muted, marginTop: spacing.md },
  reasonRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm },
  reasonPill: { height: 36, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, justifyContent: "center" },
  reasonPillSelected: { backgroundColor: colors.coral, borderColor: colors.coral },
  reasonPillLabel: { fontFamily: typography.fontFamilyRegular, fontSize: 13, color: colors.charcoal },
  reasonPillLabelSelected: { color: colors.white },
  otherInput: { height: 80, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, marginTop: spacing.sm, fontFamily: typography.fontFamilyRegular, fontSize: 14, color: colors.charcoal, textAlignVertical: "top" },
  submitButton: { height: 52, borderRadius: 24, backgroundColor: colors.coral, alignItems: "center", justifyContent: "center", marginTop: spacing.lg },
  submitButtonDisabled: { backgroundColor: colors.border },
  submitButtonLabel: { fontFamily: typography.fontFamilyBold, fontSize: 16, color: colors.white },
  submitButtonLabelDisabled: { color: "#94A3B8" },
});
