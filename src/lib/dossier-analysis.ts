import { TERMINAL_STATUSES, type DossierStatus } from "@/lib/dossier-status";

export type AnalysisRow = {
  last_status_change_at: string | null;
  updated_at: string;
  created_at: string;
  pec_a_demander_le: string | null;
  appeler_mutuelle: boolean;
};

export function canAnalyzeDossiers(role: string | null): boolean {
  return role === "gerante";
}

export function summarizeDelays(rows: readonly AnalysisRow[], status: DossierStatus, now: Date) {
  const today = new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const scheduled = rows.filter((row) => status === "a_traiter" && row.pec_a_demander_le && row.pec_a_demander_le > today);
  const active = rows.filter((row) => !scheduled.includes(row));
  let unknownDates = 0;
  const days = active.flatMap((row) => {
    const date = Date.parse(row.last_status_change_at || row.updated_at || row.created_at);
    if (!Number.isFinite(date)) { unknownDates++; return []; }
    return [Math.max(0, Math.floor((now.getTime() - date) / 86400000))];
  }).sort((a, b) => a - b);
  const terminal = TERMINAL_STATUSES.includes(status);
  return {
    total: rows.length,
    scheduled: scheduled.length,
    active: active.length,
    unknownDates,
    terminal,
    overdue: terminal ? 0 : days.filter((day) => day >= 4).length,
    meanDays: days.length ? Math.round(days.reduce((sum, day) => sum + day, 0) / days.length) : 0,
    medianDays: days.length ? Math.round(((days[Math.floor((days.length - 1) / 2)] ?? 0) + (days[Math.floor(days.length / 2)] ?? 0)) / 2) : 0,
    maxDays: days.at(-1) ?? 0,
    callsToMake: active.filter((row) => row.appeler_mutuelle).length,
    ageBands: {
      under4: days.filter((day) => day < 4).length,
      from4to14: days.filter((day) => day >= 4 && day <= 14).length,
      from15to30: days.filter((day) => day >= 15 && day <= 30).length,
      over30: days.filter((day) => day > 30).length,
    },
  };
}