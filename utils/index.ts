import { ProjectRecord } from '@/types';

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const calculateTotalExpenses = (record: ProjectRecord): number => {
  const {
    cuVet,
    planArchi,
    etudeSol,
    noticeSecurite,
    depotDossier,
    panneauChantier,
    apporteur,
    autreDepense,
  } = record.expenses;
  return cuVet + planArchi + etudeSol + noticeSecurite + depotDossier + panneauChantier + apporteur + (autreDepense ?? 0);
};

export const calculateProfit = (record: ProjectRecord): number => {
  return record.versements - calculateTotalExpenses(record);
};

export const calculateProjectProgress = (record: ProjectRecord): number => {
  if (record.checklist && record.checklist.length > 0) {
    const completed = record.checklist.filter((item) => item.completed).length;
    return Math.round((completed / record.checklist.length) * 100);
  }
  const { expenses } = record;
  const steps = [
    expenses.cuVet,
    expenses.planArchi,
    expenses.etudeSol,
    expenses.noticeSecurite,
    expenses.depotDossier,
    expenses.panneauChantier,
    expenses.apporteur,
    expenses.autreDepense ?? 0,
  ];
  const completedSteps = steps.filter((amount) => amount > 0).length;
  return Math.round((completedSteps / steps.length) * 100);
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
