import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Search, Trash2, Edit3, ChevronRight, FolderOpen, Clock } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useApp } from '@/providers/AppProvider';
import { formatCurrency, calculateTotalExpenses, calculateProfit, isProjectStale, getProjectTypeLabel } from '@/utils';
import { StaleBadge } from '@/components/StaleBadge';
import { confirmAction } from '@/utils/dialog';
import { ProjectRecord } from '@/types';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';

export default function ProjectsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data, deleteProject, isLoading, settings, staleProjects } = useApp();
  const [search, setSearch] = useState('');
  const [onlyStale, setOnlyStale] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();

  // Tablette / desktop : deux dossiers par ligne.
  const { width } = useWindowDimensions();
  const numColumns = width >= 768 ? 2 : 1;

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await queryClient.invalidateQueries({ queryKey: ['projects'] });
    setIsRefreshing(false);
  }, [queryClient]);

  const filteredData = useMemo(() => {
    let list = data;
    if (onlyStale) {
      list = list.filter((d) => isProjectStale(d, settings.staleThresholdDays));
    }
    if (search.trim()) {
      // On cherche aussi dans le type de projet et le numero de dossier :
      // taper « R+1 » ou « 7 » devient un raccourci utile quand la liste
      // s'allonge.
      const needle = search.toLowerCase();
      list = list.filter(
        (d) =>
          d.clientName.toLowerCase().includes(needle) ||
          getProjectTypeLabel(d.projectType).toLowerCase().includes(needle) ||
          String(d.id) === needle
      );
    }
    return list;
  }, [data, search, onlyStale, settings.staleThresholdDays]);

  const handleDelete = useCallback(async (id: number, name: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const confirmed = await confirmAction({
      title: 'Supprimer le dossier ?',
      message: `Voulez-vous supprimer le dossier de ${name} ? Cette action est irréversible.`,
      confirmLabel: 'Supprimer',
      destructive: true,
    });
    if (!confirmed) return;

    deleteProject(id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [deleteProject]);

  const handleEdit = useCallback((project: ProjectRecord) => {
    router.push({ pathname: '/add-project' as any, params: { editId: String(project.id) } });
  }, [router]);

  const renderItem = useCallback(({ item }: { item: ProjectRecord }) => {
    const totalExp = calculateTotalExpenses(item);
    const profit = calculateProfit(item);
    const isProfitable = profit > 0;

    return (
      <TouchableOpacity
        style={[styles.projectCard, numColumns > 1 && styles.projectCardGrid]}
        onPress={() => router.push(`/(tabs)/projects/${item.id}` as any)}
        activeOpacity={0.7}
        testID={`project-${item.id}`}
      >
        <View style={styles.cardTop}>
          <View style={styles.clientInfo}>
            <View style={styles.clientAvatar}>
              <Text style={styles.clientInitial}>{item.clientName.charAt(0)}</Text>
            </View>
            <View style={styles.clientText}>
              <Text style={styles.clientName} numberOfLines={1}>{item.clientName}</Text>
              <Text style={styles.clientId}>Dossier #{item.id}</Text>
              <View style={styles.badgeRow}>
                <StaleBadge project={item} thresholdDays={settings.staleThresholdDays} />
              </View>
            </View>
          </View>
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => handleEdit(item)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Edit3 size={16} color={Colors.slate400} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => handleDelete(item.id, item.clientName)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Trash2 size={16} color={Colors.red400} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.cardBottom}>
          <View style={styles.amountCol}>
            <Text style={styles.amountLabel}>Versements</Text>
            <Text style={styles.amountValue}>
              {item.versements > 0 ? formatCurrency(item.versements) : '-'}
            </Text>
          </View>
          <View style={styles.amountCol}>
            <Text style={styles.amountLabel}>Dépenses</Text>
            <Text style={styles.amountValueExpense}>
              {totalExp > 0 ? formatCurrency(totalExp) : '-'}
            </Text>
          </View>
          <View style={styles.amountCol}>
            <Text style={styles.amountLabel}>Bénéfice</Text>
            <Text
              style={[
                styles.amountValueProfit,
                { color: isProfitable ? Colors.emerald600 : Colors.red500 },
              ]}
            >
              {formatCurrency(profit)}
            </Text>
          </View>
          <ChevronRight size={18} color={Colors.slate300} />
        </View>
      </TouchableOpacity>
    );
  }, [handleDelete, handleEdit, router, settings.staleThresholdDays, numColumns]);

  const keyExtractor = useCallback((item: ProjectRecord) => String(item.id), []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View style={styles.headerAccent} />
          <View>
            <Text style={styles.headerTitle}>Détail des Dossiers</Text>
            <Text style={styles.headerSubtitle}>CONSULTEZ ET GÉREZ VOS PROJETS</Text>
          </View>
        </View>
      </View>

      <View style={styles.searchWrapper}>
        <View style={styles.searchBox}>
          <Search size={18} color={Colors.slate400} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un client, un type..."
            placeholderTextColor={Colors.slate300}
            value={search}
            onChangeText={setSearch}
            testID="search-input"
          />
        </View>

        {staleProjects.length > 0 && (
          <TouchableOpacity
            style={[styles.filterChip, onlyStale && styles.filterChipActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setOnlyStale((v) => !v);
            }}
            activeOpacity={0.8}
            testID="filter-stale"
          >
            <Clock size={13} color={onlyStale ? Colors.white : Colors.orange} strokeWidth={2.5} />
            <Text style={[styles.filterChipText, onlyStale && styles.filterChipTextActive]}>
              En sommeil ({staleProjects.length})
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading && !isRefreshing && data.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.brandGold} />
          <Text style={styles.loadingText}>Chargement des dossiers...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredData}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          // Changer numColumns exige une nouvelle cle : sans cela FlatList
          // conserve l'ancienne disposition lors d'une rotation d'ecran.
          key={`cols-${numColumns}`}
          numColumns={numColumns}
          columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.brandGold}
              colors={[Colors.brandGold]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <FolderOpen size={48} color={Colors.slate300} />
              <Text style={styles.emptyText}>Aucun dossier trouvé</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.brandGray,
  },
  header: {
    backgroundColor: Colors.brandDark,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerAccent: {
    width: 3,
    height: 28,
    borderRadius: 2,
    backgroundColor: Colors.brandGold,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  headerSubtitle: {
    fontSize: 9,
    fontWeight: '600' as const,
    color: Colors.slate400,
    letterSpacing: 1.5,
    marginTop: 2,
  },
  searchWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  badgeRow: {
    marginTop: 5,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: Colors.amberBg,
  },
  filterChipActive: {
    backgroundColor: Colors.orange,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.orange,
  },
  filterChipTextActive: {
    color: Colors.white,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.slate700,
    fontWeight: '500' as const,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    gap: 12,
  },
  columnWrapper: {
    gap: 12,
  },
  projectCardGrid: {
    flex: 1,
  },
  projectCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  clientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientInitial: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.brandDark,
  },
  clientText: {
    flex: 1,
  },
  clientName: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.slate800,
  },
  clientId: {
    fontSize: 11,
    color: Colors.slate400,
    marginTop: 1,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 6,
  },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.slate50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardDivider: {
    height: 1,
    backgroundColor: Colors.slate100,
    marginVertical: 12,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amountCol: {
    flex: 1,
  },
  amountLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.slate400,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  amountValue: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.brandDark,
  },
  amountValueExpense: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.slate600,
  },
  amountValueProfit: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.slate400,
    fontWeight: '500' as const,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: Colors.slate500,
    fontSize: 14,
  },
});
