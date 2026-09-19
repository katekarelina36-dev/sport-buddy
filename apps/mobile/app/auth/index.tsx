import { useState } from "react";
import { View, Text, TextInput, StyleSheet, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "../../src/components/Button";
import { colors, spacing, typography, radii } from "../../src/theme";
import { useAuth } from "../../src/hooks/useAuth";

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { login, register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "register">("register");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      if (mode === "register") await register(email, password);
      else await login(email, password);
    } catch (err) {
      Alert.alert("Couldn't sign in", (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + spacing.lg }]}>
      <Text style={styles.title}>Sport Buddy</Text>
      <Text style={styles.subtitle}>Find a sport partner in a couple of clicks.</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />

      <Button label={mode === "register" ? "Create account" : "Log in"} onPress={submit} disabled={busy} />
      <Text style={styles.switchLink} onPress={() => setMode(mode === "register" ? "login" : "register")}>
        {mode === "register" ? "Already have an account? Log in" : "New here? Create an account"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.offWhite,
    paddingHorizontal: spacing.lg,
    justifyContent: "center",
    gap: spacing.md,
  },
  title: { fontFamily: typography.fontFamilyBold, fontSize: 32, color: colors.charcoal, textAlign: "center" },
  subtitle: { fontFamily: typography.fontFamilyRegular, color: colors.muted, textAlign: "center", marginBottom: spacing.lg },
  input: {
    backgroundColor: colors.white,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    minHeight: 44,
    fontFamily: typography.fontFamilyRegular,
  },
  switchLink: { textAlign: "center", color: colors.sageDark, fontFamily: typography.fontFamily, marginTop: spacing.sm },
});
