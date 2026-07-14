
CREATE TABLE public.dossiers_import_staging (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_row int NOT NULL,
  raw_nom_prenom text NOT NULL,
  client_nom text NOT NULL,
  client_prenom text NOT NULL,
  date_achat date,
  mutuelle text,
  rbsmt_attente numeric,
  rac numeric,
  a_regler_papiers numeric,
  type_reglement text,
  paye text,
  tp_status text,
  tp_facture text,
  matched_dossier_id uuid REFERENCES public.dossiers(id) ON DELETE SET NULL,
  match_candidates jsonb DEFAULT '[]'::jsonb,
  decision text NOT NULL DEFAULT 'pending',
  imported_at timestamptz,
  imported_dossier_id uuid REFERENCES public.dossiers(id) ON DELETE SET NULL,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dossiers_import_staging TO authenticated;
GRANT ALL ON public.dossiers_import_staging TO service_role;

ALTER TABLE public.dossiers_import_staging ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view import staging"
  ON public.dossiers_import_staging FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can manage import staging"
  ON public.dossiers_import_staging FOR ALL
  TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE TRIGGER update_dossiers_import_staging_updated_at
  BEFORE UPDATE ON public.dossiers_import_staging
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_import_staging_decision ON public.dossiers_import_staging(decision);
CREATE INDEX idx_import_staging_matched ON public.dossiers_import_staging(matched_dossier_id);
