import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Colors } from '@/constants/colors';

interface ProgressBarProps {
  label: string;
  progress: number;
  color?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = React.memo(
  ({ label, progress, color }) => {
    const widthAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.timing(widthAnim, {
        toValue: progress,
        duration: 800,
        useNativeDriver: false,
      }).start();
    }, [progress]);

    const barColor = progress >= 100 ? Colors.emerald500 : (color ?? Colors.brandGold);

    return (
      <View style={styles.container}>
        <View style={styles.labelRow}>
          <Text style={styles.label} numberOfLines={1}>{label}</Text>
          <Text style={[styles.percentage, { color: barColor }]}>{progress}%</Text>
        </View>
        <View style={styles.track}>
          <Animated.View
            style={[
              styles.fill,
              {
                backgroundColor: barColor,
                width: widthAnim.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.slate700,
    flex: 1,
    marginRight: 8,
  },
  percentage: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  track: {
    height: 8,
    backgroundColor: Colors.slate100,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
});
