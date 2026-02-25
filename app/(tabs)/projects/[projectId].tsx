import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Colors } from '@/constants/colors';
import { useApp } from '@/providers/AppProvider';
import { formatCurrency, calculateTotalExpenses, calculateProfit, calculateProjectProgress } from '@/utils';
import { ProgressBar } from '@/components/ProgressBar';
import { Wallet, CreditCard, TrendingUp, FileText } from 'lucide-react-native';
import { PROJECT_TYPE_LABELS } from '@/constants/checklist';

const EXPENSE_LABELS: Record<string, string> = {
  cuVet: 'CU VET',
  planArchi: 'Plan Archi',
  etudeSol: 'Étude Sol',
  noticeSecurite: 'Notice Sécurité',
  depotDossier: 'Dépôt Dossier',
  panneauChantier: 'Panneau Chantier',
  apporteur: 'Apporteur',
  autreDepense: 'Autre Dépense',
};

export default function ProjectDetailScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const { data } = useApp();

  const project = useMemo(() => {
    return data.find((d) => d.id === Number(projectId));
  }, [data, projectId]);

  if (!project) {
    return (
      <View style={styles.emptyContainer}>
        <Stack.Screen options={{ title: 'Dossier introuvable' }} />
        <FileText size={48} color={Colors.slate300} />
        <Text style={styles.emptyText}>Dossier introuvable</Text>
      </View>
    );
  }

  const totalExpenses = calculateTotalExpenses(project);
  const profit = calculateProfit(project);
  const progress = calculateProjectProgress(project);
  const isProfitable = profit >= 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Stack.Screen options={{ title: project.clientName }} />

      <View style={styles.heroCard}>
        <View style={styles.heroAvatar}>
          <Text style={styles.heroInitial}>{project.clientName.charAt(0)}</Text>
        </View>
        <Text style={styles.heroName}>{project.clientName}</Text>
        <Text style={styles.heroId}>Dossier #{project.id} — {PROJECT_TYPE_LABELS[project.projectType] ?? project.projectType}</Text>
        <View style={styles.heroProgressSection}>
          <ProgressBar label="Avancement global" progress={progress} />
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { borderLeftColor: Colors.orange }]}>
          <Wallet size={18} color={Colors.orange} />
          <Text style={styles.summaryLabel}>Versements</Text>
          <Text style={styles.summaryValue}>{formatCurrency(project.versements)}</Text>
          <Text style={styles.summaryUnit}>FCFA</Text>
        </View>
        <View style={[styles.summaryCard, { borderLeftColor: Colors.amber }]}>
          <CreditCard size={18} color={Colors.amber} />
          <Text style={styles.summaryLabel}>Dépenses</Text>
          <Text style={styles.summaryValue}>{formatCurrency(totalExpenses)}</Text>
          <Text style={styles.summaryUnit}>FCFA</Text>
        </View>
        <View style={[styles.summaryCard, { borderLeftColor: isProfitable ? Colors.emerald500 : Colors.red500 }]}>
          <TrendingUp size={18} color={isProfitable ? Colors.emerald500 : Colors.red500} />
          <Text style={styles.summaryLabel}>Bénéfice</Text>
          <Text style={[styles.summaryValue, { color: isProfitable ? Colors.emerald600 : Colors.red500 }]}>
            {formatCurrency(profit)}
          </Text>
          <Text style={styles.summaryUnit}>FCFA</Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionAccent} />
          <Text style={styles.sectionTitle}>Détails des Dépenses</Text>
        </View>
        {Object.entries(EXPENSE_LABELS).map(([key, label]) => {
          const value = project.expenses[key as keyof typeof project.expenses];
          if (typeof value !== 'number') return null;
          return (
            <View key={key} style={styles.expenseRow}>
              <Text style={styles.expenseLabel}>{label}</Text>
              <Text style={[styles.expenseValue, value > 0 ? styles.expenseActive : null]}>
                {value > 0 ? formatCurrency(value) + ' FCFA' : '-'}
              </Text>
            </View>
          );
        })}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>TOTAL</Text>
          <Text style={styles.totalValue}>{formatCurrency(totalExpenses)} FCFA</Text>
        </View>
      </View>

      {project.notes ? (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionAccent} />
            <Text style={styles.sectionTitle}>Notes</Text>
          </View>
          <Text style={styles.noteText}>{project.notes}</Text>
        </View>
      ) : null}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.brandGray,
  },
  content: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: Colors.brandGray,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.slate400,
  },
  heroCard: {
    backgroundColor: Colors.brandDark,
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  heroAvatar: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: Colors.brandGold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroInitial: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: Colors.brandDark,
  },
  heroName: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.white,
    textAlign: 'center',
  },
  heroId: {
    fontSize: 12,
    color: Colors.slate400,
    marginTop: 4,
    marginBottom: 20,
  },
  heroProgressSection: {
    width: '100%',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    gap: 4,
    borderLeftWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.slate400,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '800' as const,
    color: Colors.slate800,
  },
  summaryUnit: {
    fontSize: 9,
    fontWeight: '600' as const,
    color: Colors.slate400,
  },
  sectionCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionAccent: {
    width: 3,
    height: 16,
    borderRadius: 2,
    backgroundColor: Colors.brandGold,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.brandDark,
    textTransform: 'uppercase',
  },
  expenseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
  },
  expenseLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.slate600,
  },
  expenseValue: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.slate300,
  },
  expenseActive: {
    color: Colors.slate700,
    fontWeight: '600' as const,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 14,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.brandDark,
    letterSpacing: 1,
  },
  totalValue: {
    fontSize: 15,
    fontWeight: '800' as const,
    color: Colors.brandDark,
  },
  noteText: {
    fontSize: 14,
    color: Colors.slate600,
    lineHeight: 22,
  },
});
