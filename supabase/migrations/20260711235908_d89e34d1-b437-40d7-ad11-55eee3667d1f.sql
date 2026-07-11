DROP POLICY IF EXISTS "Auth can insert dossiers" ON public.dossiers;
CREATE POLICY "Staff can insert dossiers"
ON public.dossiers
FOR INSERT
TO authenticated
WITH CHECK (public.is_staff(auth.uid()) AND created_by = auth.uid());

DROP POLICY IF EXISTS "Auth can insert notes" ON public.dossier_notes;
CREATE POLICY "Staff can insert notes"
ON public.dossier_notes
FOR INSERT
TO authenticated
WITH CHECK (public.is_staff(auth.uid()) AND author_id = auth.uid());