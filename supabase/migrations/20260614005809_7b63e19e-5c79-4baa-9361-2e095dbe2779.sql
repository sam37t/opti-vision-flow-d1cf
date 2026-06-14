
CREATE OR REPLACE FUNCTION public.sync_note_to_messages()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender uuid;
  v_sam uuid := '1b915ef1-6963-42b3-9216-65771054f7be';
  v_remi uuid := '684da6b6-ab93-44b2-98fc-234b683512cf';
  r uuid;
BEGIN
  v_sender := COALESCE(NEW.author_id, v_sam);
  FOREACH r IN ARRAY ARRAY[v_sam, v_remi] LOOP
    IF r <> v_sender THEN
      INSERT INTO public.messages (sender_id, recipient_id, dossier_id, body, created_at)
      VALUES (v_sender, r, NEW.dossier_id, NEW.content, NEW.created_at);
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS dossier_notes_sync_messages ON public.dossier_notes;
CREATE TRIGGER dossier_notes_sync_messages
AFTER INSERT ON public.dossier_notes
FOR EACH ROW EXECUTE FUNCTION public.sync_note_to_messages();
