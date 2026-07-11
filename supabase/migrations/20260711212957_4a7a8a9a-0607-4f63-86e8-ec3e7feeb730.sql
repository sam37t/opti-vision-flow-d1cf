CREATE OR REPLACE FUNCTION public.auto_advance_dossier_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_target public.dossier_status;
  v_rank_current int;
  v_rank_target int;
  v_status_changed_manually boolean := false;
BEGIN
  IF NEW.status IN ('refuse','pas_de_tp','sans_suite_client','en_attente','a_modifier') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    v_status_changed_manually := true;
  END IF;

  -- Si l'utilisateur change explicitement le statut, on respecte son choix sans le "réavancer"
  IF v_status_changed_manually THEN
    RETURN NEW;
  END IF;

  v_target := CASE
    WHEN NEW.paiement_recu = true OR NEW.paiement_recu_at IS NOT NULL THEN 'regle'
    WHEN NEW.transmis_mutuelle = true OR NEW.transmis_mutuelle_at IS NOT NULL THEN 'transmis_mutuelle'
    WHEN NEW.facture_cosium = true OR NEW.facture_cosium_at IS NOT NULL OR NEW.facture_client = true OR NEW.facture_client_at IS NOT NULL THEN 'facture'
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

  IF v_rank_target > v_rank_current THEN
    NEW.status := v_target;
  END IF;

  RETURN NEW;
END;
$function$;