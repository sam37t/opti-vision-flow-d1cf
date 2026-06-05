export const DOSSIER_STATUSES = [
  "devis_envoye",
  "en_attente",
  "cotation_recue",
  "accord_recu",
  "a_modifier",
  "verres_commandes",
  "livre_facture",
  "refuse",
] as const;

export type DossierStatus = (typeof DOSSIER_STATUSES)[number];

export const STATUS_LABELS: Record<DossierStatus, string> = {
  devis_envoye: "Devis envoyé",
  en_attente: "En attente",
  cotation_recue: "Cotation reçue",
  accord_recu: "Accord reçu",
  a_modifier: "À modifier",
  verres_commandes: "Verres commandés",
  livre_facture: "Livré / Facturé",
  refuse: "Refusé",
};

export const STATUS_COLORS: Record<DossierStatus, string> = {
  devis_envoye: "bg-blue-100 text-blue-800 border-blue-200",
  en_attente: "bg-amber-100 text-amber-800 border-amber-200",
  cotation_recue: "bg-violet-100 text-violet-800 border-violet-200",
  accord_recu: "bg-emerald-100 text-emerald-800 border-emerald-200",
  a_modifier: "bg-orange-100 text-orange-800 border-orange-200",
  verres_commandes: "bg-indigo-100 text-indigo-800 border-indigo-200",
  livre_facture: "bg-teal-100 text-teal-800 border-teal-200",
  refuse: "bg-rose-100 text-rose-800 border-rose-200",
};
