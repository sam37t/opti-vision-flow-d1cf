ALTER TABLE public.dossiers ADD COLUMN IF NOT EXISTS montant_ss numeric;

CREATE OR REPLACE FUNCTION public.compute_reste_a_charge()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.reste_a_charge := GREATEST(0, COALESCE(NEW.montant_devis, 0) - COALESCE(NEW.montant_ss, 0) - COALESCE(NEW.montant_pec, 0));
  RETURN NEW;
END;
$function$;

UPDATE public.dossiers SET montant_devis = montant_devis;