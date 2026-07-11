
-- Ajouter suivi séparé des règlements client et mutuelle
ALTER TABLE public.dossiers
  ADD COLUMN IF NOT EXISTS paiement_client_recu boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS paiement_client_recu_at date,
  ADD COLUMN IF NOT EXISTS paiement_mutuelle_recu boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS paiement_mutuelle_recu_at date;

-- Trigger: synchronise paiement_recu global quand les deux volets sont réglés
CREATE OR REPLACE FUNCTION public.sync_paiement_recu()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_client_due numeric;
  v_mutuelle_due numeric;
  v_client_ok boolean;
  v_mutuelle_ok boolean;
BEGIN
  v_client_due := GREATEST(0, COALESCE(NEW.reste_a_charge, 0) - COALESCE(NEW.avoir_commercial, 0));
  v_mutuelle_due := COALESCE(NEW.montant_pec, 0);

  v_client_ok := (v_client_due <= 0) OR NEW.paiement_client_recu;
  v_mutuelle_ok := (v_mutuelle_due <= 0) OR NEW.paiement_mutuelle_recu;

  IF v_client_ok AND v_mutuelle_ok AND (v_client_due > 0 OR v_mutuelle_due > 0) THEN
    NEW.paiement_recu := true;
    NEW.paiement_recu_at := COALESCE(
      NEW.paiement_recu_at,
      GREATEST(
        COALESCE(NEW.paiement_client_recu_at, NEW.paiement_mutuelle_recu_at, CURRENT_DATE),
        COALESCE(NEW.paiement_mutuelle_recu_at, NEW.paiement_client_recu_at, CURRENT_DATE)
      )
    );
  ELSE
    -- Si un des deux volets reste dû, on ne considère pas le dossier réglé
    IF NEW.paiement_recu IS TRUE AND NOT (v_client_ok AND v_mutuelle_ok) THEN
      NEW.paiement_recu := false;
      NEW.paiement_recu_at := NULL;
    END IF;
  END IF;

  -- Nettoyage des dates si décochées
  IF NEW.paiement_client_recu IS FALSE THEN
    NEW.paiement_client_recu_at := NULL;
  END IF;
  IF NEW.paiement_mutuelle_recu IS FALSE THEN
    NEW.paiement_mutuelle_recu_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_paiement_recu ON public.dossiers;
CREATE TRIGGER trg_sync_paiement_recu
BEFORE INSERT OR UPDATE ON public.dossiers
FOR EACH ROW EXECUTE FUNCTION public.sync_paiement_recu();
