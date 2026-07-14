DROP TRIGGER IF EXISTS sync_paiement_recu_trigger ON public.dossiers;
CREATE TRIGGER sync_paiement_recu_trigger
BEFORE INSERT OR UPDATE OF paiement_client_recu, paiement_client_recu_at, paiement_mutuelle_recu, paiement_mutuelle_recu_at, montant_pec, reste_a_charge, avoir_commercial
ON public.dossiers
FOR EACH ROW
EXECUTE FUNCTION public.sync_paiement_recu();