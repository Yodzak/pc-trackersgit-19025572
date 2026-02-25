import { ProjectRecord, CalendarEvent, ChecklistItem } from "@/types";
import { getChecklistForType } from "@/constants/checklist";
import * as fs from "fs";
import * as path from "path";

interface UserRecord {
  email: string;
  password: string;
  name: string;
  role: "admin" | "viewer";
}

interface UserData {
  projects: ProjectRecord[];
  events: CalendarEvent[];
}

interface PersistedDB {
  users: Record<string, UserRecord>;
  userData: Record<string, UserData>;
}

const DB_PATH = path.join(process.cwd(), "backend", "db", "data.json");

function loadFromDisk(): PersistedDB {
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, "utf-8");
      const parsed = JSON.parse(raw) as PersistedDB;
      console.log("[DB] Loaded data from disk:", DB_PATH);
      return parsed;
    }
  } catch (e) {
    console.error("[DB] Failed to load from disk, starting fresh:", e);
  }
  return { users: {}, userData: {} };
}

function saveToDisk(): void {
  try {
    const snapshot: PersistedDB = {
      users: Object.fromEntries(usersDb.entries()),
      userData: Object.fromEntries(userDataDb.entries()),
    };
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_PATH, JSON.stringify(snapshot, null, 2), "utf-8");
    console.log("[DB] Saved data to disk");
  } catch (e) {
    console.error("[DB] Failed to save to disk:", e);
  }
}

const persisted = loadFromDisk();

const usersDb = new Map<string, UserRecord>(Object.entries(persisted.users));
const userDataDb = new Map<string, UserData>(Object.entries(persisted.userData));

if (!usersDb.has("admin@permistrack.com")) {
  const INITIAL_PROJECTS: ProjectRecord[] = [
    {
      id: 1,
      clientName: "M. BENOU BI",
      projectType: "r2",
      versements: 3200000,
      expenses: { cuVet: 75000, planArchi: 0, etudeSol: 1200000, noticeSecurite: 0, depotDossier: 0, panneauChantier: 0, apporteur: 200000, autreDepense: 0 },
      checklist: getChecklistForType("r2"),
      notes: "Client exigeant sur les délais. Prévoir une réunion de chantier semaine prochaine.",
    },
    {
      id: 2,
      clientName: "M. KINDA",
      projectType: "maison_basse",
      versements: 1000000,
      expenses: { cuVet: 20000, planArchi: 0, etudeSol: 0, noticeSecurite: 0, depotDossier: 0, panneauChantier: 0, apporteur: 200000, autreDepense: 0 },
      checklist: getChecklistForType("maison_basse"),
      notes: "En attente de validation du plan de masse.",
    },
    {
      id: 3,
      clientName: "PALANQUE",
      projectType: "r1",
      versements: 1300000,
      expenses: { cuVet: 20000, planArchi: 150000, etudeSol: 0, noticeSecurite: 0, depotDossier: 0, panneauChantier: 0, apporteur: 300000, autreDepense: 0 },
      checklist: getChecklistForType("r1"),
    },
    {
      id: 4,
      clientName: "CHO AMIN",
      projectType: "maison_basse",
      versements: 500000,
      expenses: { cuVet: 20000, planArchi: 0, etudeSol: 0, noticeSecurite: 0, depotDossier: 0, panneauChantier: 0, apporteur: 0, autreDepense: 0 },
      checklist: getChecklistForType("maison_basse"),
    },
    {
      id: 5,
      clientName: "DAO FOUSSENI",
      projectType: "maison_basse",
      versements: 0,
      expenses: { cuVet: 0, planArchi: 0, etudeSol: 0, noticeSecurite: 0, depotDossier: 0, panneauChantier: 0, apporteur: 0, autreDepense: 0 },
      checklist: getChecklistForType("maison_basse"),
    },
    {
      id: 6,
      clientName: "HOTEL KIWI",
      projectType: "autre",
      versements: 5000000,
      expenses: { cuVet: 0, planArchi: 0, etudeSol: 1000000, noticeSecurite: 0, depotDossier: 0, panneauChantier: 0, apporteur: 0, autreDepense: 0 },
      checklist: getChecklistForType("autre"),
      notes: "Gros chantier. Vérifier les normes incendie pour l'ERP.",
    },
    {
      id: 7,
      clientName: "LASSERE",
      projectType: "r3",
      versements: 0,
      expenses: { cuVet: 0, planArchi: 0, etudeSol: 0, noticeSecurite: 0, depotDossier: 0, panneauChantier: 0, apporteur: 0, autreDepense: 0 },
      checklist: getChecklistForType("r3"),
    },
  ];

  const INITIAL_EVENTS: CalendarEvent[] = [
    { id: 1, title: "Dépôt dossier BENOU BI", date: new Date().toISOString().split("T")[0], type: "deadline" },
    { id: 2, title: "Visite terrain HOTEL KIWI", date: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0], type: "meeting" },
  ];

  usersDb.set("admin@permistrack.com", {
    email: "admin@permistrack.com",
    password: "admin",
    name: "Admin Demo",
    role: "admin",
  });

  userDataDb.set("admin@permistrack.com", {
    projects: INITIAL_PROJECTS,
    events: INITIAL_EVENTS,
  });

  saveToDisk();
}

