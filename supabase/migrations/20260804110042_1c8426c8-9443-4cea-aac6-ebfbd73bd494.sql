CREATE TABLE public.dossier_paiements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dossier_id uuid NOT NULL REFERENCES public.dossiers(id) ON DELETE CASCADE,
  part text NOT NULL DEFAULT 'client',
  montant numeric NOT NULL DEFAULT 0,
  methode text NOT NULL DEFAULT 'autre',
  date_paiement date NOT NULL DEFAULT CURRENT_DATE,
  note text NOT NULL DEFAULT '',
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dossier_paiements TO authenticated;
GRANT ALL ON public.dossier_paiements TO service_role;

ALTER TABLE public.dossier_paiements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read dossier paiements" ON public.dossier_paiements
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can insert dossier paiements" ON public.dossier_paiements
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update dossier paiements" ON public.dossier_paiements
  FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can delete dossier paiements" ON public.dossier_paiements
  FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

CREATE INDEX idx_dossier_paiements_dossier ON public.dossier_paiements(dossier_id);

CREATE TRIGGER dossier_paiements_set_updated_at
  BEFORE UPDATE ON public.dossier_paiements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.sync_dossier_from_paiements()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_dossier_id uuid;
  v_client_sum numeric;
  v_mutuelle_sum numeric;
  v_client_last date;
  v_mutuelle_last date;
  d record;
BEGIN
  v_dossier_id := COALESCE(NEW.dossier_id, OLD.dossier_id);

  SELECT COALESCE(SUM(montant) FILTER (WHERE part = 'client'), 0),
         COALESCE(SUM(montant) FILTER (WHERE part = 'mutuelle'), 0),
         MAX(date_paiement) FILTER (WHERE part = 'client'),
         MAX(date_paiement) FILTER (WHERE part = 'mutuelle')
    INTO v_client_sum, v_mutuelle_sum, v_client_last, v_mutuelle_last
    FROM public.dossier_paiements WHERE dossier_id = v_dossier_id;

  SELECT * INTO d FROM public.dossiers WHERE id = v_dossier_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  UPDATE public.dossiers SET
    paiement_client_recu = CASE
      WHEN COALESCE(d.reste_a_charge,0) > 0 AND v_client_sum >= COALESCE(d.reste_a_charge,0) - 0.01 THEN true
      WHEN v_client_sum > 0 THEN d.paiement_client_recu
      ELSE d.paiement_client_recu END,
    paiement_client_recu_at = CASE
      WHEN COALESCE(d.reste_a_charge,0) > 0 AND v_client_sum >= COALESCE(d.reste_a_charge,0) - 0.01 THEN COALESCE(v_client_last, CURRENT_DATE)
      ELSE d.paiement_client_recu_at END,
    paiement_mutuelle_recu = CASE
      WHEN COALESCE(d.montant_pec,0) > 0 AND v_mutuelle_sum >= COALESCE(d.montant_pec,0) - 0.01 THEN true
      ELSE d.paiement_mutuelle_recu END,
    paiement_mutuelle_recu_at = CASE
      WHEN COALESCE(d.montant_pec,0) > 0 AND v_mutuelle_sum >= COALESCE(d.montant_pec,0) - 0.01 THEN COALESCE(v_mutuelle_last, CURRENT_DATE)
      ELSE d.paiement_mutuelle_recu_at END
  WHERE id = v_dossier_id;

  RETURN NULL;
END;
$$;

CREATE TRIGGER dossier_paiements_sync
  AFTER INSERT OR UPDATE OR DELETE ON public.dossier_paiements
  FOR EACH ROW EXECUTE FUNCTION public.sync_dossier_from_paiements();