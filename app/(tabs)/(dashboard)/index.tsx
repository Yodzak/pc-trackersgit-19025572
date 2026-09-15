import React, { useMemo, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Search,
  Home,
  Building2,
  Building,
  Hotel,
  Shapes,
  Plus,
  FolderOpen,
  Clock,
  CheckCircle2,
  CalendarDays,
  AlertTriangle,
  ChevronRight,
  UploadCloud,
  HardDrive,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  FileArchive,
  File as FileIcon,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Colors } from '@/constants/colors';
import { useApp } from '@/providers/AppProvider';
import {
  formatCurrency,
  formatDate,
  calculateProjectProgress,
  getProjectTypeLabel,
} from '@/utils';
import {
  listRecentAttachments,
  getStorageUsed,
  formatFileSize,
  getFileKind,
  getAttachmentUrl,
  STORAGE_QUOTA,
  FileKind,
} from '@/utils/attachments';
import { showAlert } from '@/utils/dialog';
import * as Haptics from 'expo-haptics';

/** Une couleur par type de projet, comme les cartes de la maquette. */
const CATEGORIES: { type: string; color: string; Icon: any }[] = [
  { type: 'maison_basse', color: Colors.catPurple, Icon: Home },
  { type: 'r1', color: Colors.catTeal, Icon: Building2 },
  { type: 'r2', color: Colors.catPink, Icon: Building },
  { type: 'r3', color: Colors.catBlue, Icon: Hotel },
  { type: 'autre', color: Colors.slate500, Icon: Shapes },
];

