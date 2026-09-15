import { ProjectRecord, CalendarEvent, ExpenseDetail } from '@/types';
import {
  formatCurrency,
  calculateTotalExpenses,
  calculateProfit,
  calculateProjectProgress,
  getDaysInactive,
  getStaleProjects,
  getProjectTypeLabel,
  formatDate,
} from '@/utils';

/** Libelles lisibles des 8 postes de depense. */
export const EXPENSE_LABELS: Record<keyof Omit<ExpenseDetail, 'depotDossierDate'>, string> = {
  cuVet: 'CU / VET',
  planArchi: 'Plan architecte',
  etudeSol: 'Étude de sol',
  noticeSecurite: 'Notice sécurité',
  depotDossier: 'Dépôt du dossier',
  panneauChantier: 'Panneau de chantier',
  apporteur: 'Apporteur d’affaires',
  autreDepense: 'Autre dépense',
};

export interface ReportLine {
  id: number;
  clientName: string;
  projectType: string;
  versements: number;
  expenses: number;
  profit: number;
  progress: number;
  daysInactive: number | null;
  isStale: boolean;
}

export interface ReportData {
  generatedAt: Date;
  ownerName: string;
  thresholdDays: number;
  totals: {
    revenue: number;
    expenses: number;
    profit: number;
    count: number;
    marginPct: number;
  };
  expenseBreakdown: { label: string; amount: number; pct: number }[];
  lines: ReportLine[];
  stale: ReportLine[];
  completed: ReportLine[];
  upcomingEvents: CalendarEvent[];
}

/**
 * Agrege toutes les donnees du rapport.
 *
 * Fonction pure : aucune dependance a React ou au reseau, ce qui permet de la
 * reutiliser telle quelle cote serveur pour le rapport envoye par e-mail.
 */
