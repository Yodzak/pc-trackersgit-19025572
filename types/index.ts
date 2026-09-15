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
  /** Date ISO de derniere modification (alimentee par le trigger Postgres). */
  updatedAt?: string;
  /** Date ISO de creation du dossier. */
  createdAt?: string;
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
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'viewer';
}

export type ReportFrequency = 'daily' | 'weekly' | 'monthly' | 'off';

export interface UserSettings {
  staleThresholdDays: number;
  staleAlertsEnabled: boolean;
  reportFrequency: ReportFrequency;
  reportEmail?: string | null;
}

export const DEFAULT_SETTINGS: UserSettings = {
  staleThresholdDays: 7,
  staleAlertsEnabled: true,
  reportFrequency: 'weekly',
  reportEmail: null,
};

/** Piece jointe rattachee a un dossier (plan, arrete, photo de chantier...). */
export interface Attachment {
  id: number;
  projectId: number;
  fileName: string;
  /** Chemin dans le bucket prive : <user_id>/<project_id>/<fichier>. */
  storagePath: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
  createdAt?: string;
}
