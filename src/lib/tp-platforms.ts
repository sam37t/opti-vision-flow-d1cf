// Mapping mutuelle → plateforme tiers payant

export type TpPlatform = {
  name: string;
  url: string;
};

// Normalisation pour matcher quelle que soit la casse / accents / espaces
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Plateformes connues
const VIAMEDIS: TpPlatform = { name: "Viamedis", url: "https://viamedis.net/ViamedisNet/page/ps/pec/dossier/consult/p_histo_dossiers?init=1&typeDossier=PEC" };
const APGIS: TpPlatform = { name: "APGIS", url: "https://espaceprofessionnel.apgis.com/" };
const SPSANTE: TpPlatform = { name: "SP Santé", url: "https://www.spsante.fr/" };
const HARMONIE: TpPlatform = { name: "Oxantis", url: "https://www.oxantis.net/HmNet/page/ps/pec/dossier/consult/p_histo_dossiers?init=1" };
const MERCER: TpPlatform = { name: "Mercer", url: "https://prosante.mercernet.fr/" };
const FILHET: TpPlatform = { name: "Filhet-Allard", url: "https://extranet.filhetallard.com/" };
const OCIANE: TpPlatform = { name: "Ociane", url: "https://espace-professionnels-sante.ociane.matmut.fr/" };

// Mutuelle (normalisée) → plateforme
const MAP: Record<string, TpPlatform> = {
  "harmonie mutuelle": HARMONIE,
  "harmonie": HARMONIE,
  "generation": VIAMEDIS,
  "viamedis": VIAMEDIS,
  "dynalis": APGIS,
  "apgis": APGIS,
  "aon": SPSANTE,
  "sp sante": SPSANTE,
  "spsante": SPSANTE,
  "mercer": MERCER,
  "filhet allard": FILHET,
  "filhetallard": FILHET,
  "ociane": OCIANE,
  "ociane matmut": OCIANE,
};

export function getTpPlatform(mutuelle: string | null | undefined): TpPlatform | null {
  if (!mutuelle) return null;
  const key = norm(mutuelle);
  if (MAP[key]) return MAP[key];
  // Recherche partielle (ex: "Génération Santé" -> "generation")
  for (const k of Object.keys(MAP)) {
    if (key.includes(k)) return MAP[k];
  }
  return null;
}

// True si la plateforme TP a un nom différent de la mutuelle (concentrateur)
export function isDifferentPlatform(mutuelle: string, platform: TpPlatform): boolean {
  return norm(mutuelle) !== norm(platform.name) && !norm(platform.name).includes(norm(mutuelle).split(" ")[0]);
}
