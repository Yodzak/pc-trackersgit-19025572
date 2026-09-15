// =====================================================================
// PC TRACKERS — Tache automatique quotidienne (Supabase Edge Function)
//
// Deux responsabilites :
//   1. Notifier par push les dossiers restes sans activite au-dela du
//      seuil configure par l'utilisateur (7 jours par defaut).
//   2. Envoyer le rapport complet par e-mail selon la frequence choisie
//      (quotidien / lundi / 1er du mois).
//
// Declenchee chaque matin par pg_cron — voir db_cron_setup.sql.
// Deploiement : supabase functions deploy daily-check
// =====================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const RESEND_URL = 'https://api.resend.com/emails';

// --- Types minimaux (miroir de types/index.ts cote application) --------

interface ExpenseDetail {
  cuVet: number;
  planArchi: number;
  etudeSol: number;
  noticeSecurite: number;
  depotDossier: number;
  panneauChantier: number;
  apporteur: number;
  autreDepense: number;
}

interface ProjectRow {
  id: number;
  user_id: string;
  clientName: string;
  projectType: string;
  versements: number;
  expenses: ExpenseDetail | null;
  checklist: { completed: boolean }[] | null;
  updated_at: string;
}

interface SettingsRow {
  user_id: string;
  stale_threshold_days: number;
  stale_alerts_enabled: boolean;
  report_frequency: 'daily' | 'weekly' | 'monthly' | 'off';
  report_email: string | null;
}

const DEFAULTS = {
  stale_threshold_days: 7,
  stale_alerts_enabled: true,
  report_frequency: 'weekly' as const,
  report_email: null,
};

// --- Calculs (identiques a utils/index.ts) -----------------------------

const MS_PER_DAY = 86_400_000;

const totalExpenses = (p: ProjectRow): number => {
  const e = p.expenses;
  if (!e) return 0;
  return (
    (e.cuVet ?? 0) + (e.planArchi ?? 0) + (e.etudeSol ?? 0) +
    (e.noticeSecurite ?? 0) + (e.depotDossier ?? 0) +
    (e.panneauChantier ?? 0) + (e.apporteur ?? 0) + (e.autreDepense ?? 0)
  );
};

const profit = (p: ProjectRow): number => (p.versements ?? 0) - totalExpenses(p);

const daysInactive = (p: ProjectRow): number => {
  const t = new Date(p.updated_at).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((Date.now() - t) / MS_PER_DAY));
};

const progress = (p: ProjectRow): number => {
  const list = p.checklist ?? [];
  if (list.length === 0) return 0;
  return Math.round((list.filter((c) => c.completed).length / list.length) * 100);
};

const money = (n: number) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n) + ' F';

const esc = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// --- Faut-il envoyer le rapport aujourd'hui ? --------------------------

function isReportDay(frequency: string, now: Date): boolean {
  switch (frequency) {
    case 'daily': return true;
    case 'weekly': return now.getDay() === 1;   // lundi
    case 'monthly': return now.getDate() === 1; // 1er du mois
    default: return false;                       // 'off'
  }
}

// --- Rapport HTML ------------------------------------------------------