export const db = {
  findUser(email: string): UserRecord | undefined {
    return usersDb.get(email.toLowerCase().trim());
  },

  createUser(email: string, password: string, name: string): UserRecord {
    const normalized = email.toLowerCase().trim();
    if (usersDb.has(normalized)) {
      throw new Error("Un compte existe déjà avec cet email.");
    }
    const user: UserRecord = { email: normalized, password, name, role: "admin" };
    usersDb.set(normalized, user);
    userDataDb.set(normalized, { projects: [], events: [] });
    saveToDisk();
    console.log(`[DB] User created: ${normalized}`);
    return user;
  },

  getUserData(email: string): UserData {
    const normalized = email.toLowerCase().trim();
    const data = userDataDb.get(normalized);
    if (!data) {
      const empty: UserData = { projects: [], events: [] };
      userDataDb.set(normalized, empty);
      saveToDisk();
      return empty;
    }
    return data;
  },

  getProjects(email: string): ProjectRecord[] {
    return this.getUserData(email).projects;
  },

  addProject(email: string, project: Omit<ProjectRecord, "id">): ProjectRecord {
    const data = this.getUserData(email);
    const ids = data.projects.map((p) => p.id);
    const nextId = ids.length > 0 ? Math.max(...ids) + 1 : 1;
    const newProject: ProjectRecord = { ...project, id: nextId };
    data.projects.push(newProject);
    saveToDisk();
    console.log(`[DB] Project added for ${email}: ${newProject.clientName} (id: ${nextId})`);
    return newProject;
  },

  updateProject(email: string, id: number, project: Omit<ProjectRecord, "id">): ProjectRecord {
    const data = this.getUserData(email);
    const idx = data.projects.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error("Projet non trouvé");
    const updated: ProjectRecord = { ...project, id };
    data.projects[idx] = updated;
    saveToDisk();
    console.log(`[DB] Project updated for ${email}: id ${id}`);
    return updated;
  },

  deleteProject(email: string, id: number): void {
    const data = this.getUserData(email);
    data.projects = data.projects.filter((p) => p.id !== id);
    saveToDisk();
    console.log(`[DB] Project deleted for ${email}: id ${id}`);
  },

  updateNote(email: string, projectId: number, note: string): void {
    const data = this.getUserData(email);
    const project = data.projects.find((p) => p.id === projectId);
    if (project) {
      project.notes = note;
      saveToDisk();
      console.log(`[DB] Note updated for project ${projectId}`);
    }
  },

  updateChecklist(email: string, projectId: number, checklist: ChecklistItem[]): void {
    const data = this.getUserData(email);
    const project = data.projects.find((p) => p.id === projectId);
    if (project) {
      project.checklist = checklist;
      saveToDisk();
      console.log(`[DB] Checklist updated for project ${projectId}`);
    }
  },

  getEvents(email: string): CalendarEvent[] {
    return this.getUserData(email).events;
  },

  addEvent(email: string, event: Omit<CalendarEvent, "id">): CalendarEvent {
    const data = this.getUserData(email);
    const newEvent: CalendarEvent = { ...event, id: Date.now() };
    data.events.push(newEvent);
    saveToDisk();
    console.log(`[DB] Event added for ${email}: ${newEvent.title}`);
    return newEvent;
  },

  deleteEvent(email: string, id: number): void {
    const data = this.getUserData(email);
    data.events = data.events.filter((e) => e.id !== id);
    saveToDisk();
    console.log(`[DB] Event deleted for ${email}: id ${id}`);
  },
};
