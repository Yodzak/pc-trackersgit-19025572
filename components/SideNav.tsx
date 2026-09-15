import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LogOut } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useApp } from '@/providers/AppProvider';

/** Largeur de la barre laterale sur grand ecran. */
export const SIDE_NAV_WIDTH = 210;
/** Au-dela de cette largeur, on passe de la barre du bas a la laterale. */
export const SIDE_NAV_BREAKPOINT = 900;

/**
 * Navigation laterale facon maquette : bandeau bleu nuit a gauche, avatar
 * en haut, entrees empilees, deconnexion en bas.
 *
 * Remplace la barre d'onglets du bas sur les ecrans larges. Sur telephone,
 * `app/(tabs)/_layout.tsx` conserve la barre du bas classique.
 */
export const SideNav: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const { user, logoutMutation } = useApp();

  const initial = (user?.name ?? '?').charAt(0).toUpperCase();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
      <View style={styles.profile}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <Text style={styles.userName} numberOfLines={1}>
          {user?.name ?? 'Utilisateur'}
        </Text>
        <Text style={styles.userRole}>Administrateur</Text>
      </View>

      <ScrollView
        style={styles.navScroll}
        contentContainerStyle={styles.navList}
        showsVerticalScrollIndicator={false}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const label =
            options.title !== undefined ? options.title : route.name;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              style={[styles.navItem, isFocused && styles.navItemActive]}
              onPress={onPress}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              testID={`sidenav-${route.name}`}
            >
              {options.tabBarIcon?.({
                focused: isFocused,
                color: isFocused ? Colors.sidebarTextActive : Colors.sidebarText,
                size: 19,
              })}
              <Text
                style={[styles.navLabel, isFocused && styles.navLabelActive]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <TouchableOpacity
        style={[styles.navItem, styles.logout, { marginBottom: insets.bottom + 16 }]}
        onPress={() => logoutMutation.mutate()}
        activeOpacity={0.75}
        testID="sidenav-logout"
      >
        <LogOut size={19} color={Colors.sidebarText} />
        <Text style={styles.navLabel}>Déconnexion</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: SIDE_NAV_WIDTH,
    backgroundColor: Colors.sidebarBg,
    paddingHorizontal: 14,
  },
  profile: {
    alignItems: 'center',
    paddingBottom: 22,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Colors.sidebarActive,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: Colors.white,
  },
  userName: {
    marginTop: 10,
    fontSize: 13.5,
    fontWeight: '700' as const,
    color: Colors.white,
    maxWidth: '100%',
  },
  userRole: {
    fontSize: 10,
    color: Colors.sidebarText,
    marginTop: 2,
    letterSpacing: 0.4,
  },
  navScroll: { flex: 1 },
  navList: { paddingTop: 18, gap: 4 },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
  },
  navItemActive: {
    backgroundColor: Colors.sidebarActive,
  },
  navLabel: {
    fontSize: 13.5,
    fontWeight: '600' as const,
    color: Colors.sidebarText,
    flex: 1,
  },
  navLabelActive: {
    color: Colors.sidebarTextActive,
    fontWeight: '700' as const,
  },
  logout: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    borderRadius: 0,
    paddingTop: 4,
    height: 52,
  },
});
