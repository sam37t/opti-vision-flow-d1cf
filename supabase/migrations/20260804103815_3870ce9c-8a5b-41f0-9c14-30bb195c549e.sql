CREATE TABLE public.mutuelle_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mutuelle text NOT NULL,
  site_url text NOT NULL DEFAULT '',
  username text NOT NULL DEFAULT '',
  password text NOT NULL DEFAULT '',
  contact text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mutuelle_credentials TO authenticated;
GRANT ALL ON public.mutuelle_credentials TO service_role;

ALTER TABLE public.mutuelle_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read mutuelle credentials" ON public.mutuelle_credentials
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can insert mutuelle credentials" ON public.mutuelle_credentials
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update mutuelle credentials" ON public.mutuelle_credentials
  FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can delete mutuelle credentials" ON public.mutuelle_credentials
  FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

CREATE TRIGGER mutuelle_credentials_set_updated_at
  BEFORE UPDATE ON public.mutuelle_credentials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX mutuelle_credentials_mutuelle_idx ON public.mutuelle_credentials (lower(mutuelle));