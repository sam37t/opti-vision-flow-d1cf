
-- Trigger-only SECURITY DEFINER functions: remove all EXECUTE from API roles.
-- Triggers run as table owner regardless of these grants.
REVOKE EXECUTE ON FUNCTION public.handle_new_user()               FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_dossier_status_insert()     FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_dossier_status_update()     FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_dossier_status_update_after() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_note_to_messages()         FROM PUBLIC, anon, authenticated;