export function buildReport(
  projects: ProjectRecord[],
  events: CalendarEvent[],
  ownerName: string,
  thresholdDays: number = 7
): ReportData {
  const lines: ReportLine[] = projects.map((p) => {
    const expenses = calculateTotalExpenses(p);
    const days = getDaysInactive(p);
    return {
      id: p.id,
      clientName: p.clientName,
      projectType: getProjectTypeLabel(p.projectType),
      versements: p.versements,
      expenses,
      profit: calculateProfit(p),
      progress: calculateProjectProgress(p),
      daysInactive: days,
      isStale: days !== null && days >= thresholdDays,
    };
  });

  const revenue = lines.reduce((s, l) => s + l.versements, 0);
  const expenses = lines.reduce((s, l) => s + l.expenses, 0);
  const profit = lines.reduce((s, l) => s + l.profit, 0);

  // Cumul par poste de depense, sur l'ensemble des dossiers.
  const totalsByKey = new Map<string, number>();
  for (const p of projects) {
    for (const key of Object.keys(EXPENSE_LABELS) as (keyof typeof EXPENSE_LABELS)[]) {
      const amount = Number(p.expenses?.[key] ?? 0);
      if (amount > 0) {
        totalsByKey.set(key, (totalsByKey.get(key) ?? 0) + amount);
      }
    }
  }

  const expenseBreakdown = Array.from(totalsByKey.entries())
    .map(([key, amount]) => ({
      label: EXPENSE_LABELS[key as keyof typeof EXPENSE_LABELS],
      amount,
      pct: expenses > 0 ? Math.round((amount / expenses) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Evenements a venir, du plus proche au plus lointain.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcomingEvents = events
    .filter((e) => {
      const d = new Date(e.date);
      return !Number.isNaN(d.getTime()) && d >= today;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 10);

  return {
    generatedAt: new Date(),
    ownerName,
    thresholdDays,
    totals: {
      revenue,
      expenses,
      profit,
      count: lines.length,
      marginPct: revenue > 0 ? Math.round((profit / revenue) * 100) : 0,
    },
    expenseBreakdown,
    lines: [...lines].sort((a, b) => b.profit - a.profit),
    // A duree d'inactivite egale — cas frequent quand plusieurs dossiers
    // ont ete saisis le meme jour — on remonte les plus gros montants :
    // ce sont eux qu'il faut relancer en priorite.
    stale: lines
      .filter((l) => l.isStale)
      .sort(
        (a, b) =>
          (b.daysInactive ?? 0) - (a.daysInactive ?? 0) ||
          b.versements - a.versements
      ),
    completed: lines.filter((l) => l.progress >= 100),
    upcomingEvents,
  };
}

/** Recalcule la liste des dossiers en sommeil depuis les enregistrements bruts. */
export const staleFrom = getStaleProjects;

const esc = (s: string) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const money = (n: number) => `${formatCurrency(n)} F`;

/**
 * Rend le rapport en HTML autonome (styles inline, aucune ressource externe).
 *
 * Ce meme HTML sert a deux usages : expo-print le convertit en PDF sur
 * l'appareil, et il peut etre envoye tel quel comme corps d'e-mail.
 */
export function renderReportHtml(r: ReportData): string {
  const dateStr = r.generatedAt.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const kpi = (label: string, value: string, color: string) => `
    <div style="flex:1;min-width:120px;background:#fff;border:1px solid #E2E8F0;border-radius:12px;padding:14px">
      <div style="font-size:9px;font-weight:700;color:#94A3B8;letter-spacing:1px;text-transform:uppercase">${esc(label)}</div>
      <div style="font-size:18px;font-weight:800;color:${color};margin-top:6px">${esc(value)}</div>
    </div>`;

  const staleRows = r.stale.length
    ? r.stale
        .map(
          (l) => `
      <tr>
        <td style="padding:8px 10px;border-bottom:1px solid #F1F5F9">${esc(l.clientName)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #F1F5F9;color:#64748B">${esc(l.projectType)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #F1F5F9;text-align:right;font-weight:700;color:#EF4444">
          ${l.daysInactive} j
        </td>
      </tr>`
        )
        .join('')
    : `<tr><td colspan="3" style="padding:14px 10px;color:#10B981;font-weight:600">
         Aucun dossier en sommeil — tout est à jour.
       </td></tr>`;

  const projectRows = r.lines
    .map(
      (l) => `
    <tr>
      <td style="padding:8px 10px;border-bottom:1px solid #F1F5F9">
        ${esc(l.clientName)}
        ${l.isStale ? '<span style="color:#E76F51;font-size:9px;font-weight:700"> ● ' + l.daysInactive + ' j</span>' : ''}
      </td>
      <td style="padding:8px 10px;border-bottom:1px solid #F1F5F9;color:#64748B;font-size:11px">${esc(l.projectType)}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #F1F5F9;text-align:right">${money(l.versements)}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #F1F5F9;text-align:right;color:#64748B">${money(l.expenses)}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #F1F5F9;text-align:right;font-weight:700;color:${l.profit >= 0 ? '#059669' : '#EF4444'}">${money(l.profit)}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #F1F5F9;text-align:right;color:#475569">${l.progress}%</td>
    </tr>`
    )
    .join('');

  const breakdownRows = r.expenseBreakdown.length
    ? r.expenseBreakdown
        .map(
          (b) => `
      <tr>
        <td style="padding:7px 10px;border-bottom:1px solid #F1F5F9">${esc(b.label)}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #F1F5F9;text-align:right">${money(b.amount)}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #F1F5F9;text-align:right;color:#64748B">${b.pct}%</td>
      </tr>`
        )
        .join('')
    : `<tr><td colspan="3" style="padding:14px 10px;color:#94A3B8">Aucune dépense enregistrée.</td></tr>`;

  const eventRows = r.upcomingEvents.length
    ? r.upcomingEvents
        .map(
          (e) => `
      <tr>
        <td style="padding:7px 10px;border-bottom:1px solid #F1F5F9">${esc(formatDate(e.date))}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #F1F5F9">${esc(e.title)}</td>
      </tr>`
        )
        .join('')
    : `<tr><td colspan="2" style="padding:14px 10px;color:#94A3B8">Aucune échéance à venir.</td></tr>`;

  const th = 'padding:9px 10px;text-align:left;font-size:9px;font-weight:700;color:#fff;letter-spacing:.5px;text-transform:uppercase';
  const thR = th + ';text-align:right';
  const section = 'font-size:13px;font-weight:800;color:#2F4F4F;margin:26px 0 8px';

  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Rapport PC Trackers</title></head>
<body style="margin:0;padding:26px;background:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1E293B">

  <div style="border-left:4px solid #D4AF37;padding-left:12px;margin-bottom:22px">
    <div style="font-size:20px;font-weight:800;letter-spacing:1px">SUIVI PERMIS <span style="color:#D4AF37">PRO</span></div>
    <div style="font-size:11px;color:#64748B;margin-top:3px">
      Rapport complet — ${esc(dateStr)}${r.ownerName ? ' · ' + esc(r.ownerName) : ''}
    </div>
  </div>

  <div style="display:flex;gap:10px;flex-wrap:wrap">
    ${kpi('Recettes', money(r.totals.revenue), '#E76F51')}
    ${kpi('Dépenses', money(r.totals.expenses), '#F4A261')}
    ${kpi('Bénéfice', money(r.totals.profit), r.totals.profit >= 0 ? '#2A9D8F' : '#EF4444')}
    ${kpi('Marge', r.totals.marginPct + ' %', '#2F4F4F')}
    ${kpi('Dossiers', String(r.totals.count), '#E9C46A')}
  </div>

  <div style="${section}">Dossiers en sommeil (plus de ${r.thresholdDays} jours sans activité)</div>
  <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:10px;overflow:hidden;font-size:12px">
    <thead><tr style="background:#E76F51">
      <th style="${th}">Client</th><th style="${th}">Type</th><th style="${thR}">Inactivité</th>
    </tr></thead>
    <tbody>${staleRows}</tbody>
  </table>

  <div style="${section}">Détail par dossier</div>
  <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:10px;overflow:hidden;font-size:12px">
    <thead><tr style="background:#2F4F4F">
      <th style="${th}">Client</th><th style="${th}">Type</th>
      <th style="${thR}">Versements</th><th style="${thR}">Dépenses</th>
      <th style="${thR}">Bénéfice</th><th style="${thR}">Avanc.</th>
    </tr></thead>
    <tbody>${projectRows}</tbody>
  </table>

  <div style="${section}">Répartition des dépenses</div>
  <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:10px;overflow:hidden;font-size:12px">
    <thead><tr style="background:#475569">
      <th style="${th}">Poste</th><th style="${thR}">Montant</th><th style="${thR}">Part</th>
    </tr></thead>
    <tbody>${breakdownRows}</tbody>
  </table>

  <div style="${section}">Échéances à venir</div>
  <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:10px;overflow:hidden;font-size:12px">
    <thead><tr style="background:#475569">
      <th style="${th}">Date</th><th style="${th}">Événement</th>
    </tr></thead>
    <tbody>${eventRows}</tbody>
  </table>

  <div style="margin-top:28px;padding-top:12px;border-top:1px solid #E2E8F0;font-size:10px;color:#94A3B8">
    Document généré automatiquement par PC Trackers · ${esc(r.generatedAt.toLocaleString('fr-FR'))}
  </div>
</body></html>`;
}

/** Version texte courte, pour le corps d'une notification ou d'un SMS. */
export function renderReportSummary(r: ReportData): string {
  const parts = [
    `${r.totals.count} dossier(s)`,
    `Bénéfice ${money(r.totals.profit)}`,
    `Marge ${r.totals.marginPct} %`,
  ];
  if (r.stale.length > 0) {
    parts.push(`${r.stale.length} en sommeil`);
  }
  return parts.join(' · ');
}
