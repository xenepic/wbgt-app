import { Tabs } from "expo-router";
import React from "react";
import { Platform } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { HapticTab } from "@/components/HapticTab";
import { IconSymbol } from "@/components/ui/IconSymbol";
import TabBarBackground from "@/components/ui/TabBarBackground";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            // Use a transparent background on iOS to show the blur effect
            position: "absolute",
          },
          default: {},
        }),
      }}
    >
      <Tabs.Screen
        name="wbgt"
        options={{
          title: "WBGT",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="thermometer"
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="weather-info"
        options={{
          title: "Weather",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="weather-partly-cloudy"
              color={color}
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
}