const FILE_ICON: Record<FileKind, { color: string; bg: string; Icon: any }> = {
  image: { color: Colors.catPink, bg: Colors.orangeBg, Icon: ImageIcon },
  pdf: { color: Colors.red500, bg: Colors.red50, Icon: FileText },
  document: { color: Colors.catBlue, bg: Colors.blue100, Icon: FileText },
  sheet: { color: Colors.catTeal, bg: Colors.tealBg, Icon: FileSpreadsheet },
  archive: { color: Colors.catPurple, bg: Colors.amberBg, Icon: FileArchive },
  other: { color: Colors.slate500, bg: Colors.slate100, Icon: FileIcon },
};

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, stats, data, isLoading, staleProjects, settings } = useApp();
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const { width } = useWindowDimensions();
  // Deux colonnes façon maquette seulement s'il y a la place pour le
  // panneau de droite sans écraser le contenu principal.
  const isWide = width >= 1000;

  const recentFiles = useQuery({
    queryKey: ['recent-attachments', user?.id],
    queryFn: () => listRecentAttachments(6),
    enabled: !!user,
  });

  const storageUsed = useQuery({
    queryKey: ['storage-used', user?.id],
    queryFn: getStorageUsed,
    enabled: !!user,
  });

  const categories = useMemo(
    () =>
      CATEGORIES.map((c) => ({
        ...c,
        label: getProjectTypeLabel(c.type),
        count: data.filter((d) => d.projectType === c.type).length,
      })).filter((c) => c.count > 0 || c.type !== 'autre'),
    [data]
  );

  const shortcuts = useMemo(() => {
    const now = new Date();
    return [
      {
        key: 'all',
        label: 'Tous les dossiers',
        count: data.length,
        Icon: FolderOpen,
        color: Colors.catBlue,
      },
      {
        key: 'stale',
        label: 'En sommeil',
        count: staleProjects.length,
        Icon: Clock,
        color: Colors.catPink,
      },
      {
        key: 'done',
        label: 'Terminés',
        count: data.filter((d) => calculateProjectProgress(d) >= 100).length,
        Icon: CheckCircle2,
        color: Colors.catTeal,
      },
      {
        key: 'month',
        label: 'Ce mois-ci',
        count: data.filter((d) => {
          const c = d.createdAt ? new Date(d.createdAt) : null;
          return (
            c &&
            c.getMonth() === now.getMonth() &&
            c.getFullYear() === now.getFullYear()
          );
        }).length,
        Icon: CalendarDays,
        color: Colors.catPurple,
      },
    ];
  }, [data, staleProjects]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['projects'] }),
      queryClient.invalidateQueries({ queryKey: ['events'] }),
      queryClient.invalidateQueries({ queryKey: ['recent-attachments'] }),
      queryClient.invalidateQueries({ queryKey: ['storage-used'] }),
    ]);
    setRefreshing(false);
  }, [queryClient]);

  const openFile = useCallback(async (attachment: any) => {
    try {
      const url = await getAttachmentUrl(attachment);
      if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener');
    } catch (e: any) {
      showAlert('Ouverture impossible', e?.message ?? 'Erreur inconnue');
    }
  }, []);

  const used = storageUsed.data ?? 0;
  const usedPct = Math.min(100, Math.round((used / STORAGE_QUOTA) * 100));

  if (isLoading && !refreshing && data.length === 0) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={Colors.brandGold} />
        <Text style={styles.loadingText}>Chargement du tableau de bord...</Text>
      </View>
    );
  }

  /* ---------------------------------------------------------------- */
  /* Panneau de droite : nouveau dossier, stockage, dossiers en sommeil */
  /* ---------------------------------------------------------------- */
  const aside = (
    <View style={[styles.aside, isWide && styles.asideWide]}>
      <TouchableOpacity
        style={styles.uploadCard}
        onPress={() => router.push('/add-project' as any)}
        activeOpacity={0.85}
        testID="new-project-card"
      >
        <View style={styles.uploadIcon}>
          <UploadCloud size={26} color={Colors.catBlue} />
        </View>
        <Text style={styles.uploadTitle}>Nouveau dossier</Text>
        <Text style={styles.uploadHint}>Client, type, versements</Text>
      </TouchableOpacity>

      <View style={styles.panel}>
        <View style={styles.panelHeaderRow}>
          <HardDrive size={15} color={Colors.slate500} />
          <Text style={styles.panelTitle}>Votre stockage</Text>
          <Text style={styles.panelBadge}>{100 - usedPct} % libre</Text>
        </View>
        <Text style={styles.storageText}>
          {formatFileSize(used)} utilisés sur {formatFileSize(STORAGE_QUOTA)}
        </Text>
        <View style={styles.gauge}>
          <View style={[styles.gaugeFill, { width: `${Math.max(usedPct, 2)}%` }]} />
        </View>
        <Text style={styles.storageHint}>
          {recentFiles.data?.length
            ? 'Pièces jointes de vos dossiers'
            : 'Aucune pièce jointe pour le moment'}
        </Text>
      </View>

      <View style={styles.panel}>
        <View style={styles.panelHeaderRow}>
          <AlertTriangle size={15} color={Colors.catPink} />
          <Text style={styles.panelTitle}>Dossiers en sommeil</Text>
        </View>

        {staleProjects.length === 0 ? (
          <Text style={styles.storageHint}>
            Tout est à jour. Rien n'a dormi plus de {settings.staleThresholdDays} jours.
          </Text>
        ) : (
          <>
            {staleProjects.slice(0, 3).map((p, i) => (
              <TouchableOpacity
                key={p.id}
                style={[
                  styles.staleRow,
                  { backgroundColor: [Colors.tealBg, Colors.amberBg, Colors.orangeBg][i % 3] },
                ]}
                onPress={() => router.push('/(tabs)/projects' as any)}
                activeOpacity={0.8}
              >
                <Text style={styles.staleName} numberOfLines={1}>
                  {p.clientName}
                </Text>
                <Text style={styles.staleAmount}>{formatCurrency(p.versements)}</Text>
              </TouchableOpacity>
            ))}
            {staleProjects.length > 3 && (
              <TouchableOpacity
                style={styles.moreRow}
                onPress={() => router.push('/(tabs)/projects' as any)}
              >
                <Text style={styles.moreText}>
                  + {staleProjects.length - 3} autre
                  {staleProjects.length - 3 > 1 ? 's' : ''}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.brandGold} />
        }
      >
        <View style={[styles.layout, isWide && styles.layoutWide]}>
          {/* ---------------- Colonne principale ---------------- */}
          <View style={styles.main}>
            <View style={styles.searchBox}>
              <Search size={18} color={Colors.slate400} />
              <TextInput
                style={styles.searchInput}
                placeholder="Rechercher un dossier..."
                placeholderTextColor={Colors.slate300}
                value={search}
                onChangeText={setSearch}
                onSubmitEditing={() => router.push('/(tabs)/projects' as any)}
                testID="dashboard-search"
              />
            </View>

            <Text style={styles.sectionTitle}>Catégories</Text>
            <View style={styles.cardRow}>
              {categories.map((c) => (
                <TouchableOpacity
                  key={c.type}
                  style={[styles.categoryCard, { backgroundColor: c.color }]}
                  onPress={() => router.push('/(tabs)/projects' as any)}
                  activeOpacity={0.88}
                  testID={`category-${c.type}`}
                >
                  <View style={styles.categoryIcon}>
                    <c.Icon size={17} color={Colors.white} />
                  </View>
                  <Text style={styles.categoryLabel}>{c.label}</Text>
                  <Text style={styles.categoryCount}>
                    {c.count} dossier{c.count > 1 ? 's' : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Dossiers</Text>
            <View style={styles.cardRow}>
              {shortcuts.map((s) => (
                <TouchableOpacity
                  key={s.key}
                  style={styles.shortcutCard}
                  onPress={() => router.push('/(tabs)/projects' as any)}
                  activeOpacity={0.8}
                  testID={`shortcut-${s.key}`}
                >
                  <s.Icon size={17} color={s.color} />
                  <Text style={styles.shortcutLabel} numberOfLines={1}>
                    {s.label}
                  </Text>
                  <Text style={styles.shortcutCount}>
                    {s.count} dossier{s.count > 1 ? 's' : ''}
                  </Text>
                  <View style={[styles.shortcutRule, { backgroundColor: s.color }]} />
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={styles.addCard}
                onPress={() => router.push('/add-project' as any)}
                activeOpacity={0.8}
                testID="add-project-card"
              >
                <Plus size={22} color={Colors.catBlue} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Fichiers récents</Text>
            <View style={styles.filesCard}>
              {recentFiles.isLoading ? (
                <View style={styles.emptyBlock}>
                  <ActivityIndicator size="small" color={Colors.brandGold} />
                </View>
              ) : !recentFiles.data?.length ? (
                <View style={styles.emptyBlock}>
                  <FileIcon size={22} color={Colors.slate300} />
                  <Text style={styles.emptyText}>
                    Aucune pièce jointe. Ouvrez un dossier pour en ajouter.
                  </Text>
                </View>
              ) : (
                recentFiles.data.map((f, i) => {
                  const k = FILE_ICON[getFileKind(f.mimeType, f.fileName)];
                  const Icon = k.Icon;
                  return (
                    <TouchableOpacity
                      key={f.id}
                      style={[
                        styles.fileRow,
                        i < (recentFiles.data?.length ?? 0) - 1 && styles.fileRowBorder,
                      ]}
                      onPress={() => openFile(f)}
                      activeOpacity={0.75}
                      testID={`recent-file-${f.id}`}
                    >
                      <View style={[styles.fileIcon, { backgroundColor: k.bg }]}>
                        <Icon size={16} color={k.color} />
                      </View>
                      <Text style={styles.fileName} numberOfLines={1}>
                        {f.fileName}
                      </Text>
                      <Text style={styles.fileClient} numberOfLines={1}>
                        {f.clientName}
                      </Text>
                      <Text style={styles.fileSize}>{formatFileSize(f.sizeBytes)}</Text>
                      <Text style={styles.fileDate}>{formatDate(f.createdAt)}</Text>
                      <ChevronRight size={16} color={Colors.slate300} />
                    </TouchableOpacity>
                  );
                })
              )}
            </View>

            <View style={styles.totalsRow}>
              <View style={styles.totalCard}>
                <Text style={styles.totalLabel}>RECETTES</Text>
                <Text style={[styles.totalValue, { color: Colors.catPink }]}>
                  {formatCurrency(stats.totalRevenue)}
                </Text>
              </View>
              <View style={styles.totalCard}>
                <Text style={styles.totalLabel}>DÉPENSES</Text>
                <Text style={[styles.totalValue, { color: Colors.catPurple }]}>
                  {formatCurrency(stats.totalExpenses)}
                </Text>
              </View>
              <View style={styles.totalCard}>
                <Text style={styles.totalLabel}>BÉNÉFICE</Text>
                <Text
                  style={[
                    styles.totalValue,
                    { color: stats.totalProfit >= 0 ? Colors.catTeal : Colors.red500 },
                  ]}
                >
                  {formatCurrency(stats.totalProfit)}
                </Text>
              </View>
            </View>
          </View>

          {/* ---------------- Panneau de droite ---------------- */}
          {aside}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.brandGray },
  loadingContainer: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: Colors.slate500, fontSize: 14 },
  scroll: { padding: 18 },

  layout: { gap: 18 },
  layoutWide: { flexDirection: 'row', alignItems: 'flex-start' },
  main: { flex: 1, minWidth: 0 },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 48,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.slate700,
    fontWeight: '500' as const,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '800' as const,
    color: Colors.slate800,
    marginTop: 22,
    marginBottom: 12,
  },
  cardRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },

  categoryCard: {
    flexGrow: 1,
    flexBasis: 128,
    minWidth: 128,
    borderRadius: 16,
    padding: 14,
    gap: 6,
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  categoryLabel: { fontSize: 13.5, fontWeight: '800' as const, color: Colors.white },
  categoryCount: { fontSize: 11, color: 'rgba(255,255,255,0.85)' },

  shortcutCard: {
    flexGrow: 1,
    flexBasis: 128,
    minWidth: 128,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    gap: 5,
  },
  shortcutLabel: {
    fontSize: 13,
    fontWeight: '800' as const,
    color: Colors.slate800,
    marginTop: 8,
  },
  shortcutCount: { fontSize: 11, color: Colors.slate400 },
  shortcutRule: { height: 2, borderRadius: 1, marginTop: 8, width: 34 },
  addCard: {
    flexGrow: 1,
    flexBasis: 90,
    minWidth: 90,
    minHeight: 96,
    backgroundColor: Colors.white,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.slate200,
  },

  filesCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingHorizontal: 14,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
  },
  fileRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.slate100 },
  fileIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileName: {
    flex: 2,
    fontSize: 13.5,
    fontWeight: '700' as const,
    color: Colors.slate800,
  },
  fileClient: { flex: 1.4, fontSize: 12, color: Colors.slate500 },
  fileSize: { width: 74, fontSize: 12, color: Colors.slate400 },
  fileDate: { width: 118, fontSize: 12, color: Colors.slate400 },

  emptyBlock: { alignItems: 'center', gap: 8, paddingVertical: 28 },
  emptyText: { fontSize: 12.5, color: Colors.slate400 },

  totalsRow: { flexDirection: 'row', gap: 12, marginTop: 18 },
  totalCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    gap: 4,
  },
  totalLabel: {
    fontSize: 9,
    fontWeight: '800' as const,
    color: Colors.slate400,
    letterSpacing: 1,
  },
  totalValue: { fontSize: 17, fontWeight: '800' as const },

  aside: { gap: 14 },
  asideWide: { width: 300, marginLeft: 18 },

  uploadCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    paddingVertical: 28,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.slate200,
  },
  uploadIcon: { marginBottom: 6 },
  uploadTitle: { fontSize: 14, fontWeight: '800' as const, color: Colors.slate800 },
  uploadHint: { fontSize: 11.5, color: Colors.slate400 },

  panel: { backgroundColor: Colors.white, borderRadius: 18, padding: 16 },
  panelHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 },
  panelTitle: { flex: 1, fontSize: 13.5, fontWeight: '800' as const, color: Colors.slate800 },
  panelBadge: { fontSize: 11.5, fontWeight: '800' as const, color: Colors.catBlue },
  storageText: { fontSize: 12, color: Colors.slate500 },
  gauge: {
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.slate100,
    marginTop: 9,
    overflow: 'hidden',
  },
  gaugeFill: { height: 7, borderRadius: 4, backgroundColor: Colors.catBlue },
  storageHint: { fontSize: 11.5, color: Colors.slate400, marginTop: 9 },

  staleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 8,
    gap: 8,
  },
  staleName: { flex: 1, fontSize: 12.5, fontWeight: '700' as const, color: Colors.slate800 },
  staleAmount: { fontSize: 11.5, fontWeight: '700' as const, color: Colors.slate600 },
  moreRow: { alignItems: 'center', paddingVertical: 8 },
  moreText: { fontSize: 12, fontWeight: '700' as const, color: Colors.catBlue },
});
