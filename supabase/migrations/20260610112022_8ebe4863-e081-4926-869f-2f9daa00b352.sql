ALTER TYPE public.dossier_status ADD VALUE IF NOT EXISTS 'facture';
ALTER TYPE public.dossier_status ADD VALUE IF NOT EXISTS 'transmis_mutuelle';
ALTER TYPE public.dossier_status ADD VALUE IF NOT EXISTS 'regle';
ALTER TABLE public.dossiers ADD COLUMN IF NOT EXISTS cotation_recue_at date;