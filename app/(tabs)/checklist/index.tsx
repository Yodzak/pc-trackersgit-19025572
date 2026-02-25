import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { useApp } from '@/providers/AppProvider';
import { ProjectRecord, ChecklistItem } from '@/types';
import { PROJECT_TYPE_LABELS } from '@/constants/checklist';
import { CheckCircle, Circle, ChevronDown, ChevronUp, ClipboardList } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const ChecklistItemRow = React.memo(({
  checkItem,
  index,
  projectId,
  onToggle,
}: {
  checkItem: ChecklistItem;
  index: number;
  projectId: number;
  onToggle: (projectId: number, itemKey: string) => void;
}) => {
  return (
    <TouchableOpacity
      style={styles.checklistRow}
      onPress={() => onToggle(projectId, checkItem.key)}
      activeOpacity={0.6}
      testID={`check-${projectId}-${checkItem.key}`}
    >
      <View style={styles.checklistLeft}>
        <Text style={styles.checklistIndex}>{index + 1}</Text>
        {checkItem.completed ? (
          <CheckCircle size={22} color={Colors.emerald500} />
        ) : (
          <Circle size={22} color={Colors.slate300} />
        )}
        <Text
          style={[
            styles.checklistLabel,
            checkItem.completed && styles.checklistLabelDone,
          ]}
        >
          {checkItem.label}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

const ProjectCard = React.memo(({
  item,
  isExpanded,
  onToggleExpand,
  onToggleItem,
}: {
  item: ProjectRecord;
  isExpanded: boolean;
  onToggleExpand: (id: number) => void;
  onToggleItem: (projectId: number, itemKey: string) => void;
}) => {
  const completedCount = item.checklist.filter((i) => i.completed).length;
  const totalCount = item.checklist.length;
  const progress = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);
  const typeLabel = PROJECT_TYPE_LABELS[item.projectType] ?? item.projectType;

  return (
    <View style={styles.projectCard}>
      <TouchableOpacity
        style={styles.projectHeader}
        onPress={() => onToggleExpand(item.id)}
        activeOpacity={0.7}
        testID={`checklist-project-${item.id}`}
      >
        <View style={styles.projectInfo}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{item.clientName.charAt(0)}</Text>
          </View>
          <View style={styles.projectTextCol}>
            <Text style={styles.projectName} numberOfLines={1}>
              {item.clientName}
            </Text>
            <View style={styles.metaRow}>
              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>{typeLabel}</Text>
              </View>
              <Text style={styles.progressMeta}>
                {completedCount}/{totalCount}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.headerRight}>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${progress}%` as any,
                  backgroundColor:
                    progress === 100
                      ? Colors.emerald500
                      : progress > 50
                      ? Colors.brandGold
                      : Colors.orange,
                },
              ]}
            />
          </View>
          <Text
            style={[
              styles.progressText,
              {
                color:
                  progress === 100
                    ? Colors.emerald600
                    : progress > 50
                    ? Colors.brandGold
                    : Colors.orange,
              },
            ]}
          >
            {progress}%
          </Text>
          {isExpanded ? (
            <ChevronUp size={18} color={Colors.slate400} />
          ) : (
            <ChevronDown size={18} color={Colors.slate400} />
          )}
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.checklistContainer}>
          <View style={styles.checklistDivider} />
          {item.checklist.map((checkItem, index) => (
            <ChecklistItemRow
              key={checkItem.key}
              checkItem={checkItem}
              index={index}
              projectId={item.id}
              onToggle={onToggleItem}
            />
          ))}
        </View>
      )}
    </View>
  );
});

export default function ChecklistScreen() {
  const insets = useSafeAreaInsets();
  const { data, updateChecklist } = useApp();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const toggleExpand = useCallback((id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
    Haptics.selectionAsync();
  }, []);

  const handleToggleItem = useCallback(
    (projectId: number, itemKey: string) => {
      const project = data.find((p) => p.id === projectId);
      if (!project) return;
      const updatedChecklist = project.checklist.map((item) =>
        item.key === itemKey ? { ...item, completed: !item.completed } : item
      );
      updateChecklist(projectId, updatedChecklist);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [data, updateChecklist]
  );

  const renderProject = useCallback(
    ({ item }: { item: ProjectRecord }) => {
      return (
        <ProjectCard
          item={item}
          isExpanded={expandedId === item.id}
          onToggleExpand={toggleExpand}
          onToggleItem={handleToggleItem}
        />
      );
    },
    [expandedId, toggleExpand, handleToggleItem]
  );

  const keyExtractor = useCallback((item: ProjectRecord) => String(item.id), []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View style={styles.headerAccent} />
          <View>
            <Text style={styles.headerTitle}>Check-list</Text>
            <Text style={styles.headerSubtitle}>SUIVI D'AVANCEMENT PAR DOSSIER</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={data}
        renderItem={renderProject}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        extraData={expandedId}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <ClipboardList size={48} color={Colors.slate300} />
            <Text style={styles.emptyText}>Aucun dossier</Text>
            <Text style={styles.emptySubText}>
              Créez un projet pour voir sa check-list
            </Text>
          </View>
        }
      />
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
  listContent: {
    padding: 16,
    paddingBottom: 100,
    gap: 12,
  },
  projectCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  projectInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.brandDark,
  },
  projectTextCol: {
    flex: 1,
  },
  projectName: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.slate800,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  typeBadge: {
    backgroundColor: Colors.goldLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.brandDark,
  },
  progressMeta: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.slate400,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBarBg: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.slate100,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '700' as const,
    minWidth: 32,
    textAlign: 'right' as const,
  },
  checklistContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  checklistDivider: {
    height: 1,
    backgroundColor: Colors.slate100,
    marginBottom: 12,
  },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate50,
  },
  checklistLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  checklistIndex: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.slate300,
    width: 18,
    textAlign: 'center' as const,
  },
  checklistLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.slate700,
    flex: 1,
  },
  checklistLabelDone: {
    textDecorationLine: 'line-through' as const,
    color: Colors.slate400,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 10,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.slate500,
  },
  emptySubText: {
    fontSize: 13,
    color: Colors.slate400,
    textAlign: 'center' as const,
  },
});
