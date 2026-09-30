DROP POLICY IF EXISTS "Authenticated can read profiles" ON public.profiles;
CREATE POLICY "Own or staff can read profiles" ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = id OR public.is_staff(auth.uid()));