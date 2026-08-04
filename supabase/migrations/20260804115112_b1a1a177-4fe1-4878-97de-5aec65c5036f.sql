
CREATE OR REPLACE FUNCTION public.sync_dossier_from_paiements()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_dossier_id uuid;
  v_client_sum numeric;
  v_mutuelle_sum numeric;
  v_client_last date;
  v_mutuelle_last date;
  v_client_due numeric;
  v_mutuelle_due numeric;
  v_client_ok boolean;
  v_mutuelle_ok boolean;
  d record;
BEGIN
  v_dossier_id := COALESCE(NEW.dossier_id, OLD.dossier_id);

  SELECT COALESCE(SUM(montant) FILTER (WHERE part = 'client'), 0),
         COALESCE(SUM(montant) FILTER (WHERE part = 'mutuelle'), 0),
         MAX(date_paiement) FILTER (WHERE part = 'client'),
         MAX(date_paiement) FILTER (WHERE part = 'mutuelle')
    INTO v_client_sum, v_mutuelle_sum, v_client_last, v_mutuelle_last
    FROM public.dossier_paiements WHERE dossier_id = v_dossier_id;

  SELECT * INTO d FROM public.dossiers WHERE id = v_dossier_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_client_due := GREATEST(0, COALESCE(d.reste_a_charge, 0));
  v_mutuelle_due := GREATEST(0, COALESCE(d.montant_pec, 0));

  -- Si des paiements existent pour une part, l'état "reçu" est recalculé depuis les montants
  v_client_ok := CASE
    WHEN v_client_sum > 0 THEN v_client_sum >= v_client_due - 0.01
    ELSE COALESCE(d.paiement_client_recu, false) END;
  v_mutuelle_ok := CASE
    WHEN v_mutuelle_sum > 0 THEN v_mutuelle_sum >= v_mutuelle_due - 0.01
    ELSE COALESCE(d.paiement_mutuelle_recu, false) END;

  UPDATE public.dossiers SET
    paiement_client_recu = v_client_ok,
    paiement_client_recu_at = CASE WHEN v_client_ok THEN COALESCE(v_client_last, d.paiement_client_recu_at, CURRENT_DATE) ELSE NULL END,
    paiement_mutuelle_recu = v_mutuelle_ok,
    paiement_mutuelle_recu_at = CASE WHEN v_mutuelle_ok THEN COALESCE(v_mutuelle_last, d.paiement_mutuelle_recu_at, CURRENT_DATE) ELSE NULL END,
    status = CASE
      WHEN (v_client_sum > 0 OR v_mutuelle_sum > 0)
           AND NOT (v_client_ok AND v_mutuelle_ok)
        THEN 'regle_partiel'::public.dossier_status
      ELSE d.status END
  WHERE id = v_dossier_id;

  RETURN NULL;
END;
$function$;

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
BEGIN
  IF NEW.status IN ('refuse','pas_de_tp','sans_suite_client','en_attente','a_modifier') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  v_target := CASE
    WHEN NEW.paiement_recu = true OR NEW.paiement_recu_at IS NOT NULL THEN 'regle'
    WHEN COALESCE(NEW.paiement_client_recu,false) OR COALESCE(NEW.paiement_mutuelle_recu,false) THEN 'regle_partiel'
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
    WHEN 'regle_partiel' THEN 65
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
    WHEN 'regle_partiel' THEN 65
    WHEN 'regle' THEN 70
    ELSE 0
  END;

  IF v_rank_target > v_rank_current THEN
    NEW.status := v_target;
  END IF;

  RETURN NEW;
END;
$function$;

-- Recalcul des dossiers ayant des paiements partiels enregistrés
WITH sums AS (
  SELECT p.dossier_id,
         COALESCE(SUM(p.montant) FILTER (WHERE p.part='client'),0) AS cs,
         COALESCE(SUM(p.montant) FILTER (WHERE p.part='mutuelle'),0) AS ms
  FROM public.dossier_paiements p GROUP BY p.dossier_id
)
UPDATE public.dossiers d SET
  paiement_client_recu = CASE WHEN s.cs > 0 THEN s.cs >= GREATEST(0,COALESCE(d.reste_a_charge,0)) - 0.01 ELSE d.paiement_client_recu END,
  paiement_client_recu_at = CASE WHEN s.cs > 0 AND NOT (s.cs >= GREATEST(0,COALESCE(d.reste_a_charge,0)) - 0.01) THEN NULL ELSE d.paiement_client_recu_at END,
  paiement_mutuelle_recu = CASE WHEN s.ms > 0 THEN s.ms >= GREATEST(0,COALESCE(d.montant_pec,0)) - 0.01 ELSE d.paiement_mutuelle_recu END,
  paiement_mutuelle_recu_at = CASE WHEN s.ms > 0 AND NOT (s.ms >= GREATEST(0,COALESCE(d.montant_pec,0)) - 0.01) THEN NULL ELSE d.paiement_mutuelle_recu_at END,
  paiement_recu = false,
  paiement_recu_at = NULL,
  status = 'regle_partiel'::public.dossier_status
FROM sums s
WHERE d.id = s.dossier_id
  AND (s.cs > 0 OR s.ms > 0)
  AND NOT (
    (CASE WHEN s.cs > 0 THEN s.cs >= GREATEST(0,COALESCE(d.reste_a_charge,0)) - 0.01 ELSE COALESCE(d.paiement_client_recu,false) END)
    AND
    (CASE WHEN s.ms > 0 THEN s.ms >= GREATEST(0,COALESCE(d.montant_pec,0)) - 0.01 ELSE COALESCE(d.paiement_mutuelle_recu,false) END)
  );
