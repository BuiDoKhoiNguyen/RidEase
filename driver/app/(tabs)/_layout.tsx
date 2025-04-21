import React from 'react';
import { Tabs } from 'expo-router';
import { History, Home, HomeLight } from '@/utils/icons';
import color from '@/themes/AppColors';
import { Person } from '@/assets/icons/person';
import { StyleSheet } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => {
        return {
          headerShown: false,
          tabBarShowLabel: false,
          tabBarIcon: ({ focused }) => {
            let iconName;
            if (route.name === "home") {
              if (focused) {
                iconName = (
                  <Home colors={color.primary} width={24} height={24} />
                );
              } else {
                iconName = <HomeLight />;
              }
            } else if (route.name === "rides") {
              iconName = (
                <History colors={focused ? color.primary : "#8F8F8F"} />
              );
            } else if (route.name === "profile") {
              if (focused) {
                iconName = <Person fill={color.primary} />;
              } else {
                iconName = <Person fill={"#8F8F8F"} />;
              }
            }
            return iconName;
          },
          tabBarStyle: {
            height: 70,
            paddingBottom: 10,
            paddingTop: 5,
            backgroundColor: '#FFFFFF',
            borderTopWidth: 1,
            borderTopColor: '#F0F0F0',
            elevation: 8,
            shadowOpacity: 0.1,
            shadowRadius: 4,
          }
        };
      }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="rides" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  shadow: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  }
});