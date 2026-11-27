type PriorityDossier = {
  status?: string;
  pec_demande_at?: string | null;
  transmis_mutuelle_at?: string | null;
  facture_cosium_at?: string | null;
  transmis_mutuelle?: boolean;
  paiement_recu?: boolean;
  last_status_change_at: string | null;
  updated_at: string | null;
  created_at: string;
  appeler_mutuelle: boolean;
  client_nom: string;
  client_prenom: string;
};

export function daysUnprocessed(d: Omit<PriorityDossier, "appeler_mutuelle" | "client_nom" | "client_prenom">, now = Date.now()): number {
  // Les alertes de devis et de règlement utilisent la date de l'étape,
  // pas la date d'un changement administratif de statut (notamment après import).
  const stageDate = d.status === "devis_envoye"
    ? d.pec_demande_at
    : d.status !== "regle" && !d.paiement_recu && (d.status === "transmis_mutuelle" || d.transmis_mutuelle)
      ? d.transmis_mutuelle_at ?? d.facture_cosium_at
      : null;
  for (const ref of [stageDate, d.last_status_change_at, d.updated_at, d.created_at]) {
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