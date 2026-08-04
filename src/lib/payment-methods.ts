export type PaymentMethod =
  | "especes"
  | "carte_credit"
  | "virement"
  | "cheque"
  | "avoir_commercial"
  | "autre";

export const PAYMENT_METHODS: PaymentMethod[] = [
  "especes",
  "carte_credit",
  "virement",
  "cheque",
  "avoir_commercial",
  "autre",
];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  especes: "Espèces",
  carte_credit: "Carte de crédit",
  virement: "Virement",
  cheque: "Chèque",
  avoir_commercial: "Avoir commercial",
  autre: "Autre",
};

export const PAYMENT_METHOD_ICONS: Record<PaymentMethod, string> = {
  especes: "💵",
  carte_credit: "💳",
  virement: "🏦",
  cheque: "📄",
  avoir_commercial: "🎟️",
  autre: "❓",
};
