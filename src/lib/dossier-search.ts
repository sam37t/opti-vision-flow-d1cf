// Recherche par montant dans la zone de recherche des dossiers.
// Accepte un montant exact (« 350 », « 350,50 », « 350 € ») ou une plage (« 100-200 »).
// Le montant est cherché sur : devis, accordé (PEC) et reste à charge.

export const AMOUNT_COLUMNS = ["montant_devis", "montant_pec", "reste_a_charge"] as const;

export type AmountFields = {
  montant_devis?: number | string | null;
  montant_pec?: number | string | null;
  reste_a_charge?: number | string | null;
};

export type AmountQuery = { exact: number } | { range: [number, number] };

function toNumber(raw: string): number | null {
  const t = raw
    .trim()
    .replace(/\s/g, "")
    .replace(/€/g, "")
    .replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

// Renvoie null si la saisie n'est pas un montant (nom, téléphone, etc.)
export function parseAmountQuery(q: string): AmountQuery | null {
  const t = q
    .trim()
    .replace(/\s/g, "")
    .replace(/€/g, "");
  if (!t) return null;

  const range = t.match(/^(\d+(?:[.,]\d+)?)\s*[-–]\s*(\d+(?:[.,]\d+)?)$/);
  if (range) {
    const a = toNumber(range[1] ?? "");
    const b = toNumber(range[2] ?? "");
    if (a == null || b == null) return null;
    return { range: a <= b ? [a, b] : [b, a] };
  }

  const exact = toNumber(t);
  return exact == null ? null : { exact };
}

// Filtre côté client (utilisé par la recherche de l'Accueil)
export function matchesAmountQuery(d: AmountFields, q: string): boolean {
  const parsed = parseAmountQuery(q);
  if (!parsed) return false;
  return AMOUNT_COLUMNS.some((col) => {
    const v = Number(d[col]);
    if (!Number.isFinite(v)) return false;
    if ("exact" in parsed) return Math.abs(v - parsed.exact) < 0.005;
    return v >= parsed.range[0] && v <= parsed.range[1];
  });
}

// Clauses PostgREST à ajouter au `or(...)` de la recherche (page Dossiers)
export function amountOrClauses(q: string): string[] {
  const parsed = parseAmountQuery(q);
  if (!parsed) return [];
  if ("exact" in parsed) {
    return AMOUNT_COLUMNS.map((col) => `${col}.eq.${parsed.exact}`);
  }
  const [min, max] = parsed.range;
  return AMOUNT_COLUMNS.map((col) => `and(${col}.gte.${min},${col}.lte.${max})`);
}

export const AMOUNT_SEARCH_HINT = "ex : 350 ou 100-200";
