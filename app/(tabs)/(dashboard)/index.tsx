import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Wallet, TrendingUp, CreditCard, FileText, LogOut, Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { useApp } from '@/providers/AppProvider';
import { formatCurrency, calculateProjectProgress } from '@/utils';
import { StatsCard } from '@/components/StatsCard';
import { ProgressBar } from '@/components/ProgressBar';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, stats, data, logoutMutation, isLoading } = useApp();
  const [refreshing, setRefreshing] = React.useState(false);
  const queryClient = useQueryClient();

  const progressData = useMemo(() => {
    return data
      .filter((item) => item.versements > 0 || calculateProjectProgress(item) > 0)
      .map((item) => ({
        id: item.id,
        name: item.clientName.length > 18
          ? item.clientName.substring(0, 18) + '...'
          : item.clientName,
        progress: calculateProjectProgress(item),
      }));
  }, [data]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['projects'] }),
      queryClient.invalidateQueries({ queryKey: ['events'] }),
    ]);
    setRefreshing(false);
  }, [queryClient]);

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    logoutMutation.mutate();
  };

  if (isLoading && !refreshing && data.length === 0) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={Colors.brandGold} />
        <Text style={styles.loadingText}>Chargement du tableau de bord...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.brandAccent} />
          <View>
            <Text style={styles.headerTitle}>SUIVI PERMIS <Text style={styles.headerGold}>PRO</Text></Text>
            <Text style={styles.headerSubtitle}>GESTION FINANCIÈRE</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          {user && (
            <View style={styles.userPill}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{user.name.charAt(0)}</Text>
              </View>
              <View>
                <Text style={styles.userName} numberOfLines={1}>{user.name}</Text>
                <Text style={styles.userRole}>Admin</Text>
              </View>
            </View>
          )}
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleLogout}
            testID="logout-button"
          >
            <LogOut size={18} color={Colors.slate400} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.brandGold} />
        }
      >
        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <View style={styles.statsHalf}>
              <StatsCard
                title="Recettes"
                subtitle="Total Encaissé"
                value={formatCurrency(stats.totalRevenue)}
                unit="FCFA"
                icon={<Wallet size={22} color={Colors.orange} />}
                colorClass={Colors.orange}
                bgClass={Colors.orangeBg}
              />
            </View>
            <View style={styles.statsHalf}>
              <StatsCard
                title="Bénéfice"
                subtitle="Marge Réelle"
                value={formatCurrency(stats.totalProfit)}
                unit="FCFA"
                icon={<TrendingUp size={22} color={Colors.teal} />}
                colorClass={Colors.teal}
                bgClass={Colors.tealBg}
              />
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statsHalf}>
              <StatsCard
                title="Dépenses"
                subtitle="Coûts Totaux"
                value={formatCurrency(stats.totalExpenses)}
                unit="FCFA"
                icon={<CreditCard size={22} color={Colors.amber} />}
                colorClass={Colors.amber}
                bgClass={Colors.amberBg}
              />
            </View>
            <View style={styles.statsHalf}>
              <StatsCard
                title="Dossiers"
                subtitle="Projets Actifs"
                value={stats.count.toString()}
                icon={<FileText size={22} color={Colors.yellow} />}
                colorClass={Colors.yellow}
                bgClass={Colors.yellowBg}
              />
            </View>
          </View>
        </View>

        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View>
              <Text style={styles.chartTitle}>Progression des Dossiers</Text>
              <Text style={styles.chartSubtitle}>Avancement basé sur les étapes validées</Text>
            </View>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: Colors.emerald500 }]} />
                <Text style={styles.legendText}>Terminé</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: Colors.brandGold }]} />
                <Text style={styles.legendText}>En cours</Text>
              </View>
            </View>
          </View>
          {progressData.length > 0 ? (
            progressData.map((item) => (
              <ProgressBar
                key={item.id}
                label={item.name}
                progress={item.progress}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Aucun dossier en cours</Text>
              <TouchableOpacity onPress={() => router.push('/add-project' as any)}>
                <Text style={styles.createLink}>Créer votre premier dossier</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, { bottom: 20 + insets.bottom }]}
        onPress={() => router.push('/add-project' as any)}
        activeOpacity={0.85}
        testID="add-project-fab"
      >
        <Plus size={24} color={Colors.brandDark} strokeWidth={3} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.brandGray,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: Colors.slate500,
    fontSize: 14,
  },
  header: {
    backgroundColor: Colors.brandDark,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  brandAccent: {
    width: 3,
    height: 32,
    borderRadius: 2,
    backgroundColor: Colors.brandGold,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: Colors.white,
    letterSpacing: 1,
  },
  headerGold: {
    color: Colors.brandGold,
  },
  headerSubtitle: {
    fontSize: 9,
    fontWeight: '700' as const,
    color: Colors.brandGold,
    letterSpacing: 2,
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  userPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.brandGold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.brandDark,
  },
  userName: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.white,
    maxWidth: 80,
  },
  userRole: {
    fontSize: 8,
    fontWeight: '700' as const,
    color: Colors.brandGold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  logoutBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  statsGrid: {
    gap: 12,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statsHalf: {
    flex: 1,
  },
  chartCard: {
    backgroundColor: Colors.white,
    borderRadius: 22,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  chartHeader: {
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.brandDark,
  },
  chartSubtitle: {
    fontSize: 12,
    color: Colors.slate400,
    marginTop: 3,
  },
  legendRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: Colors.slate500,
    fontWeight: '500' as const,
  },
  emptyState: {
    paddingVertical: 30,
    alignItems: 'center',
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.slate400,
    textAlign: 'center',
  },
  createLink: {
    fontSize: 14,
    color: Colors.brandDark,
    fontWeight: '700' as const,
    textDecorationLine: 'underline',
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: Colors.brandGold,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
});
