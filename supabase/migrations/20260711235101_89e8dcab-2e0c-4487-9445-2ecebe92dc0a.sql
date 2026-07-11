
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('gerante'::public.app_role, 'employe'::public.app_role)
  )
$$;

DROP POLICY IF EXISTS "Staff can read dossiers" ON public.dossiers;
CREATE POLICY "Staff can read dossiers" ON public.dossiers FOR SELECT TO authenticated
USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff can update dossiers" ON public.dossiers;
CREATE POLICY "Staff can update dossiers" ON public.dossiers FOR UPDATE TO authenticated
USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff can read notes" ON public.dossier_notes;
CREATE POLICY "Staff can read notes" ON public.dossier_notes FOR SELECT TO authenticated
USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff can read history" ON public.dossier_history;
CREATE POLICY "Staff can read history" ON public.dossier_history FOR SELECT TO authenticated
USING (public.is_staff(auth.uid()));
