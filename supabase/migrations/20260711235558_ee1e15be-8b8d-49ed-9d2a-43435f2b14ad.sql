DROP POLICY IF EXISTS "Staff can insert history" ON public.dossier_history;
CREATE POLICY "Staff can insert history"
ON public.dossier_history
FOR INSERT
TO authenticated
WITH CHECK (public.is_staff(auth.uid()));