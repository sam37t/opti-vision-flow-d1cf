-- Supprimer les triggers dupliqués (deux jeux identiques existaient)
DROP TRIGGER IF EXISTS trg_dossiers_log_status_ins ON public.dossiers;
DROP TRIGGER IF EXISTS trg_dossiers_status_upd_before ON public.dossiers;
DROP TRIGGER IF EXISTS trg_dossiers_status_upd_after ON public.dossiers;

-- Dédoublonner l'historique existant
DELETE FROM public.dossier_history dh
USING public.dossier_history keep
WHERE dh.ctid > keep.ctid
  AND dh.dossier_id = keep.dossier_id
  AND dh.new_status = keep.new_status
  AND dh.old_status IS NOT DISTINCT FROM keep.old_status
  AND dh.changed_by IS NOT DISTINCT FROM keep.changed_by
  AND dh.changed_at = keep.changed_at;