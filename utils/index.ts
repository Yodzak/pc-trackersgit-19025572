import { ProjectRecord } from '@/types';

export const formatCurrency = (amount: number): string => {
  // Un montant invalide doit s'afficher « 0 » et non « NaN » :
  // mieux vaut un chiffre neutre qu'un ecran de tableau de bord casse.
  const safe = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(safe);
};

/**
 * Convertit une valeur de la base en nombre exploitable.
 *
 * Les montants arrivent parfois en chaine (Postgres renvoie les bigint
 * en texte pour preserver la precision) ou absents sur les dossiers
 * anciens. Sans cette conversion, une seule cle manquante suffisait a
 * transformer tous les totaux du tableau de bord en NaN.
 */
const toNumber = (value: unknown): number => {
  const n = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
};

const EXPENSE_KEYS = [
  'cuVet',
  'planArchi',
  'etudeSol',
  'noticeSecurite',
  'depotDossier',
  'panneauChantier',
  'apporteur',
  'autreDepense',
] as const;

export const calculateTotalExpenses = (record: ProjectRecord): number => {
  const expenses = (record.expenses ?? {}) as unknown as Record<string, unknown>;
  return EXPENSE_KEYS.reduce((sum, key) => sum + toNumber(expenses[key]), 0);
};

export const calculateProfit = (record: ProjectRecord): number => {
  return toNumber(record.versements) - calculateTotalExpenses(record);
};

export const calculateProjectProgress = (record: ProjectRecord): number => {
  if (record.checklist && record.checklist.length > 0) {
    const completed = record.checklist.filter((item) => item.completed).length;
    return Math.round((completed / record.checklist.length) * 100);
  }
  // Repli quand la check-list est vide : on estime l'avancement au nombre
  // de postes de depense deja engages.
  const expenses = (record.expenses ?? {}) as unknown as Record<string, unknown>;
  const completedSteps = EXPENSE_KEYS.filter((key) => toNumber(expenses[key]) > 0).length;
  return Math.round((completedSteps / EXPENSE_KEYS.length) * 100);
};

export const getEventTypeLabel = (type: string): string => {
  switch (type) {
    case 'alert': return 'Alerte';
    case 'deadline': return 'Échéance';
    case 'payment': return 'Paiement';
    case 'meeting': return 'Réunion';
    default: return type;
  }
};

// ---------------------------------------------------------------------
// Suivi d'inactivite des dossiers
// ---------------------------------------------------------------------

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Nombre de jours entiers ecoules depuis la derniere modification du dossier.
 * Renvoie null si la date est absente ou invalide (dossier jamais synchronise).
 */
export const getDaysInactive = (record: ProjectRecord): number | null => {
  const raw = record.updatedAt ?? record.createdAt;
  if (!raw) return null;
  const last = new Date(raw).getTime();
  if (Number.isNaN(last)) return null;
  return Math.max(0, Math.floor((Date.now() - last) / MS_PER_DAY));
};

/** Un dossier est "en sommeil" s'il n'a pas bouge depuis le seuil configure. */
export const isProjectStale = (
  record: ProjectRecord,
  thresholdDays: number = 7
): boolean => {
  const days = getDaysInactive(record);
  return days !== null && days >= thresholdDays;
};

/**
 * Liste des dossiers en sommeil, du plus urgent au moins urgent.
 *
 * Tri principal : duree d'inactivite. A duree egale — cas courant quand
 * plusieurs dossiers ont ete saisis le meme jour — on remonte les plus
 * gros montants encaisses. Le meme ordre est utilise par le rapport, afin
 * que le bandeau du tableau de bord et le rapport designent le meme
 * dossier prioritaire.
 */
export const getStaleProjects = (
  records: ProjectRecord[],
  thresholdDays: number = 7
): ProjectRecord[] =>
  records
    .filter((r) => isProjectStale(r, thresholdDays))
    .sort(
      (a, b) =>
        (getDaysInactive(b) ?? 0) - (getDaysInactive(a) ?? 0) ||
        toNumber(b.versements) - toNumber(a.versements)
    );

/** Libelle court pour l'affichage : "aujourd'hui", "3 j", "12 j". */
export const formatInactivity = (record: ProjectRecord): string => {
  const days = getDaysInactive(record);
  if (days === null) return 'jamais';
  if (days === 0) return "aujourd'hui";
  if (days === 1) return 'hier';
  return `${days} j`;
};

/** Date lisible en francais : "15 septembre 2026". */
export const formatDate = (iso?: string): string => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

export const getProjectTypeLabel = (type: string): string => {
  switch (type) {
    case 'maison_basse': return 'Maison basse';
    case 'r1': return 'R+1';
    case 'r2': return 'R+2';
    case 'r3': return 'R+3';
    case 'autre': return 'Autre';
    default: return type;
  }
};
