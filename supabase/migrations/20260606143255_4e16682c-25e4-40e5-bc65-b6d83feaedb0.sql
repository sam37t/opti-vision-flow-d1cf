ALTER TYPE public.dossier_status ADD VALUE IF NOT EXISTS 'sans_suite_client';

CREATE OR REPLACE FUNCTION public.enforce_pec_status_consistency()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF COALESCE(NEW.montant_pec, 0) > 0 AND NEW.status IN ('a_traiter', 'devis_envoye') THEN
    NEW.status := 'accord_recu';
  END IF;
  RETURN NEW;
END;
$function$;