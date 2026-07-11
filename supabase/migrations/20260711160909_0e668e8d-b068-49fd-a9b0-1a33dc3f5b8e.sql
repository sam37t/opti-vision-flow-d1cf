CREATE POLICY "Authors can update their own dossier notes"
ON public.dossier_notes
FOR UPDATE
TO authenticated
USING (auth.uid() = author_id)
WITH CHECK (auth.uid() = author_id);