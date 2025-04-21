import { View, Text } from 'react-native'
import React from 'react'
import { useGetUserData } from '@/hooks/useGetUserData'
import { Tabs } from 'expo-router'
import { Car, CarPrimary, Category, Home, HomeLight, Wallet } from '@/utils/icons';
import { Person } from '@/assets/icons/person';
import color from '@/themes/AppColors';

export default function _layout() {
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
            } else if (route.name === "payment") {
              iconName = (
                <Wallet colors={focused ? color.primary : "#8F8F8F"} />
              );
            } else if (route.name === "history") {
              if (focused) {
                iconName = <CarPrimary color={color.primary} />;
              } else {
                iconName = <Car colors={"#8F8F8F"} />;
              }
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
      <Tabs.Screen name="history" />
      <Tabs.Screen name="payment" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}