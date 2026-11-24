DROP POLICY IF EXISTS "Auth can delete types_verres" ON public.types_verres;
DROP POLICY IF EXISTS "Auth can insert types_verres" ON public.types_verres;
CREATE POLICY "Staff can delete types_verres" ON public.types_verres FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can insert types_verres" ON public.types_verres FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));