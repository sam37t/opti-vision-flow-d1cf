
DROP POLICY IF EXISTS "Gerante can delete dossiers" ON public.dossiers;

CREATE POLICY "Auth can delete dossiers"
  ON public.dossiers
  FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);
