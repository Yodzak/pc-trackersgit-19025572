import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { X, ChevronDown, Check } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useApp } from '@/providers/AppProvider';
import { ProjectType } from '@/types';
import { PROJECT_TYPES, getFormFieldsForType, getChecklistForType } from '@/constants/checklist';
import * as Haptics from 'expo-haptics';

interface FormState {
  clientName: string;
  projectType: ProjectType;
  versements: string;
  cuVet: string;
  planArchi: string;
  etudeSol: string;
  noticeSecurite: string;
  depotDossier: string;
  panneauChantier: string;
  apporteur: string;
  autreDepense: string;
}

const defaultForm: FormState = {
  clientName: '',
  projectType: 'maison_basse',
  versements: '',
  cuVet: '',
  planArchi: '',
  etudeSol: '',
  noticeSecurite: '',
  depotDossier: '',
  panneauChantier: '',
  apporteur: '',
  autreDepense: '',
};

export default function AddProjectScreen() {
  const router = useRouter();
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const { data, addProject, updateProject } = useApp();
  const [form, setForm] = useState<FormState>(defaultForm);
  const [typePickerVisible, setTypePickerVisible] = useState(false);

  const editingProject = useMemo(() => {
    if (editId) {
      return data.find((d) => d.id === Number(editId)) ?? null;
    }
    return null;
  }, [editId, data]);

  useEffect(() => {
    if (editingProject) {
      setForm({
        clientName: editingProject.clientName,
        projectType: editingProject.projectType,
        versements: editingProject.versements ? String(editingProject.versements) : '',
        cuVet: editingProject.expenses.cuVet ? String(editingProject.expenses.cuVet) : '',
        planArchi: editingProject.expenses.planArchi ? String(editingProject.expenses.planArchi) : '',
        etudeSol: editingProject.expenses.etudeSol ? String(editingProject.expenses.etudeSol) : '',
        noticeSecurite: editingProject.expenses.noticeSecurite ? String(editingProject.expenses.noticeSecurite) : '',
        depotDossier: editingProject.expenses.depotDossier ? String(editingProject.expenses.depotDossier) : '',
        panneauChantier: editingProject.expenses.panneauChantier ? String(editingProject.expenses.panneauChantier) : '',
        apporteur: editingProject.expenses.apporteur ? String(editingProject.expenses.apporteur) : '',
        autreDepense: editingProject.expenses.autreDepense ? String(editingProject.expenses.autreDepense) : '',
      });
    }
  }, [editingProject]);

  const dynamicFields = useMemo(() => getFormFieldsForType(form.projectType), [form.projectType]);

  const selectedTypeLabel = useMemo(() => {
    return PROJECT_TYPES.find((t) => t.value === form.projectType)?.label ?? '';
  }, [form.projectType]);

  const handleChange = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSelectType = (type: ProjectType) => {
    setForm((prev) => ({ ...prev, projectType: type }));
    setTypePickerVisible(false);
    Haptics.selectionAsync();
  };

  const totalVersements = useMemo(() => {
    const parts = form.versements.split('+').map((p) => Number(p.trim()) || 0);
    return parts.reduce((a, b) => a + b, 0);
  }, [form.versements]);

  const totalAutreDepense = useMemo(() => {
    const parts = form.autreDepense.split('+').map((p) => Number(p.trim()) || 0);
    return parts.reduce((a, b) => a + b, 0);
  }, [form.autreDepense]);

  const handleSave = () => {
    if (!form.clientName.trim()) {
      Alert.alert('Erreur', 'Le nom du client est requis');
      return;
    }

    const checklist = editingProject
      ? editingProject.checklist
      : getChecklistForType(form.projectType);

    const recordData = {
      clientName: form.clientName.trim(),
      projectType: form.projectType,
      versements: totalVersements,
      expenses: {
        cuVet: Number(form.cuVet) || 0,
        planArchi: Number(form.planArchi) || 0,
        etudeSol: Number(form.etudeSol) || 0,
        noticeSecurite: Number(form.noticeSecurite) || 0,
        depotDossier: Number(form.depotDossier) || 0,
        panneauChantier: Number(form.panneauChantier) || 0,
        apporteur: Number(form.apporteur) || 0,
        autreDepense: totalAutreDepense,
      },
      checklist,
      notes: editingProject?.notes ?? '',
    };

    if (editingProject) {
      updateProject(editingProject.id, recordData);
    } else {
      addProject(recordData);
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const isEditing = !!editingProject;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Stack.Screen
        options={{
          presentation: 'modal',
          headerStyle: { backgroundColor: Colors.brandDark },
          headerTintColor: Colors.brandGold,
          headerTitle: isEditing ? 'Modifier le Dossier' : 'Nouveau Dossier',
          headerTitleStyle: { fontWeight: '700', color: Colors.white, fontSize: 17 },
          headerRight: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <X size={22} color={Colors.white} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <Text style={styles.fieldLabel}>Type de Projet</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setTypePickerVisible(true)}
            activeOpacity={0.7}
            testID="project-type-picker"
          >
            <Text style={styles.pickerText}>{selectedTypeLabel}</Text>
            <ChevronDown size={18} color={Colors.slate500} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.fieldLabel}>Nom du Client</Text>
          <TextInput
            style={styles.inputLarge}
            placeholder="ex: M. Dupont"
            placeholderTextColor={Colors.slate300}
            value={form.clientName}
            onChangeText={(v) => handleChange('clientName', v)}
            autoCapitalize="words"
            testID="client-name-input"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.fieldLabel}>Versements (Recettes)</Text>
          <TextInput
            style={[styles.inputLarge, styles.inputGreen]}
            placeholder="ex: 500000+200000"
            placeholderTextColor={Colors.slate300}
            value={form.versements}
            onChangeText={(v) => handleChange('versements', v)}
            testID="versements-input"
          />
          {form.versements.includes('+') && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total :</Text>
              <Text style={styles.totalValue}>
                {new Intl.NumberFormat('fr-FR').format(totalVersements)} FCFA
              </Text>
            </View>
          )}
        </View>

        <View style={styles.divider}>
          <View style={styles.dividerAccent} />
          <Text style={styles.dividerText}>DÉTAILS DES DÉPENSES</Text>
        </View>

        <View style={styles.expenseGrid}>
          {dynamicFields.map((field) => (
            <View key={field.key} style={styles.expenseField}>
              <Text style={styles.expenseLabel}>{field.label}</Text>
              <TextInput
                style={styles.expenseInput}
                placeholder=""
                placeholderTextColor={Colors.slate300}
                value={form[field.key as keyof FormState] as string}
                onChangeText={(v) => handleChange(field.key as keyof FormState, v)}
                keyboardType="numeric"
              />
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.fieldLabel}>Autre Dépense</Text>
          <TextInput
            style={[styles.inputLarge, styles.inputRed]}
            placeholder="ex: 100000+50000"
            placeholderTextColor={Colors.slate300}
            value={form.autreDepense}
            onChangeText={(v) => handleChange('autreDepense', v)}
            testID="autre-depense-input"
          />
          {form.autreDepense.includes('+') && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total :</Text>
              <Text style={styles.totalValueRed}>
                {new Intl.NumberFormat('fr-FR').format(totalAutreDepense)} FCFA
              </Text>
            </View>
          )}
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
            <Text style={styles.cancelText}>Annuler</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
            <Text style={styles.saveText}>
              {isEditing ? 'Mettre à jour' : 'Enregistrer'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal
        visible={typePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTypePickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setTypePickerVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Type de Projet</Text>
            <FlatList
              data={PROJECT_TYPES}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalOption,
                    form.projectType === item.value && styles.modalOptionSelected,
                  ]}
                  onPress={() => handleSelectType(item.value)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      form.projectType === item.value && styles.modalOptionTextSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {form.projectType === item.value && (
                    <Check size={18} color={Colors.brandGold} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.brandGray,
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    marginBottom: 18,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.slate700,
    marginBottom: 8,
  },
  inputLarge: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.slate100,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.slate700,
    fontWeight: '500' as const,
  },
  inputGreen: {
    borderColor: '#D1FAE5',
    backgroundColor: '#F0FDF4',
  },
  inputRed: {
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  totalValueRed: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#DC2626',
  },
  pickerButton: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.slate100,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerText: {
    fontSize: 15,
    color: Colors.slate700,
    fontWeight: '600' as const,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.slate500,
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.emerald600,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 18,
    marginTop: 8,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: Colors.slate100,
  },
  dividerAccent: {
    width: 3,
    height: 14,
    borderRadius: 2,
    backgroundColor: Colors.brandGold,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.brandDark,
    letterSpacing: 1,
  },
  expenseGrid: {
    gap: 12,
    marginBottom: 28,
  },
  expenseField: {
    gap: 6,
  },
  expenseLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.slate500,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  expenseInput: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.slate200,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: Colors.slate700,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: Colors.white,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.slate600,
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: Colors.brandGold,
    shadowColor: Colors.brandGold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.brandDark,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    width: '100%',
    maxWidth: 340,
    paddingVertical: 20,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.brandDark,
    textAlign: 'center',
    marginBottom: 12,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginHorizontal: 4,
    marginVertical: 2,
  },
  modalOptionSelected: {
    backgroundColor: Colors.goldLight,
  },
  modalOptionText: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: Colors.slate700,
  },
  modalOptionTextSelected: {
    fontWeight: '700' as const,
    color: Colors.brandDark,
  },
});
