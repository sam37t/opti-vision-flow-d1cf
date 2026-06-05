
ALTER TABLE public.dossiers DROP COLUMN IF EXISTS code_cosium;

INSERT INTO public.mutuelles (name)
SELECT 'Harmonie'
WHERE NOT EXISTS (SELECT 1 FROM public.mutuelles WHERE name = 'Harmonie');

INSERT INTO public.dossiers (client_nom, client_prenom, mutuelle, status) VALUES
('CHOET', 'Marie-Laure', 'Dynalis', 'devis_envoye'),
('LOPY', 'Irène', 'Harmonie', 'devis_envoye'),
('LAVAIL', 'Fabien', 'Mercer', 'devis_envoye'),
('CAMUS', 'Clément', 'Mercer', 'devis_envoye');
