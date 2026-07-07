ALTER TABLE public.dossiers
  ADD COLUMN IF NOT EXISTS avoir_commercial numeric,
  ADD COLUMN IF NOT EXISTS reste_a_charge_payment_method text;