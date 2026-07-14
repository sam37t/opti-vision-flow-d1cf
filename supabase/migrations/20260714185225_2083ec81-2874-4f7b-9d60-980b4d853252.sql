
ALTER TABLE public.dossiers_import_staging
  ADD COLUMN IF NOT EXISTS type_dossier text NOT NULL DEFAULT 'lunettes';

-- Marquer les lignes "(Lentilles)" et nettoyer le prénom
UPDATE public.dossiers_import_staging
SET type_dossier = 'lentilles',
    client_prenom = btrim(regexp_replace(client_prenom, '\s*\(lentilles\)\s*', '', 'gi'))
WHERE raw_nom_prenom ILIKE '%(Lentilles)%';
