CREATE OR REPLACE FUNCTION public.sync_paiement_recu()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_client_due numeric;
  v_mutuelle_due numeric;
  v_client_ok boolean;
  v_mutuelle_ok boolean;
BEGIN
  v_client_due := GREATEST(0, COALESCE(NEW.reste_a_charge, 0));
  v_mutuelle_due := GREATEST(0, COALESCE(NEW.montant_pec, 0));

  v_client_ok := (v_client_due <= 0) OR COALESCE(NEW.paiement_client_recu, false);
  v_mutuelle_ok := (v_mutuelle_due <= 0) OR COALESCE(NEW.paiement_mutuelle_recu, false);

  IF v_client_ok
     AND v_mutuelle_ok
     AND (
       v_client_due > 0
       OR v_mutuelle_due > 0
       OR COALESCE(NEW.paiement_client_recu, false)
       OR COALESCE(NEW.paiement_mutuelle_recu, false)
     ) THEN
    NEW.paiement_recu := true;
    NEW.paiement_recu_at := COALESCE(
      NEW.paiement_recu_at,
      GREATEST(
        COALESCE(NEW.paiement_client_recu_at, NEW.paiement_mutuelle_recu_at, CURRENT_DATE),
        COALESCE(NEW.paiement_mutuelle_recu_at, NEW.paiement_client_recu_at, CURRENT_DATE)
      )
    );
  ELSIF NOT (v_client_ok AND v_mutuelle_ok) THEN
    NEW.paiement_recu := false;
    NEW.paiement_recu_at := NULL;
  END IF;

  IF COALESCE(NEW.paiement_client_recu, false) IS FALSE THEN
    NEW.paiement_client_recu_at := NULL;
  END IF;
  IF COALESCE(NEW.paiement_mutuelle_recu, false) IS FALSE THEN
    NEW.paiement_mutuelle_recu_at := NULL;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS sync_paiement_recu_trigger ON public.dossiers;