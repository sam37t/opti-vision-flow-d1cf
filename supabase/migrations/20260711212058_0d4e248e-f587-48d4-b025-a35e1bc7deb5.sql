-- Autoriser la modification manuelle du statut, même vers un statut moins avancé.
-- Le trigger ne force plus 'accord_recu' quand l'utilisateur change explicitement le statut.
CREATE OR REPLACE FUNCTION public.enforce_pec_status_consistency()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  -- Si le statut est explicitement modifié dans cet UPDATE, on respecte le choix de l'utilisateur.
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  -- Sinon, on garde la cohérence automatique : PEC > 0 => au moins 'accord_recu'
  IF COALESCE(NEW.montant_pec, 0) > 0 AND NEW.status IN ('a_traiter', 'devis_envoye') THEN
    NEW.status := 'accord_recu';
  END IF;
  RETURN NEW;
END;
$function$;