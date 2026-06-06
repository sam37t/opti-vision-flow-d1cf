ALTER TABLE public.dossiers ADD COLUMN IF NOT EXISTS facture_cosium_at date;

CREATE OR REPLACE FUNCTION public.set_facture_cosium_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.facture_cosium IS TRUE AND (OLD.facture_cosium IS DISTINCT FROM TRUE) THEN
    NEW.facture_cosium_at := COALESCE(NEW.facture_cosium_at, CURRENT_DATE);
  ELSIF NEW.facture_cosium IS FALSE THEN
    NEW.facture_cosium_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_facture_cosium_at ON public.dossiers;
CREATE TRIGGER trg_set_facture_cosium_at
BEFORE UPDATE ON public.dossiers
FOR EACH ROW EXECUTE FUNCTION public.set_facture_cosium_at();