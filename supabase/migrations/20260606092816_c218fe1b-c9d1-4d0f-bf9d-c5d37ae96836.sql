
CREATE OR REPLACE FUNCTION public.compute_reste_a_charge()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.reste_a_charge := COALESCE(NEW.montant_devis, 0) - COALESCE(NEW.montant_pec, 0);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_compute_reste_a_charge ON public.dossiers;
CREATE TRIGGER trg_compute_reste_a_charge
BEFORE INSERT OR UPDATE OF montant_devis, montant_pec ON public.dossiers
FOR EACH ROW EXECUTE FUNCTION public.compute_reste_a_charge();

UPDATE public.dossiers
SET reste_a_charge = COALESCE(montant_devis, 0) - COALESCE(montant_pec, 0);
