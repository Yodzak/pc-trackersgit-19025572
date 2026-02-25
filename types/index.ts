export type ProjectType = 'maison_basse' | 'r1' | 'r2' | 'r3' | 'autre';

export interface ChecklistItem {
  key: string;
  label: string;
  completed: boolean;
}

export interface ExpenseDetail {
  cuVet: number;
  planArchi: number;
  etudeSol: number;
  noticeSecurite: number;
  depotDossier: number;
  depotDossierDate?: string;
  panneauChantier: number;
  apporteur: number;
  autreDepense: number;
}

export interface ProjectRecord {
  id: number;
  clientName: string;
  projectType: ProjectType;
  versements: number;
  expenses: ExpenseDetail;
  checklist: ChecklistItem[];
  notes?: string;
}

export interface DashboardStats {
  totalRevenue: number;
  totalExpenses: number;
  totalProfit: number;
  count: number;
}

export interface CalendarEvent {
  id: number;
  title: string;
  date: string;
  type: 'deadline' | 'meeting' | 'payment' | 'alert';
}

export interface User {
  email: string;
  name: string;
  role: 'admin' | 'viewer';
}
