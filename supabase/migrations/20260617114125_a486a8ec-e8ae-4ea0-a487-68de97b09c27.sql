
-- 1) RLS dossiers: tout authentifié peut éditer
DROP POLICY IF EXISTS "Creator or gerante can update dossiers" ON public.dossiers;
CREATE POLICY "Authenticated can update dossiers"
  ON public.dossiers FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- 2) Trigger sync notes → messages: fan-out vers tous les autres profils (générique)
CREATE OR REPLACE FUNCTION public.sync_note_to_messages()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender uuid;
  r record;
BEGIN
  v_sender := NEW.author_id;
  IF v_sender IS NULL THEN
    RETURN NEW;
  END IF;
  FOR r IN
    SELECT p.id FROM public.profiles p
    WHERE p.id <> v_sender
      AND p.full_name NOT IN ('Rémi chéri', 'Test')
  LOOP
    INSERT INTO public.messages (sender_id, recipient_id, dossier_id, body, created_at)
    VALUES (v_sender, r.id, NEW.dossier_id, NEW.content, NEW.created_at);
  END LOOP;
  RETURN NEW;
END;
$$;

-- 3) Nettoyage: supprimer les messages liés au compte non utilisé "Rémi chéri"
DELETE FROM public.messages
WHERE sender_id = '684da6b6-ab93-44b2-98fc-234b683512cf'
   OR recipient_id = '684da6b6-ab93-44b2-98fc-234b683512cf';