function buildReportHtml(projects: ProjectRow[], threshold: number): string {
  const revenue = projects.reduce((s, p) => s + (p.versements ?? 0), 0);
  const expenses = projects.reduce((s, p) => s + totalExpenses(p), 0);
  const margin = revenue - expenses;
  const marginPct = revenue > 0 ? Math.round((margin / revenue) * 100) : 0;
  const stale = projects.filter((p) => daysInactive(p) >= threshold);

  const th = 'padding:9px 10px;text-align:left;font-size:9px;font-weight:700;color:#fff;text-transform:uppercase';
  const td = 'padding:8px 10px;border-bottom:1px solid #F1F5F9';

  const kpi = (label: string, value: string, color: string) => `
    <div style="flex:1;min-width:110px;background:#fff;border:1px solid #E2E8F0;border-radius:12px;padding:13px">
      <div style="font-size:9px;font-weight:700;color:#94A3B8;text-transform:uppercase">${label}</div>
      <div style="font-size:17px;font-weight:800;color:${color};margin-top:5px">${value}</div>
    </div>`;

  const staleRows = stale.length
    ? stale
        .sort((a, b) => daysInactive(b) - daysInactive(a))
        .map((p) => `<tr>
            <td style="${td}">${esc(p.clientName)}</td>
            <td style="${td};text-align:right;color:#EF4444;font-weight:700">${daysInactive(p)} j</td>
          </tr>`)
        .join('')
    : `<tr><td colspan="2" style="${td};color:#10B981;font-weight:600">Aucun dossier en sommeil.</td></tr>`;

  const projectRows = projects.length
    ? projects
        .sort((a, b) => profit(b) - profit(a))
        .map((p) => `<tr>
            <td style="${td}">${esc(p.clientName)}</td>
            <td style="${td};text-align:right">${money(p.versements ?? 0)}</td>
            <td style="${td};text-align:right;color:#64748B">${money(totalExpenses(p))}</td>
            <td style="${td};text-align:right;font-weight:700;color:${profit(p) >= 0 ? '#059669' : '#EF4444'}">${money(profit(p))}</td>
            <td style="${td};text-align:right;color:#475569">${progress(p)}%</td>
          </tr>`)
        .join('')
    : `<tr><td colspan="5" style="${td};color:#94A3B8">Aucun dossier.</td></tr>`;

  const dateStr = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px;background:#F8FAFC;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:#1E293B">
  <div style="border-left:4px solid #D4AF37;padding-left:12px;margin-bottom:20px">
    <div style="font-size:19px;font-weight:800;letter-spacing:1px">SUIVI PERMIS <span style="color:#D4AF37">PRO</span></div>
    <div style="font-size:11px;color:#64748B;margin-top:3px">Rapport complet — ${dateStr}</div>
  </div>

  <div style="display:flex;gap:9px;flex-wrap:wrap">
    ${kpi('Recettes', money(revenue), '#E76F51')}
    ${kpi('Dépenses', money(expenses), '#F4A261')}
    ${kpi('Bénéfice', money(margin), margin >= 0 ? '#2A9D8F' : '#EF4444')}
    ${kpi('Marge', marginPct + ' %', '#2F4F4F')}
    ${kpi('Dossiers', String(projects.length), '#E9C46A')}
  </div>

  <div style="font-size:13px;font-weight:800;color:#2F4F4F;margin:24px 0 8px">
    Dossiers en sommeil (plus de ${threshold} jours)
  </div>
  <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:10px;overflow:hidden;font-size:12px">
    <thead><tr style="background:#E76F51"><th style="${th}">Client</th><th style="${th};text-align:right">Inactivité</th></tr></thead>
    <tbody>${staleRows}</tbody>
  </table>

  <div style="font-size:13px;font-weight:800;color:#2F4F4F;margin:24px 0 8px">Détail par dossier</div>
  <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:10px;overflow:hidden;font-size:12px">
    <thead><tr style="background:#2F4F4F">
      <th style="${th}">Client</th><th style="${th};text-align:right">Versements</th>
      <th style="${th};text-align:right">Dépenses</th><th style="${th};text-align:right">Bénéfice</th>
      <th style="${th};text-align:right">Avanc.</th>
    </tr></thead>
    <tbody>${projectRows}</tbody>
  </table>

  <div style="margin-top:26px;padding-top:12px;border-top:1px solid #E2E8F0;font-size:10px;color:#94A3B8">
    Envoi automatique PC Trackers. Modifiez la fréquence dans l'onglet Rapport de l'application.
  </div>
</body></html>`;
}

// --- Envois externes ---------------------------------------------------

async function sendPush(tokens: string[], title: string, body: string) {
  if (tokens.length === 0) return { sent: 0 };

  // L'API Expo accepte 100 messages par requete.
  const chunks: string[][] = [];
  for (let i = 0; i < tokens.length; i += 100) chunks.push(tokens.slice(i, i + 100));

  let sent = 0;
  for (const chunk of chunks) {
    const messages = chunk.map((to) => ({
      to,
      sound: 'default',
      title,
      body,
      data: { type: 'stale-projects' },
      priority: 'high',
    }));

    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    });

    if (res.ok) sent += chunk.length;
    else console.error('[push] Echec Expo :', res.status, await res.text());
  }
  return { sent };
}

async function sendEmail(to: string, subject: string, html: string) {
  const key = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('REPORT_FROM_EMAIL') ?? 'PC Trackers <onboarding@resend.dev>';

  if (!key) {
    console.log('[mail] RESEND_API_KEY absente — envoi ignoré.');
    return { sent: false, reason: 'no-key' };
  }

  const res = await fetch(RESEND_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!res.ok) {
    console.error('[mail] Echec Resend :', res.status, await res.text());
    return { sent: false, reason: 'resend-error' };
  }
  return { sent: true };
}

// --- Point d'entree ----------------------------------------------------

Deno.serve(async (req) => {
  // Le secret partage empeche un appel non autorise depuis l'exterieur.
  const expected = Deno.env.get('CRON_SECRET');
  if (expected) {
    const provided =
      req.headers.get('x-cron-secret') ??
      (req.headers.get('authorization') ?? '').replace('Bearer ', '');
    if (provided !== expected) {
      return new Response('Unauthorized', { status: 401 });
    }
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    // La cle service_role contourne la RLS : indispensable pour parcourir
    // les dossiers de tous les utilisateurs depuis une tache planifiee.
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const now = new Date();
  const summary = { users: 0, pushed: 0, emailed: 0, errors: [] as string[] };

  try {
    const { data: projects, error: pErr } = await supabase
      .from('projects')
      .select('id,user_id,"clientName","projectType",versements,expenses,checklist,updated_at');
    if (pErr) throw pErr;

    const { data: settingsRows } = await supabase.from('user_settings').select('*');
    const { data: tokenRows } = await supabase.from('push_tokens').select('user_id,token');

    const settingsByUser = new Map<string, SettingsRow>();
    for (const s of (settingsRows ?? []) as SettingsRow[]) settingsByUser.set(s.user_id, s);

    const tokensByUser = new Map<string, string[]>();
    for (const t of (tokenRows ?? []) as { user_id: string; token: string }[]) {
      tokensByUser.set(t.user_id, [...(tokensByUser.get(t.user_id) ?? []), t.token]);
    }

    const byUser = new Map<string, ProjectRow[]>();
    for (const p of (projects ?? []) as ProjectRow[]) {
      byUser.set(p.user_id, [...(byUser.get(p.user_id) ?? []), p]);
    }

    for (const [userId, userProjects] of byUser) {
      summary.users++;
      const s = settingsByUser.get(userId);
      const threshold = s?.stale_threshold_days ?? DEFAULTS.stale_threshold_days;
      const alertsOn = s?.stale_alerts_enabled ?? DEFAULTS.stale_alerts_enabled;
      const frequency = s?.report_frequency ?? DEFAULTS.report_frequency;

      // --- 1. Alerte dossiers en sommeil ---
      const stale = userProjects.filter((p) => daysInactive(p) >= threshold);
      if (alertsOn && stale.length > 0) {
        const tokens = tokensByUser.get(userId) ?? [];
        const oldest = stale.sort((a, b) => daysInactive(b) - daysInactive(a))[0];
        const title =
          stale.length === 1
            ? '1 dossier en sommeil'
            : `${stale.length} dossiers en sommeil`;
        const body = `${oldest.clientName} — ${daysInactive(oldest)} jours sans activité.`;
        const { sent } = await sendPush(tokens, title, body);
        summary.pushed += sent;
      }

      // --- 2. Rapport complet par e-mail ---
      if (isReportDay(frequency, now)) {
        let to = s?.report_email ?? null;
        if (!to) {
          const { data: authUser } = await supabase.auth.admin.getUserById(userId);
          to = authUser?.user?.email ?? null;
        }
        if (to) {
          const html = buildReportHtml(userProjects, threshold);
          const subject = `Rapport PC Trackers — ${now.toLocaleDateString('fr-FR')}`;
          const { sent } = await sendEmail(to, subject, html);
          if (sent) summary.emailed++;
        }
      }
    }
  } catch (e) {
    console.error('[daily-check] Erreur :', e);
    summary.errors.push(String((e as Error)?.message ?? e));
  }

  return new Response(JSON.stringify(summary), {
    headers: { 'Content-Type': 'application/json' },
    status: summary.errors.length ? 500 : 200,
  });
});
