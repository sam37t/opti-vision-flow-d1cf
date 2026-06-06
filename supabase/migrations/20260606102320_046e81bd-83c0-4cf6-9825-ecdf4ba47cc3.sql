
ALTER TABLE public.dossiers
  ADD COLUMN IF NOT EXISTS facture_cosium boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS transmis_mutuelle boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS transmis_mutuelle_at timestamptz,
  ADD COLUMN IF NOT EXISTS paiement_recu boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS paiement_recu_at date;

-- Trigger pour horodater la transmission à la mutuelle automatiquement
CREATE OR REPLACE FUNCTION public.set_transmis_mutuelle_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.transmis_mutuelle IS TRUE AND (OLD.transmis_mutuelle IS DISTINCT FROM TRUE) THEN
    NEW.transmis_mutuelle_at := COALESCE(NEW.transmis_mutuelle_at, now());
  ELSIF NEW.transmis_mutuelle IS FALSE THEN
    NEW.transmis_mutuelle_at := NULL;
    NEW.paiement_recu := FALSE;
    NEW.paiement_recu_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_transmis_mutuelle_at ON public.dossiers;
CREATE TRIGGER trg_set_transmis_mutuelle_at
  BEFORE UPDATE ON public.dossiers
  FOR EACH ROW EXECUTE FUNCTION public.set_transmis_mutuelle_at();
