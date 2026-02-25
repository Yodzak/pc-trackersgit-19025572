import { ProjectType, ChecklistItem } from '@/types';

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  maison_basse: 'Maison basse',
  r1: 'R+1',
  r2: 'R+2',
  r3: 'R+3',
  autre: 'Autre',
};

export const PROJECT_TYPES: { value: ProjectType; label: string }[] = [
  { value: 'maison_basse', label: 'Maison basse' },
  { value: 'r1', label: 'R+1' },
  { value: 'r2', label: 'R+2' },
  { value: 'r3', label: 'R+3' },
  { value: 'autre', label: 'Autre' },
];

const CHECKLIST_LOW: ChecklistItem[] = [
  { key: 'titre_propriete', label: 'Titre de propriété', completed: false },
  { key: 'cni', label: 'CNI', completed: false },
  { key: 'extrait_topo', label: 'Extrait topographique', completed: false },
  { key: 'attestation_fiscale', label: 'Attestation de situation fiscale', completed: false },
  { key: 'elaboration_plans', label: 'Élaboration des plans et signature', completed: false },
  { key: 'depot', label: 'Dépôt', completed: false },
  { key: 'panneau_chantier', label: 'Panneau de chantier', completed: false },
];

const CHECKLIST_MID: ChecklistItem[] = [
  { key: 'titre_propriete', label: 'Titre de propriété', completed: false },
  { key: 'cni', label: 'CNI', completed: false },
  { key: 'extrait_topo', label: 'Extrait topographique', completed: false },
  { key: 'attestation_fiscale', label: 'Attestation de situation fiscale', completed: false },
  { key: 'etude_sol', label: 'Étude de Sol', completed: false },
  { key: 'plan_structure', label: 'Plan Structure', completed: false },
  { key: 'notice_securite', label: 'Notice de sécurité', completed: false },
  { key: 'elaboration_plans', label: 'Élaboration des plans et signature', completed: false },
  { key: 'depot', label: 'Dépôt', completed: false },
  { key: 'panneau_chantier', label: 'Panneau de chantier', completed: false },
];

const CHECKLIST_HIGH: ChecklistItem[] = [
  { key: 'titre_propriete', label: 'Titre de propriété', completed: false },
  { key: 'agrement', label: 'Agrément', completed: false },
  { key: 'cni', label: 'CNI', completed: false },
  { key: 'extrait_topo', label: 'Extrait topographique', completed: false },
  { key: 'attestation_fiscale', label: 'Attestation de situation fiscale', completed: false },
  { key: 'etude_sol', label: 'Étude de Sol', completed: false },
  { key: 'plan_structure', label: 'Plan Structure', completed: false },
  { key: 'notice_securite', label: 'Notice de sécurité', completed: false },
  { key: 'elaboration_plans', label: 'Élaboration des plans et signature', completed: false },
  { key: 'depot', label: 'Dépôt', completed: false },
  { key: 'panneau_chantier', label: 'Panneau de chantier', completed: false },
];

export function getChecklistForType(type: ProjectType): ChecklistItem[] {
  switch (type) {
    case 'maison_basse':
    case 'r1':
      return CHECKLIST_LOW.map((item) => ({ ...item }));
    case 'r2':
    case 'r3':
      return CHECKLIST_MID.map((item) => ({ ...item }));
    case 'autre':
      return CHECKLIST_HIGH.map((item) => ({ ...item }));
    default:
      return CHECKLIST_LOW.map((item) => ({ ...item }));
  }
}

export interface FormField {
  key: string;
  label: string;
  type: 'text' | 'numeric';
}

const FORM_FIELDS_LOW: FormField[] = [
  { key: 'cuVet', label: 'CU/VET', type: 'numeric' },
  { key: 'planArchi', label: 'Plan Archi', type: 'numeric' },
  { key: 'depotDossier', label: 'Dépôt', type: 'numeric' },
  { key: 'panneauChantier', label: 'Panneau de chantier', type: 'numeric' },
];

const FORM_FIELDS_HIGH: FormField[] = [
  { key: 'cuVet', label: 'CU/VET', type: 'numeric' },
  { key: 'etudeSol', label: 'Étude de sol / Plan de structure', type: 'numeric' },
  { key: 'planArchi', label: 'Plan Archi', type: 'numeric' },
  { key: 'noticeSecurite', label: 'Notice de sécurité', type: 'numeric' },
  { key: 'depotDossier', label: 'Dépôt', type: 'numeric' },
  { key: 'panneauChantier', label: 'Panneau de chantier', type: 'numeric' },
];

export function getFormFieldsForType(type: ProjectType): FormField[] {
  switch (type) {
    case 'maison_basse':
    case 'r1':
      return FORM_FIELDS_LOW;
    case 'r2':
    case 'r3':
    case 'autre':
      return FORM_FIELDS_HIGH;
    default:
      return FORM_FIELDS_LOW;
  }
}
