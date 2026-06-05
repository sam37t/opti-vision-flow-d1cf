
-- Roles enum
CREATE TYPE public.app_role AS ENUM ('gerante', 'employe');

-- Status enum
CREATE TYPE public.dossier_status AS ENUM (
  'devis_envoye',
  'en_attente',
  'cotation_recue',
  'accord_recu',
  'a_modifier',
  'verres_commandes',
  'livre_facture',
  'refuse'
);

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read roles" ON public.user_roles FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Auto-create profile + default role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'employe'));
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Dossiers
CREATE TABLE public.dossiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_nom TEXT NOT NULL,
  client_prenom TEXT NOT NULL,
  telephone TEXT NOT NULL DEFAULT '',
  mutuelle TEXT NOT NULL DEFAULT '',
  monture TEXT NOT NULL DEFAULT '',
  type_verres TEXT NOT NULL DEFAULT '',
  montant_devis NUMERIC(10,2) NOT NULL DEFAULT 0,
  montant_pec NUMERIC(10,2),
  reste_a_charge NUMERIC(10,2),
  status public.dossier_status NOT NULL DEFAULT 'devis_envoye',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_status_change_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dossiers TO authenticated;
GRANT ALL ON public.dossiers TO service_role;
ALTER TABLE public.dossiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth can read dossiers" ON public.dossiers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth can insert dossiers" ON public.dossiers FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth can update dossiers" ON public.dossiers FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Gerante can delete dossiers" ON public.dossiers FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'gerante'));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER update_dossiers_updated_at BEFORE UPDATE ON public.dossiers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- History
CREATE TABLE public.dossier_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID NOT NULL REFERENCES public.dossiers(id) ON DELETE CASCADE,
  old_status public.dossier_status,
  new_status public.dossier_status NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.dossier_history TO authenticated;
GRANT ALL ON public.dossier_history TO service_role;
ALTER TABLE public.dossier_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth can read history" ON public.dossier_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth can insert history" ON public.dossier_history FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- Status change trigger -> creates history + updates last_status_change_at
CREATE OR REPLACE FUNCTION public.log_dossier_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.dossier_history (dossier_id, old_status, new_status, changed_by)
    VALUES (NEW.id, NULL, NEW.status, NEW.created_by);
    RETURN NEW;
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.last_status_change_at := now();
    INSERT INTO public.dossier_history (dossier_id, old_status, new_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER dossier_status_change_log
BEFORE INSERT OR UPDATE ON public.dossiers
FOR EACH ROW EXECUTE FUNCTION public.log_dossier_status_change();

-- Notes
CREATE TABLE public.dossier_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID NOT NULL REFERENCES public.dossiers(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.dossier_notes TO authenticated;
GRANT ALL ON public.dossier_notes TO service_role;
ALTER TABLE public.dossier_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth can read notes" ON public.dossier_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth can insert notes" ON public.dossier_notes FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors can delete own notes" ON public.dossier_notes FOR DELETE TO authenticated USING (auth.uid() = author_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.dossiers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dossier_notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dossier_history;
