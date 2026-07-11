
-- Recalcul du reste à charge pour tous les dossiers
UPDATE public.dossiers
SET reste_a_charge = ROUND(COALESCE(montant_devis,0) - COALESCE(montant_pec,0), 2)
WHERE ROUND(COALESCE(reste_a_charge,0),2) <> ROUND(COALESCE(montant_devis,0) - COALESCE(montant_pec,0), 2);

-- Fonction qui maintient reste_a_charge = montant_devis - montant_pec
CREATE OR REPLACE FUNCTION public.sync_reste_a_charge()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.reste_a_charge := ROUND(COALESCE(NEW.montant_devis,0) - COALESCE(NEW.montant_pec,0), 2);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_reste_a_charge ON public.dossiers;
CREATE TRIGGER trg_sync_reste_a_charge
BEFORE INSERT OR UPDATE OF montant_devis, montant_pec ON public.dossiers
FOR EACH ROW EXECUTE FUNCTION public.sync_reste_a_charge();
