import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { useFonts, JosefinSans_400Regular, JosefinSans_600SemiBold, JosefinSans_700Bold } from "@expo-google-fonts/josefin-sans";
import * as SplashScreen from "expo-splash-screen";
import { colors } from "../src/theme";
import { AuthProvider, useAuth } from "../src/hooks/useAuth";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

function RootNavigator() {
  const [fontsLoaded] = useFonts({ JosefinSans_400Regular, JosefinSans_600SemiBold, JosefinSans_700Bold });
  const { profile, loading, isOnboardingComplete } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (fontsLoaded && !loading) SplashScreen.hideAsync();
  }, [fontsLoaded, loading]);

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === "auth";
    const inOnboarding = segments[0] === "onboarding";

    if (!profile && !inAuthGroup) {
      router.replace("/auth");
    } else if (profile && !isOnboardingComplete && !inOnboarding) {
      router.replace("/onboarding");
    } else if (profile && isOnboardingComplete && (inAuthGroup || inOnboarding)) {
      router.replace("/(tabs)");
    }
  }, [profile, loading, isOnboardingComplete, segments, router]);

  if (!fontsLoaded || loading) return null;

  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: colors.offWhite }, headerShadowVisible: false, contentStyle: { backgroundColor: colors.offWhite } }}>
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="feed/[activityId]" options={{ title: "Explore" }} />
      <Stack.Screen name="user/[userId]" options={{ headerShown: false }} />
      <Stack.Screen name="chat/[chatId]" options={{ headerShown: false }} />
      <Stack.Screen name="requests/index" options={{ title: "Requests" }} />
      <Stack.Screen name="availability" options={{ title: "Availability" }} />
      <Stack.Screen name="profile/edit" options={{ title: "Edit profile" }} />
      <Stack.Screen name="profile/activities" options={{ headerShown: false }} />
    </Stack>
  );
}
