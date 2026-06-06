CREATE OR REPLACE FUNCTION public.sync_facture_transmis()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Si on transmet à la mutuelle, forcer le statut "facturé sur Cosium"
  IF NEW.transmis_mutuelle IS TRUE AND NEW.facture_cosium IS DISTINCT FROM TRUE THEN
    NEW.facture_cosium := TRUE;
    NEW.facture_cosium_at := COALESCE(NEW.facture_cosium_at, CURRENT_DATE);
  END IF;

  -- Si on décoche "facturé sur Cosium", décocher aussi la transmission
  IF NEW.facture_cosium IS FALSE THEN
    NEW.transmis_mutuelle := FALSE;
    NEW.transmis_mutuelle_at := NULL;
    NEW.paiement_recu := FALSE;
    NEW.paiement_recu_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_facture_transmis ON public.dossiers;
CREATE TRIGGER trg_sync_facture_transmis
BEFORE INSERT OR UPDATE ON public.dossiers
FOR EACH ROW EXECUTE FUNCTION public.sync_facture_transmis();