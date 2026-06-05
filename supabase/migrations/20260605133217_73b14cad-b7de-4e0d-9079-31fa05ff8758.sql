
-- 1) New status
ALTER TYPE public.dossier_status ADD VALUE IF NOT EXISTS 'pas_de_tp';

-- 2) New fields + remove monture
ALTER TABLE public.dossiers
  ADD COLUMN IF NOT EXISTS remboursement_attendu NUMERIC,
  ADD COLUMN IF NOT EXISTS probleme BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.dossiers DROP COLUMN IF EXISTS monture;

-- 3) Mutuelles table
CREATE TABLE IF NOT EXISTS public.mutuelles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.mutuelles TO authenticated;
GRANT ALL ON public.mutuelles TO service_role;

ALTER TABLE public.mutuelles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth can read mutuelles" ON public.mutuelles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Auth can insert mutuelles" ON public.mutuelles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
