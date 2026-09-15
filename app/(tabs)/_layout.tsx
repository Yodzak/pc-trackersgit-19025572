import React from 'react';
import { useWindowDimensions } from 'react-native';
import { Tabs } from 'expo-router';
import { SideNav, SIDE_NAV_WIDTH, SIDE_NAV_BREAKPOINT } from '@/components/SideNav';
import { LayoutDashboard, List, Book, Calendar, ClipboardCheck, FileBarChart2 } from 'lucide-react-native';
import { Colors } from '@/constants/colors';

export default function TabLayout() {
  // Grand ecran : barre laterale facon maquette. Telephone : barre du bas.
  const { width } = useWindowDimensions();
  const isWide = width >= SIDE_NAV_BREAKPOINT;

  return (
    <Tabs
      tabBar={isWide ? (props) => <SideNav {...props} /> : undefined}
      screenOptions={{
        headerShown: false,
        // La barre laterale est positionnee en absolu ; on decale donc le
        // contenu des ecrans de sa largeur pour qu'il ne passe pas dessous.
        sceneStyle: isWide ? { paddingLeft: SIDE_NAV_WIDTH } : undefined,
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
      <Tabs.Screen
        name="report"
        options={{
          title: 'Rapport',
          tabBarIcon: ({ color, size }) => (
            <FileBarChart2 size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
