import { Tabs } from "expo-router";
import { Text } from "react-native";
import { colors } from "../../src/theme";

// F2/F10/F5 footer: Home (Explore activity) / Chats / My Profile.
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.coral,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Explore activity", tabBarIcon: ({ color }) => <Text style={{ color }}>🏠</Text> }} />
      <Tabs.Screen name="chats" options={{ title: "Chats", tabBarIcon: ({ color }) => <Text style={{ color }}>💬</Text> }} />
      <Tabs.Screen name="profile" options={{ title: "My profile", tabBarIcon: ({ color }) => <Text style={{ color }}>👤</Text> }} />
    </Tabs>
  );
}
