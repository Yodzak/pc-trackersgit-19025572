import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Colors } from '@/constants/colors';

interface StatsCardProps {
  title: string;
  subtitle?: string;
  value: string;
  unit?: string;
  icon: React.ReactNode;
  colorClass: string;
  bgClass: string;
}

export const StatsCard: React.FC<StatsCardProps> = React.memo(
  ({ title, subtitle, value, unit, icon, colorClass, bgClass }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;

    useEffect(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    }, []);

    return (
      <Animated.View
        style={[
          styles.card,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={styles.topRow}>
          <View style={[styles.iconBox, { backgroundColor: bgClass }]}>
            {icon}
          </View>
          <View style={styles.textCol}>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
        </View>
        <View style={styles.valueRow}>
          <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
          {unit ? <Text style={styles.unit}>{unit}</Text> : null}
        </View>
      </Animated.View>
    );
  }
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 22,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.slate800,
  },
  subtitle: {
    fontSize: 11,
    color: Colors.slate400,
    fontWeight: '500' as const,
    marginTop: 1,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  value: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: Colors.slate800,
    letterSpacing: -0.5,
  },
  unit: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.slate400,
  },
});
