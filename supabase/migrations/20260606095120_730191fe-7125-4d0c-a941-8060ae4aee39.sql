
-- Migrate remboursement_attendu -> montant_pec where missing
UPDATE public.dossiers
SET montant_pec = remboursement_attendu
WHERE montant_pec IS NULL AND remboursement_attendu IS NOT NULL;

-- Update trigger to clamp reste_a_charge >= 0
CREATE OR REPLACE FUNCTION public.compute_reste_a_charge()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.reste_a_charge := GREATEST(0, COALESCE(NEW.montant_devis, 0) - COALESCE(NEW.montant_pec, 0));
  RETURN NEW;
END;
$function$;

-- Re-create trigger to ensure it's wired
DROP TRIGGER IF EXISTS trg_compute_reste_a_charge ON public.dossiers;
CREATE TRIGGER trg_compute_reste_a_charge
BEFORE INSERT OR UPDATE ON public.dossiers
FOR EACH ROW EXECUTE FUNCTION public.compute_reste_a_charge();

-- Force recalculation of reste_a_charge for all existing rows
UPDATE public.dossiers SET montant_devis = montant_devis;
