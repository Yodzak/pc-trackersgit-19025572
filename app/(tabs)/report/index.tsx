import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  FileDown,
  Clock,
  TrendingUp,
  Wallet,
  CreditCard,
  CalendarDays,
  CheckCircle2,
} from 'lucide-react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { useApp } from '@/providers/AppProvider';
import { formatCurrency, formatDate } from '@/utils';
import { buildReport, renderReportHtml } from '@/utils/report';
import { showAlert } from '@/utils/dialog';
import { ReportFrequency } from '@/types';

const FREQUENCY_LABELS: { value: ReportFrequency; label: string }[] = [
  { value: 'daily', label: 'Chaque jour' },
  { value: 'weekly', label: 'Chaque lundi' },
  { value: 'monthly', label: 'Chaque mois' },
  { value: 'off', label: 'Désactivé' },
];

const THRESHOLD_CHOICES = [3, 7, 14, 30];

export default function ReportScreen() {
  const insets = useSafeAreaInsets();
  const { data, events, user, settings, saveSettings } = useApp();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const [isExporting, setIsExporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();

  // Comme sur les autres ecrans : tirer vers le bas recharge les donnees.
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['projects'] }),
      queryClient.invalidateQueries({ queryKey: ['events'] }),
      queryClient.invalidateQueries({ queryKey: ['settings'] }),
    ]);
    setRefreshing(false);
  }, [queryClient]);

  const report = useMemo(
    () => buildReport(data, events, user?.name ?? '', settings.staleThresholdDays),
    [data, events, user?.name, settings.staleThresholdDays]
  );

  /**
   * Genere le PDF puis ouvre la feuille de partage native.
   * Sur le web, expo-sharing n'existe pas : on bascule sur l'impression du
   * navigateur, qui permet aussi d'enregistrer en PDF.
   */
  const handleExport = useCallback(async () => {
    try {
      setIsExporting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const html = renderReportHtml(report);

      if (Platform.OS === 'web') {
        await Print.printAsync({ html });
        return;
      }

      const { uri } = await Print.printToFileAsync({ html, base64: false });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Rapport PC Trackers',
          UTI: 'com.adobe.pdf',
        });
      } else {
        showAlert('Rapport généré', `Fichier enregistré :\n${uri}`);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      showAlert('Export impossible', e?.message ?? 'Erreur inconnue');
    } finally {
      setIsExporting(false);
    }
  }, [report]);

  const kpis = [
    {
      label: 'Recettes',
      value: formatCurrency(report.totals.revenue),
      color: Colors.orange,
      bg: Colors.orangeBg,
      icon: <Wallet size={18} color={Colors.orange} />,
    },
    {
      label: 'Dépenses',
      value: formatCurrency(report.totals.expenses),
      color: Colors.amber,
      bg: Colors.amberBg,
      icon: <CreditCard size={18} color={Colors.amber} />,
    },
    {
      label: 'Bénéfice',
      value: formatCurrency(report.totals.profit),
      color: report.totals.profit >= 0 ? Colors.teal : Colors.red500,
      bg: report.totals.profit >= 0 ? Colors.tealBg : Colors.red50,
      icon: <TrendingUp size={18} color={report.totals.profit >= 0 ? Colors.teal : Colors.red500} />,
    },
    {
      label: 'Marge',
      value: `${report.totals.marginPct} %`,
      color: Colors.brandDark,
      bg: Colors.goldLight,
      icon: <CheckCircle2 size={18} color={Colors.brandDark} />,
    },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View style={styles.headerAccent} />
          <View style={styles.flex1}>
            <Text style={styles.headerTitle}>Rapport complet</Text>
            <Text style={styles.headerSubtitle}>
              {formatDate(report.generatedAt.toISOString()).toUpperCase()}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.exportBtn}
            onPress={handleExport}
            disabled={isExporting}
            activeOpacity={0.85}
            testID="export-report"
          >
            {isExporting ? (
              <ActivityIndicator size="small" color={Colors.brandDark} />
            ) : (
              <>
                <FileDown size={16} color={Colors.brandDark} strokeWidth={2.5} />
                <Text style={styles.exportBtnText}>PDF</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, isWide && styles.contentWide]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.brandGold}
            colors={[Colors.brandGold]}
          />
        }
      >
        {/* Synthèse financière */}
        <View style={styles.kpiGrid}>
          {kpis.map((k) => (
            <View key={k.label} style={[styles.kpiCard, { backgroundColor: k.bg }]}>
              {k.icon}
              <Text style={styles.kpiLabel}>{k.label}</Text>
              <Text style={[styles.kpiValue, { color: k.color }]} numberOfLines={1}>
                {k.value}
              </Text>
            </View>
          ))}
        </View>

        {/* Dossiers en sommeil */}
        <Text style={styles.sectionTitle}>
          Dossiers en sommeil ({report.stale.length})
        </Text>
        <View style={styles.card}>
          {report.stale.length === 0 ? (
            <View style={styles.okRow}>
              <CheckCircle2 size={18} color={Colors.emerald600} />
              <Text style={styles.okText}>Tous vos dossiers sont à jour.</Text>
            </View>
          ) : (
            report.stale.map((l, i) => (
              <View
                key={l.id}
                style={[styles.row, i < report.stale.length - 1 && styles.rowBorder]}
              >
                <View style={styles.flex1}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{l.clientName}</Text>
                  {/* Le montant engage permet de savoir quel dossier
                      relancer en premier quand tous dorment depuis
                      le meme nombre de jours. */}
                  <Text style={styles.rowSub}>
                    {l.projectType} · {formatCurrency(l.versements)} encaissé
                  </Text>
                </View>
                <View style={styles.inactivePill}>
                  <Clock size={11} color={Colors.red500} strokeWidth={2.5} />
                  <Text style={styles.inactiveText}>{l.daysInactive} j</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Détail par dossier */}
        <Text style={styles.sectionTitle}>Détail par dossier ({report.lines.length})</Text>
        <View style={styles.card}>
          {report.lines.length === 0 ? (
            <Text style={styles.emptyText}>Aucun dossier enregistré.</Text>
          ) : (
            report.lines.map((l, i) => (
              <View
                key={l.id}
                style={[styles.row, i < report.lines.length - 1 && styles.rowBorder]}
              >
                <View style={styles.flex1}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{l.clientName}</Text>
                  <Text style={styles.rowSub}>
                    {l.projectType} · {l.progress}% terminé
                  </Text>
                </View>
                <View style={styles.rowAmounts}>
                  <Text
                    style={[
                      styles.rowProfit,
                      { color: l.profit >= 0 ? Colors.emerald600 : Colors.red500 },
                    ]}
                  >
                    {formatCurrency(l.profit)}
                  </Text>
                  <Text style={styles.rowSub}>
                    {formatCurrency(l.versements)} − {formatCurrency(l.expenses)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Répartition des dépenses */}
        <Text style={styles.sectionTitle}>Répartition des dépenses</Text>
        <View style={styles.card}>
          {report.expenseBreakdown.length === 0 ? (
            <Text style={styles.emptyText}>Aucune dépense enregistrée.</Text>
          ) : (
            report.expenseBreakdown.map((b, i) => (
              <View
                key={b.label}
                style={[styles.row, i < report.expenseBreakdown.length - 1 && styles.rowBorder]}
              >
                <View style={styles.flex1}>
                  <Text style={styles.rowTitle}>{b.label}</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${Math.max(b.pct, 2)}%` }]} />
                  </View>
                </View>
                <View style={styles.rowAmounts}>
                  <Text style={styles.rowProfitNeutral}>{formatCurrency(b.amount)}</Text>
                  <Text style={styles.rowSub}>{b.pct}%</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Échéances */}
        <Text style={styles.sectionTitle}>Échéances à venir</Text>
        <View style={styles.card}>
          {report.upcomingEvents.length === 0 ? (
            <Text style={styles.emptyText}>Aucune échéance planifiée.</Text>
          ) : (
            report.upcomingEvents.map((e, i) => (
              <View
                key={e.id}
                style={[styles.row, i < report.upcomingEvents.length - 1 && styles.rowBorder]}
              >
                <CalendarDays size={16} color={Colors.slate400} />
                <View style={styles.flex1}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{e.title}</Text>
                  <Text style={styles.rowSub}>{formatDate(e.date)}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Réglages */}
        <Text style={styles.sectionTitle}>Réglages des alertes</Text>
        <View style={styles.card}>
          <Text style={styles.settingLabel}>Signaler un dossier après</Text>
          <View style={styles.chipRow}>
            {THRESHOLD_CHOICES.map((d) => {
              const active = settings.staleThresholdDays === d;
              return (
                <TouchableOpacity
                  key={d}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => saveSettings({ staleThresholdDays: d })}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {d} jours
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.settingDivider} />

          <Text style={styles.settingLabel}>Fréquence du rapport automatique</Text>
          <View style={styles.chipRow}>
            {FREQUENCY_LABELS.map((f) => {
              const active = settings.reportFrequency === f.value;
              return (
                <TouchableOpacity
                  key={f.value}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => saveSettings({ reportFrequency: f.value })}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.spacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.brandGray },
  flex1: { flex: 1 },
  header: {
    backgroundColor: Colors.brandDark,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAccent: {
    width: 3,
    height: 28,
    borderRadius: 2,
    backgroundColor: Colors.brandGold,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' as const, color: Colors.white },
  headerSubtitle: {
    fontSize: 9,
    fontWeight: '600' as const,
    color: Colors.slate400,
    letterSpacing: 1.5,
    marginTop: 2,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.brandGold,
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 10,
    minWidth: 74,
    justifyContent: 'center',
  },
  exportBtnText: {
    fontSize: 13,
    fontWeight: '800' as const,
    color: Colors.brandDark,
  },
  content: { padding: 16, paddingBottom: 40 },
  contentWide: { maxWidth: 900, width: '100%', alignSelf: 'center' },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiCard: {
    flexGrow: 1,
    flexBasis: '46%',
    minWidth: 140,
    borderRadius: 16,
    padding: 14,
    gap: 4,
  },
  kpiLabel: {
    fontSize: 9,
    fontWeight: '700' as const,
    color: Colors.slate600,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  kpiValue: { fontSize: 17, fontWeight: '800' as const },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800' as const,
    color: Colors.slate700,
    marginTop: 24,
    marginBottom: 8,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.slate100 },
  rowTitle: { fontSize: 14, fontWeight: '700' as const, color: Colors.slate800 },
  rowSub: { fontSize: 11, color: Colors.slate400, marginTop: 2 },
  rowAmounts: { alignItems: 'flex-end' },
  rowProfit: { fontSize: 14, fontWeight: '800' as const },
  rowProfitNeutral: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.slate700,
  },
  inactivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.red50,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  inactiveText: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: Colors.red500,
  },
  okRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14 },
  okText: { fontSize: 13, color: Colors.emerald600, fontWeight: '600' as const },
  emptyText: { fontSize: 13, color: Colors.slate400, paddingVertical: 14 },
  barTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.slate100,
    marginTop: 7,
    overflow: 'hidden',
  },
  barFill: { height: 5, borderRadius: 3, backgroundColor: Colors.brandGold },
  settingLabel: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.slate600,
    marginTop: 14,
    marginBottom: 9,
  },
  settingDivider: {
    height: 1,
    backgroundColor: Colors.slate100,
    marginTop: 16,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Colors.slate50,
    borderWidth: 1,
    borderColor: Colors.slate200,
  },
  chipActive: {
    backgroundColor: Colors.brandDark,
    borderColor: Colors.brandDark,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.slate600,
  },
  chipTextActive: { color: Colors.white },
  spacer: { height: 60 },
});
