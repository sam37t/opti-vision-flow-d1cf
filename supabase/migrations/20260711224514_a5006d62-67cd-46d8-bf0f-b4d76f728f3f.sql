
CREATE OR REPLACE FUNCTION public.sync_reste_a_charge()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.reste_a_charge := GREATEST(0, ROUND(
    COALESCE(NEW.montant_devis,0)
    - COALESCE(NEW.montant_ss,0)
    - COALESCE(NEW.montant_pec,0)
    - COALESCE(NEW.avoir_commercial,0)
  , 2));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_reste_a_charge ON public.dossiers;
CREATE TRIGGER trg_sync_reste_a_charge
BEFORE INSERT OR UPDATE OF montant_devis, montant_pec, montant_ss, avoir_commercial
ON public.dossiers
FOR EACH ROW EXECUTE FUNCTION public.sync_reste_a_charge();

-- Recalcul de tous les dossiers avec la nouvelle formule
UPDATE public.dossiers
SET reste_a_charge = GREATEST(0, ROUND(
  COALESCE(montant_devis,0)
  - COALESCE(montant_ss,0)
  - COALESCE(montant_pec,0)
  - COALESCE(avoir_commercial,0)
, 2))
WHERE ROUND(COALESCE(reste_a_charge,0),2) <> GREATEST(0, ROUND(
  COALESCE(montant_devis,0)
  - COALESCE(montant_ss,0)
  - COALESCE(montant_pec,0)
  - COALESCE(avoir_commercial,0)
, 2));
