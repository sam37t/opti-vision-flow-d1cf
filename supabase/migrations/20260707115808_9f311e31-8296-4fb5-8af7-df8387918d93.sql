
-- 1) user_roles: remove broad read
DROP POLICY IF EXISTS "Authenticated can read roles" ON public.user_roles;

-- 2) dossiers: replace broad read/update, keep delete but inline role check
DROP POLICY IF EXISTS "Auth can read dossiers" ON public.dossiers;
DROP POLICY IF EXISTS "Authenticated can update dossiers" ON public.dossiers;
DROP POLICY IF EXISTS "Creator or gerante can delete dossiers" ON public.dossiers;

CREATE POLICY "Staff can read dossiers"
  ON public.dossiers FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()));

CREATE POLICY "Staff can update dossiers"
  ON public.dossiers FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()));

CREATE POLICY "Creator or gerante can delete dossiers"
  ON public.dossiers FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'gerante'::app_role
    )
  );

-- 3) dossier_history: restrict read to staff; tighten insert
DROP POLICY IF EXISTS "Auth can read history" ON public.dossier_history;
DROP POLICY IF EXISTS "Auth can insert history" ON public.dossier_history;

CREATE POLICY "Staff can read history"
  ON public.dossier_history FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()));

CREATE POLICY "Staff can insert history"
  ON public.dossier_history FOR INSERT TO authenticated
  WITH CHECK (
    (changed_by IS NULL OR changed_by = auth.uid())
    AND EXISTS (SELECT 1 FROM public.dossiers d WHERE d.id = dossier_id)
    AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid())
  );

-- 4) dossier_notes: restrict read to staff
DROP POLICY IF EXISTS "Auth can read notes" ON public.dossier_notes;

CREATE POLICY "Staff can read notes"
  ON public.dossier_notes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()));

-- 5) has_role SECURITY DEFINER: no longer needed in policies (inlined above).
--    Drop it so PostgREST cannot expose it as a callable RPC.
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role);
