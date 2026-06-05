
-- Split status logging: BEFORE for UPDATE (needs to modify NEW), AFTER for INSERT (needs row to exist for FK)
DROP TRIGGER IF EXISTS trg_dossiers_log_status_ins ON public.dossiers;
DROP TRIGGER IF EXISTS trg_dossiers_log_status_upd ON public.dossiers;

CREATE OR REPLACE FUNCTION public.log_dossier_status_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.dossier_history (dossier_id, old_status, new_status, changed_by)
  VALUES (NEW.id, NULL, NEW.status, NEW.created_by);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_dossier_status_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.last_status_change_at := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_dossier_status_update_after()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.dossier_history (dossier_id, old_status, new_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_dossiers_log_status_ins
  AFTER INSERT ON public.dossiers
  FOR EACH ROW EXECUTE FUNCTION public.log_dossier_status_insert();

CREATE TRIGGER trg_dossiers_status_upd_before
  BEFORE UPDATE ON public.dossiers
  FOR EACH ROW EXECUTE FUNCTION public.log_dossier_status_update();

CREATE TRIGGER trg_dossiers_status_upd_after
  AFTER UPDATE ON public.dossiers
  FOR EACH ROW EXECUTE FUNCTION public.log_dossier_status_update_after();
