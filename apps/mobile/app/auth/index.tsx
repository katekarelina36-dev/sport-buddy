import { useState } from "react";
import { View, Text, TextInput, StyleSheet, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Button } from "../../src/components/Button";
import { colors, spacing, typography, radii } from "../../src/theme";
import { useAuth } from "../../src/hooks/useAuth";

const loginBg = require("../../assets/login-bg.webp");
// Focal point is the handshake, roughly centered horizontally and just
// below the net vertically in the source photo — keep it in frame across
// every device aspect ratio instead of a naive center-crop.
const LOGIN_BG_FOCAL_POINT = { top: "68%", left: "50%" } as const;

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
      <Image
        source={loginBg}
        style={styles.artBackground}
        contentFit="cover"
        contentPosition={LOGIN_BG_FOCAL_POINT}
        pointerEvents="none"
      />

      <View style={styles.content}>
        <Text style={styles.title}>Teameo</Text>
        <Text style={styles.subtitle}>Find a sport partner in a couple of clicks.</Text>

        <TextInput
          style={styles.input}
          placeholder="Email address"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.muted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <Button label={mode === "register" ? "Create account" : "Log in"} onPress={submit} disabled={busy} />
        <Text style={styles.switchLink} onPress={() => setMode(mode === "register" ? "login" : "register")}>
          {mode === "register" ? "Already have an account? Log in" : "New here? Create an account"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.offWhite,
    paddingHorizontal: spacing.lg,
    justifyContent: "center",
    overflow: "hidden",
  },
  artBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    gap: spacing.md,
    marginTop: -240,
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
  switchLink: { textAlign: "center", color: "#D5AC04", fontFamily: typography.fontFamily, marginTop: spacing.sm, opacity: 0.8 },
});
