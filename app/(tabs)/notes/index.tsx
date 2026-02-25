import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Book, Save, User, Edit3, Check } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useApp } from '@/providers/AppProvider';
import { ProjectRecord } from '@/types';
import * as Haptics from 'expo-haptics';

export default function NotesScreen() {
  const insets = useSafeAreaInsets();
  const { data, updateNote } = useApp();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [showList, setShowList] = useState(true);

  useEffect(() => {
    if (data.length > 0 && selectedId === null) {
      setSelectedId(data[0].id);
    }
  }, [data, selectedId]);

  useEffect(() => {
    if (selectedId !== null) {
      const project = data.find((p) => p.id === selectedId);
      setNoteContent(project?.notes || '');
      setIsSaved(false);
    }
  }, [selectedId, data]);

  const selectedProject = data.find((p) => p.id === selectedId);

  const handleSave = useCallback(() => {
    if (selectedId !== null) {
      updateNote(selectedId, noteContent);
      setIsSaved(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => setIsSaved(false), 2000);
    }
  }, [selectedId, noteContent, updateNote]);

  const handleSelectProject = useCallback((id: number) => {
    setSelectedId(id);
    setShowList(false);
  }, []);

  const renderProjectItem = useCallback(({ item }: { item: ProjectRecord }) => {
    const isSelected = selectedId === item.id;
    return (
      <TouchableOpacity
        style={[styles.projectItem, isSelected && styles.projectItemActive]}
        onPress={() => handleSelectProject(item.id)}
        activeOpacity={0.7}
      >
        <View style={[styles.projectIcon, isSelected && styles.projectIconActive]}>
          <User size={16} color={isSelected ? Colors.white : Colors.slate400} />
        </View>
        <View style={styles.projectItemText}>
          <Text style={[styles.projectItemName, isSelected && styles.projectItemNameActive]} numberOfLines={1}>
            {item.clientName}
          </Text>
          <Text style={styles.projectItemNote} numberOfLines={1}>
            {item.notes ? 'Note existante...' : 'Aucune note'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }, [selectedId, handleSelectProject]);

  if (showList || !selectedProject) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Book size={20} color={Colors.brandGold} />
          <View>
            <Text style={styles.headerTitle}>Carnet de Notes</Text>
            <Text style={styles.headerSubtitle}>Sélectionnez un dossier</Text>
          </View>
        </View>
        <FlatList
          data={data}
          renderItem={renderProjectItem}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Edit3 size={48} color={Colors.slate300} />
              <Text style={styles.emptyText}>Aucun dossier disponible</Text>
            </View>
          }
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.noteHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setShowList(true)}>
          <Text style={styles.backText}>← Dossiers</Text>
        </TouchableOpacity>
        <View style={styles.noteHeaderInfo}>
          <Text style={styles.noteHeaderTitle} numberOfLines={1}>{selectedProject.clientName}</Text>
        </View>
        <TouchableOpacity
          style={[styles.saveBtn, isSaved && styles.saveBtnSaved]}
          onPress={handleSave}
        >
          {isSaved ? (
            <Check size={18} color={Colors.emerald600} />
          ) : (
            <Save size={18} color={Colors.white} />
          )}
          <Text style={[styles.saveBtnText, isSaved && styles.saveBtnTextSaved]}>
            {isSaved ? 'Sauvé' : 'Sauver'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.noteBody}>
        <TextInput
          style={styles.noteInput}
          placeholder="Écrivez vos notes, remarques et rappels pour ce dossier ici..."
          placeholderTextColor={Colors.slate300}
          value={noteContent}
          onChangeText={(text) => {
            setNoteContent(text);
            setIsSaved(false);
          }}
          multiline
          textAlignVertical="top"
          testID="note-input"
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.brandGray,
  },
  header: {
    backgroundColor: Colors.brandDark,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  headerSubtitle: {
    fontSize: 11,
    color: Colors.slate400,
    marginTop: 1,
  },
  listContent: {
    padding: 12,
    gap: 6,
  },
  projectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  projectItemActive: {
    backgroundColor: Colors.goldLight,
    borderColor: Colors.goldMedium,
  },
  projectIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectIconActive: {
    backgroundColor: Colors.brandGold,
  },
  projectItemText: {
    flex: 1,
  },
  projectItemName: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.slate700,
  },
  projectItemNameActive: {
    color: Colors.brandDark,
  },
  projectItemNote: {
    fontSize: 11,
    color: Colors.slate400,
    marginTop: 2,
  },
  noteHeader: {
    backgroundColor: Colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
    gap: 8,
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  backText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.brandDark,
  },
  noteHeaderInfo: {
    flex: 1,
  },
  noteHeaderTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.brandDark,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.brandDark,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  saveBtnSaved: {
    backgroundColor: '#D1FAE5',
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  saveBtnTextSaved: {
    color: Colors.emerald600,
  },
  noteBody: {
    flex: 1,
    backgroundColor: Colors.white,
    margin: 12,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  noteInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.slate600,
    lineHeight: 24,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.slate400,
  },
});
