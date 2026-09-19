import { Tabs } from "expo-router";
import { Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../../src/theme";
import { CommunityUnlockModal } from "../../src/components/CommunityUnlockModal";

// F2/F10/F5/Communities footer: Explore activity (Home+Explore combined) /
// Chats / Communities / My Profile.
export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.coral,
          tabBarInactiveTintColor: "#94A3B8",
          tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.border, height: 56 + insets.bottom, paddingBottom: insets.bottom },
        }}
      >
        <Tabs.Screen name="index" options={{ title: "Explore activity", tabBarIcon: ({ color }) => <Text style={{ color }}>🏠</Text> }} />
        <Tabs.Screen name="chats" options={{ title: "Chats", tabBarIcon: ({ color }) => <Text style={{ color }}>💬</Text> }} />
        <Tabs.Screen name="communities" options={{ title: "Communities", tabBarIcon: ({ color }) => <Text style={{ color }}>👥</Text> }} />
        <Tabs.Screen name="profile" options={{ title: "My profile", tabBarIcon: ({ color }) => <Text style={{ color }}>👤</Text> }} />
      </Tabs>
      <CommunityUnlockModal />
    </>
  );
}
