
-- Mutuelles manquantes
INSERT INTO public.mutuelles (name) VALUES
  ('Ociane'),
  ('Génération'),
  ('Mutuelle Familiale des Travailleurs Groupe Safran')
ON CONFLICT DO NOTHING;

-- Types de verres
INSERT INTO public.types_verres (name) VALUES
  ('Progressif 1.5 Transitions Xtractive photochromique'),
  ('Progressif 1.5 UV Clear'),
  ('Progressif 1.5 Transitions Gen8 photochromique'),
  ('Unifocal 1.5 T400 Onyx'),
  ('Unifocal 1.5 Major Clean'),
  ('Progressif 1.6 Transitions Emerald photochromique'),
  ('Unifocal 1.6 Transitions Ruby photochromique'),
  ('Progressif 1.5 Transitions Grey Onyx Abyssal photochromique'),
  ('Progressif 1.5 T400 Onyx'),
  ('Progressif 1.5 Blue Clear'),
  ('Progressif 1.5 Transitions Ambre photochromique')
ON CONFLICT DO NOTHING;

-- Mise à jour des dossiers existants (uniquement champs vides, on conserve statut)
UPDATE public.dossiers SET montant_devis=797.00, type_verres='Progressif 1.5 UV Clear', pec_demande_at='2026-05-23' WHERE client_nom='ROGER' AND client_prenom='Karine';
UPDATE public.dossiers SET montant_devis=618.30, type_verres='Progressif 1.5 Transitions Gen8 photochromique', pec_demande_at='2026-06-05' WHERE client_nom='LOPY' AND client_prenom='Irène';
UPDATE public.dossiers SET montant_devis=909.20, type_verres='Unifocal 1.5 T400 Onyx', pec_demande_at='2026-05-21' WHERE client_nom='LEFEBVRE' AND client_prenom='Nathalie';
UPDATE public.dossiers SET montant_devis=1502.80, type_verres='Progressif 1.6 Transitions Emerald photochromique', pec_demande_at='2026-05-29' WHERE client_nom='JOLIBOIS' AND client_prenom='Thierry';
UPDATE public.dossiers SET montant_devis=1068.00, type_verres='Unifocal 1.6 Transitions Ruby photochromique', pec_demande_at='2026-06-04' WHERE client_nom='HENINE' AND client_prenom='Driss';
UPDATE public.dossiers SET montant_devis=1457.20, type_verres='Progressif 1.5 Transitions Grey Onyx Abyssal photochromique', pec_demande_at='2026-05-26' WHERE client_nom='ETTAJ' AND client_prenom='Siham';
UPDATE public.dossiers SET montant_devis=1377.20, type_verres='Progressif 1.5 T400 Onyx', pec_demande_at='2026-05-26' WHERE client_nom='ETTAJ' AND client_prenom='Mostafa';
UPDATE public.dossiers SET montant_devis=761.60, type_verres='Progressif 1.5 Blue Clear', pec_demande_at='2026-05-05' WHERE client_nom='CRENN' AND client_prenom='Sandrine';
UPDATE public.dossiers SET montant_devis=807.00, type_verres='Progressif 1.5 Transitions Ambre photochromique', pec_demande_at='2026-06-05' WHERE client_nom='CHOET' AND client_prenom='Marie-Laure';
UPDATE public.dossiers SET montant_devis=1289.20, type_verres='Progressif 1.5 T400 Onyx', pec_demande_at='2026-05-13' WHERE client_nom='BERNEVAL' AND client_prenom='Cyril';

-- Nouveaux dossiers
INSERT INTO public.dossiers (client_nom, client_prenom, mutuelle, type_verres, montant_devis, status, pec_demande_at) VALUES
  ('THOREL','Yolande','Mutuelle Familiale des Travailleurs Groupe Safran','Progressif 1.5 Transitions Xtractive photochromique',804.00,'a_traiter','2026-05-21'),
  ('LEFEBVRE','Elodie','Ociane','Unifocal 1.5 Major Clean',439.30,'a_traiter','2026-05-21'),
  ('BOUSLIBA','Mohammed-Es-Sal','Harmonie','Unifocal 1.5 Major Clean',287.00,'a_traiter','2026-05-23');

-- Notes ordonnances
WITH new_d AS (
  SELECT id, client_nom, client_prenom FROM public.dossiers
  WHERE (client_nom,client_prenom) IN (('THOREL','Yolande'),('LEFEBVRE','Elodie'),('BOUSLIBA','Mohammed-Es-Sal'))
)
INSERT INTO public.dossier_notes (dossier_id, content)
SELECT id,
  CASE
    WHEN client_nom='THOREL' THEN 'Ordonnance du 21/05/2026 - Devis du 21/05/2026'
    WHEN client_nom='LEFEBVRE' THEN 'Ordonnance du 19/06/2025 - Devis du 21/05/2026 - Pas de mutuelle (Ociane à confirmer)'
    WHEN client_nom='BOUSLIBA' THEN 'Ordonnance du 08/04/2026 - Devis du 23/05/2026'
  END
FROM new_d;
