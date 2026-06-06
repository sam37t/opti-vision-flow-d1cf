export const DOSSIER_STATUSES = [
  "a_traiter",
  "devis_envoye",
  "en_attente",
  "cotation_recue",
  "accord_recu",
  "a_modifier",
  "verres_commandes",
  "livre_facture",
  "pas_de_tp",
  "refuse",
  "sans_suite_client",
] as const;

export type DossierStatus = (typeof DOSSIER_STATUSES)[number];

export const STATUS_LABELS: Record<DossierStatus, string> = {
  a_traiter: "À traiter",
  devis_envoye: "Devis envoyé",
  en_attente: "En attente",
  cotation_recue: "Cotation reçue",
  accord_recu: "Accord reçu",
  a_modifier: "À modifier",
  verres_commandes: "Verres commandés",
  livre_facture: "Livré / Facturé",
  pas_de_tp: "Pas de Tiers Payant",
  refuse: "Refusé",
  sans_suite_client: "Sans suite client",
};

export const STATUS_COLORS: Record<DossierStatus, string> = {
  a_traiter: "bg-zinc-100 text-zinc-800 border-zinc-200",
  devis_envoye: "bg-blue-100 text-blue-800 border-blue-200",
  en_attente: "bg-amber-100 text-amber-800 border-amber-200",
  cotation_recue: "bg-violet-100 text-violet-800 border-violet-200",
  accord_recu: "bg-emerald-100 text-emerald-800 border-emerald-200",
  a_modifier: "bg-orange-100 text-orange-800 border-orange-200",
  verres_commandes: "bg-indigo-100 text-indigo-800 border-indigo-200",
  livre_facture: "bg-teal-100 text-teal-800 border-teal-200",
  pas_de_tp: "bg-slate-100 text-slate-800 border-slate-200",
  refuse: "bg-rose-100 text-rose-800 border-rose-200",
  sans_suite_client: "bg-gray-100 text-gray-700 border-gray-300",
};

// Statuts considérés "terminés" (n'apparaissent plus dans les alertes 48h)
export const TERMINAL_STATUSES: DossierStatus[] = ["livre_facture", "refuse", "pas_de_tp", "sans_suite_client"];
