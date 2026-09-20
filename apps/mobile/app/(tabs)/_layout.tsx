import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../../src/theme";
import { CommunityUnlockModal } from "../../src/components/CommunityUnlockModal";

// F2/F10/F5/Communities footer: Explore activity (Home+Explore combined) /
// Chats / Communities / My Profile.
// Round 10, Fix 6: brand-color Ionicons (outline inactive, filled active)
// instead of plain emoji, matching the redesign's icon spec.
export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.coral,
          tabBarInactiveTintColor: "#94A3B8",
          tabBarLabelStyle: { fontSize: 11 },
          tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.border, height: 56 + insets.bottom, paddingBottom: insets.bottom },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Explore activity",
            tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "compass" : "compass-outline"} size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="chats"
          options={{
            title: "Chats",
            tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "chatbubbles" : "chatbubbles-outline"} size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="communities"
          options={{
            title: "Communities",
            tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "people" : "people-outline"} size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "My profile",
            tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "person" : "person-outline"} size={24} color={color} />,
          }}
        />
      </Tabs>
      <CommunityUnlockModal />
    </>
  );
}
