
CREATE TABLE public.types_verres (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.types_verres TO authenticated;
GRANT ALL ON public.types_verres TO service_role;

ALTER TABLE public.types_verres ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth can read types_verres" ON public.types_verres
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth can insert types_verres" ON public.types_verres
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth can delete types_verres" ON public.types_verres
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

INSERT INTO public.types_verres (name) VALUES
  ('Unifocaux'), ('Progressifs'), ('Mi-distance'), ('Solaires'), ('Anti-lumière bleue')
ON CONFLICT (name) DO NOTHING;
