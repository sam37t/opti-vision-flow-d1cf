
-- Backfill données
UPDATE public.dossiers SET status = 'regle' WHERE paiement_recu = true AND status NOT IN ('refuse','pas_de_tp','sans_suite_client');
UPDATE public.dossiers SET status = 'transmis_mutuelle' WHERE transmis_mutuelle = true AND paiement_recu = false AND status NOT IN ('refuse','pas_de_tp','sans_suite_client');
UPDATE public.dossiers SET status = 'facture' WHERE status = 'livre_facture';
UPDATE public.dossiers SET status = 'accord_recu' WHERE status = 'verres_commandes';

-- Désactive l'ancienne règle d'auto-statut
DROP TRIGGER IF EXISTS enforce_pec_status_consistency_trg ON public.dossiers;
DROP TRIGGER IF EXISTS dossiers_enforce_pec_status_consistency ON public.dossiers;

-- Fonction d'auto-avancement de statut
CREATE OR REPLACE FUNCTION public.auto_advance_dossier_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target public.dossier_status;
  v_rank_current int;
  v_rank_target int;
  v_status_changed_manually boolean := false;
BEGIN
  -- Statuts hors-flux : ne pas toucher
  IF NEW.status IN ('refuse','pas_de_tp','sans_suite_client','en_attente','a_modifier') THEN
    RETURN NEW;
  END IF;

  -- Détecter si l'utilisateur a explicitement changé le statut dans cet UPDATE
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    v_status_changed_manually := true;
  END IF;

  -- Statut cible déduit des champs (plus avancé en premier)
  v_target := CASE
    WHEN NEW.paiement_recu = true OR NEW.paiement_recu_at IS NOT NULL THEN 'regle'
    WHEN NEW.transmis_mutuelle = true OR NEW.transmis_mutuelle_at IS NOT NULL THEN 'transmis_mutuelle'
    WHEN NEW.facture_cosium = true OR NEW.facture_cosium_at IS NOT NULL THEN 'facture'
    WHEN COALESCE(NEW.montant_pec,0) > 0 OR NEW.date_accord IS NOT NULL THEN 'accord_recu'
    WHEN NEW.cotation_recue_at IS NOT NULL THEN 'cotation_recue'
    WHEN NEW.pec_demande_at IS NOT NULL THEN 'devis_envoye'
    ELSE 'a_traiter'
  END;

  v_rank_current := CASE NEW.status
    WHEN 'a_traiter' THEN 10
    WHEN 'devis_envoye' THEN 20
    WHEN 'cotation_recue' THEN 30
    WHEN 'accord_recu' THEN 40
    WHEN 'facture' THEN 50
    WHEN 'livre_facture' THEN 50
    WHEN 'verres_commandes' THEN 40
    WHEN 'transmis_mutuelle' THEN 60
    WHEN 'regle' THEN 70
    ELSE 0
  END;

  v_rank_target := CASE v_target
    WHEN 'a_traiter' THEN 10
    WHEN 'devis_envoye' THEN 20
    WHEN 'cotation_recue' THEN 30
    WHEN 'accord_recu' THEN 40
    WHEN 'facture' THEN 50
    WHEN 'transmis_mutuelle' THEN 60
    WHEN 'regle' THEN 70
    ELSE 0
  END;

  -- Si l'utilisateur a forcé manuellement le statut dans cette opération,
  -- on respecte son choix sauf si un champ saisi en même temps implique un statut plus avancé.
  IF v_status_changed_manually THEN
    IF v_rank_target > v_rank_current THEN
      NEW.status := v_target;
    END IF;
    RETURN NEW;
  END IF;

  -- Sinon, on avance seulement (jamais de régression)
  IF v_rank_target > v_rank_current THEN
    NEW.status := v_target;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.auto_advance_dossier_status() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS dossiers_auto_advance_status_ins ON public.dossiers;
DROP TRIGGER IF EXISTS dossiers_auto_advance_status_upd ON public.dossiers;

CREATE TRIGGER dossiers_auto_advance_status_ins
  BEFORE INSERT ON public.dossiers
  FOR EACH ROW EXECUTE FUNCTION public.auto_advance_dossier_status();

-- Doit s'exécuter APRES set_facture_cosium_at / set_transmis_mutuelle_at / sync_facture_transmis
-- afin de voir les valeurs synchronisées. Ordre alphabétique des triggers BEFORE => préfixe "zz_".
CREATE TRIGGER zz_dossiers_auto_advance_status_upd
  BEFORE UPDATE ON public.dossiers
  FOR EACH ROW EXECUTE FUNCTION public.auto_advance_dossier_status();
