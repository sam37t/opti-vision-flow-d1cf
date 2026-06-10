export interface DossierAlertData {
  status: string;
  pec_demande_at: string | null;
  last_status_change_at: string;
  facture_cosium: boolean;
  transmis_mutuelle: boolean;
  paiement_recu: boolean;
  transmis_mutuelle_at: string | null;
  facture_cosium_at: string | null;
}

export function daysSinceDevisSansRetour(d: DossierAlertData): number | null {
  if (d.status !== "devis_envoye") return null;
  const ref = d.pec_demande_at ?? d.last_status_change_at;
  if (!ref) return null;
  const days = Math.floor((Date.now() - new Date(ref).getTime()) / (24 * 3600 * 1000));
  if (days < 5) return null;
  return days;
}

export function daysSinceTransmisNonRegle(d: DossierAlertData): number | null {
  // S'applique aux dossiers transmis à la mutuelle mais pas encore réglés
  if (d.status !== "transmis_mutuelle" && !(d.transmis_mutuelle && !d.paiement_recu)) return null;
  if (d.status === "regle" || d.paiement_recu) return null;
  const ref = d.transmis_mutuelle_at ?? d.facture_cosium_at;
  if (!ref) return null;
  const days = Math.floor((Date.now() - new Date(ref).getTime()) / (24 * 3600 * 1000));
  if (days < 10) return null;
  return days;
}
