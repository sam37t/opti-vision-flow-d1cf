DROP POLICY IF EXISTS "Auth can read types_verres" ON public.types_verres;
CREATE POLICY "Staff can read types_verres" ON public.types_verres FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "Auth can read mutuelles" ON public.mutuelles;
CREATE POLICY "Staff can read mutuelles" ON public.mutuelles FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));