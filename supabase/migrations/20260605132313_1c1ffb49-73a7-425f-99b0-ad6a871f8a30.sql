
DROP TRIGGER IF EXISTS trg_dossiers_log_status_ins ON public.dossiers;
DROP TRIGGER IF EXISTS trg_dossiers_log_status_upd ON public.dossiers;
DROP TRIGGER IF EXISTS trg_dossiers_updated_at ON public.dossiers;

CREATE TRIGGER trg_dossiers_log_status_ins
AFTER INSERT ON public.dossiers
FOR EACH ROW EXECUTE FUNCTION public.log_dossier_status_change();

CREATE TRIGGER trg_dossiers_log_status_upd
BEFORE UPDATE ON public.dossiers
FOR EACH ROW EXECUTE FUNCTION public.log_dossier_status_change();

CREATE TRIGGER trg_dossiers_updated_at
BEFORE UPDATE ON public.dossiers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
