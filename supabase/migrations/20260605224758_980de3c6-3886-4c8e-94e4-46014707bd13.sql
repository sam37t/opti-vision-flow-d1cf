
-- Bug #1: triggers sur dossiers
DROP TRIGGER IF EXISTS dossiers_set_updated_at ON public.dossiers;
CREATE TRIGGER dossiers_set_updated_at
  BEFORE UPDATE ON public.dossiers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS dossiers_status_change_before ON public.dossiers;
CREATE TRIGGER dossiers_status_change_before
  BEFORE UPDATE ON public.dossiers
  FOR EACH ROW EXECUTE FUNCTION public.log_dossier_status_update();

DROP TRIGGER IF EXISTS dossiers_status_change_after ON public.dossiers;
CREATE TRIGGER dossiers_status_change_after
  AFTER UPDATE ON public.dossiers
  FOR EACH ROW EXECUTE FUNCTION public.log_dossier_status_update_after();

DROP TRIGGER IF EXISTS dossiers_status_insert ON public.dossiers;
CREATE TRIGGER dossiers_status_insert
  AFTER INSERT ON public.dossiers
  FOR EACH ROW EXECUTE FUNCTION public.log_dossier_status_insert();

-- Bug #3: mutuelles manquantes
INSERT INTO public.mutuelles (name)
SELECT v FROM (VALUES ('Dynalis'),('Mercer'),('Isanté'),('SP'),('Viamedis')) AS t(v)
WHERE NOT EXISTS (SELECT 1 FROM public.mutuelles m WHERE m.name = t.v);

-- Bug #6: aligner last_status_change_at sur created_at pour les dossiers importés
UPDATE public.dossiers
SET last_status_change_at = created_at
WHERE created_at < '2026-06-05'::date;
