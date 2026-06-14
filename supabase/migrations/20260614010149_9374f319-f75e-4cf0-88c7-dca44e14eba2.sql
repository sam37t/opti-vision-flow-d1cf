
-- 1) user_roles: restrict SELECT to own row
DROP POLICY IF EXISTS "Auth can read user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can read their own roles" ON public.user_roles;
CREATE POLICY "Users can read their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 2) Harden handle_new_user: ignore client-provided role, always default to 'employe'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'employe');
  RETURN NEW;
END;
$function$;

-- 3) Restrict dossier UPDATE/DELETE to creator or gerante role
DROP POLICY IF EXISTS "Auth can update dossiers" ON public.dossiers;
DROP POLICY IF EXISTS "Auth can delete dossiers" ON public.dossiers;
DROP POLICY IF EXISTS "Auth can modify dossiers" ON public.dossiers;

CREATE POLICY "Creator or gerante can update dossiers"
  ON public.dossiers FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'gerante'))
  WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(), 'gerante'));

CREATE POLICY "Creator or gerante can delete dossiers"
  ON public.dossiers FOR DELETE
  TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'gerante'));
