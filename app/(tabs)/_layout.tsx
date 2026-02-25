import React from 'react';
import { Tabs } from 'expo-router';
import { LayoutDashboard, List, Book, Calendar, ClipboardCheck } from 'lucide-react-native';
import { Colors } from '@/constants/colors';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.brandGold,
        tabBarInactiveTintColor: Colors.slate400,
        tabBarStyle: {
          backgroundColor: Colors.brandDark,
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="(dashboard)"
        options={{
          title: 'Tableau',
          tabBarIcon: ({ color, size }) => (
            <LayoutDashboard size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: 'Dossiers',
          tabBarIcon: ({ color, size }) => (
            <List size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="checklist"
        options={{
          title: 'Check-list',
          tabBarIcon: ({ color, size }) => (
            <ClipboardCheck size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notes"
        options={{
          title: 'Notes',
          tabBarIcon: ({ color, size }) => (
            <Book size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendrier',
          tabBarIcon: ({ color, size }) => (
            <Calendar size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
