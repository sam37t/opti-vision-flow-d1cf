type PriorityDossier = {
  last_status_change_at: string | null;
  updated_at: string | null;
  created_at: string;
  appeler_mutuelle: boolean;
  client_nom: string;
  client_prenom: string;
};

export function daysUnprocessed(d: Pick<PriorityDossier, "last_status_change_at" | "updated_at" | "created_at">, now = Date.now()): number {
  for (const ref of [d.last_status_change_at, d.updated_at, d.created_at]) {
    if (!ref) continue;
    const time = new Date(ref).getTime();
    if (Number.isFinite(time)) return Math.max(0, Math.floor((now - time) / 86_400_000));
  }
  return 0;
}

export function compareDossierPriority(a: PriorityDossier, b: PriorityDossier, now = Date.now()): number {
  const days = daysUnprocessed(b, now) - daysUnprocessed(a, now);
  if (days !== 0) return days;
  if (a.appeler_mutuelle !== b.appeler_mutuelle) return a.appeler_mutuelle ? -1 : 1;
  return `${a.client_nom} ${a.client_prenom}`.localeCompare(`${b.client_nom} ${b.client_prenom}`, "fr-FR", { sensitivity: "base" });
}