import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AlertTriangle, Clock } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { ProjectRecord } from '@/types';
import { getDaysInactive } from '@/utils';

interface StaleBadgeProps {
  project: ProjectRecord;
  /** Seuil au-dela duquel le dossier est signale (jours). */
  thresholdDays?: number;
}

/**
 * Pastille d'inactivite affichee sur une carte dossier.
 *
 * Trois etats, pour que l'oeil distingue immediatement l'urgence :
 *   - sous le seuil            -> rien (on n'encombre pas l'interface)
 *   - seuil atteint            -> orange "12 j sans activite"
 *   - le double du seuil       -> rouge, avec icone d'alerte
 */
export const StaleBadge: React.FC<StaleBadgeProps> = React.memo(
  ({ project, thresholdDays = 7 }) => {
    const days = getDaysInactive(project);

    if (days === null || days < thresholdDays) return null;

    const isCritical = days >= thresholdDays * 2;
    const tone = isCritical
      ? { bg: Colors.red50, fg: Colors.red500 }
      : { bg: Colors.amberBg, fg: Colors.orange };

    return (
      <View style={[styles.badge, { backgroundColor: tone.bg }]}>
        {isCritical ? (
          <AlertTriangle size={11} color={tone.fg} strokeWidth={2.5} />
        ) : (
          <Clock size={11} color={tone.fg} strokeWidth={2.5} />
        )}
        <Text style={[styles.badgeText, { color: tone.fg }]}>
          {days} j sans activité
        </Text>
      </View>
    );
  }
);

StaleBadge.displayName = 'StaleBadge';

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 0.2,
  },
});
