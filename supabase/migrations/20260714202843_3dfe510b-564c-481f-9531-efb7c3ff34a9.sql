CREATE OR REPLACE FUNCTION public.set_transmis_mutuelle_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.transmis_mutuelle IS TRUE
     AND OLD.transmis_mutuelle IS DISTINCT FROM TRUE
     AND NEW.transmis_mutuelle_at IS NULL THEN
    NEW.transmis_mutuelle_at := now();
  ELSIF NEW.transmis_mutuelle IS FALSE
        AND OLD.transmis_mutuelle IS DISTINCT FROM FALSE THEN
    NEW.transmis_mutuelle_at := NULL;
    NEW.paiement_recu := FALSE;
    NEW.paiement_recu_at := NULL;
  END IF;
  RETURN NEW;
END;
$function$;