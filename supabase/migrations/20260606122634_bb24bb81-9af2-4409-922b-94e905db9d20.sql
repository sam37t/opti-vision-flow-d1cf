
CREATE OR REPLACE FUNCTION public.enforce_pec_status_consistency()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF COALESCE(NEW.montant_pec, 0) > 0 AND NEW.status IN ('a_traiter', 'devis_envoye') THEN
    NEW.status := 'accord_recu';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_pec_status_consistency ON public.dossiers;
CREATE TRIGGER trg_enforce_pec_status_consistency
BEFORE INSERT OR UPDATE ON public.dossiers
FOR EACH ROW EXECUTE FUNCTION public.enforce_pec_status_consistency();

UPDATE public.dossiers
SET status = 'accord_recu'
WHERE COALESCE(montant_pec, 0) > 0
  AND status IN ('a_traiter', 'devis_envoye');
