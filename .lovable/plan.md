# Automatisation des statuts dossiers

## Objectif
Faire avancer le statut automatiquement quand l'utilisateur saisit une date ou coche une case, sans jamais régresser, et supprimer les champs/cases redondants avec le statut.

## 1. Enum statuts — alignement avec la demande

Statuts cibles (ordre du workflow) :
`a_traiter → devis_envoye → cotation_recue → accord_recu → facture → transmis_mutuelle → regle`
+ statuts hors-flux conservés : `en_attente`, `a_modifier`, `pas_de_tp`, `refuse`, `sans_suite_client`.

Changements enum :
- Ajouter `facture` (remplace `livre_facture` côté workflow), `transmis_mutuelle`, `regle`.
- Conserver `livre_facture` et `verres_commandes` en enum (compat données existantes) mais les retirer du sélecteur UI (cachés). Migration de données : `livre_facture` → `facture`, `verres_commandes` → `accord_recu`.
- Retirer `cotation_recue` du label ? Non — garder, le renommer "Cotation" à l'affichage.

## 2. Règles d'automatisation (trigger Postgres `BEFORE UPDATE/INSERT`)

Rang des statuts du workflow (pour empêcher la régression) :
```
a_traiter=10, devis_envoye=20, cotation_recue=30, accord_recu=40,
facture=50, transmis_mutuelle=60, regle=70
```
Statuts hors-flux (`en_attente`, `a_modifier`, `pas_de_tp`, `refuse`, `sans_suite_client`) : non remplacés automatiquement.

Statut cible déduit des champs (on prend le plus avancé) :
- `paiement_recu = true` OU `paiement_recu_at` non null → `regle`
- `transmis_mutuelle = true` OU `transmis_mutuelle_at` non null → `transmis_mutuelle`
- `facture_cosium = true` OU `facture_cosium_at` non null → `facture`
- `montant_pec > 0` OU `date_accord` non null → `accord_recu`
- (champ cotation : pas de champ dédié — voir §4)
- `pec_demande_at` non null → `devis_envoye`
- sinon → `a_traiter`

Règle non-régression : on n'applique le statut auto que si `rank(auto) > rank(current)` ET que le statut courant est un statut de workflow. Si l'utilisateur force manuellement un statut (UI), c'est respecté tant qu'aucun nouveau champ plus avancé n'est saisi.

## 3. Champs redondants à supprimer côté UI

Le statut découle des dates/montants → on retire les cases booléennes :
- `facture_cosium` (checkbox) → remplacé par "Date de facturation Cosium" seule.
- `transmis_mutuelle` (checkbox) → remplacé par "Date de transmission mutuelle" seule.
- `paiement_recu` (checkbox + bouton confirmer) → remplacé par "Date de règlement" seule.

Les colonnes booléennes restent en base (rétro-compat triggers) et sont auto-synchronisées par les triggers existants `set_facture_cosium_at` / `set_transmis_mutuelle_at` adaptés : booléen = (date non null).

## 4. Champ "cotation reçue"
Ajouter une colonne `cotation_recue_at date null` + input "Date de réception cotation" sur la fiche. Saisie → statut `cotation_recue`.

## 5. UI

- `dossiers.new.tsx` : retirer le sélecteur "Statut initial" (toujours `a_traiter`).
- `dossiers.$id.tsx` : 
  - Section Facturation : remplacer les 3 checkboxes par 4 inputs date (envoi devis = `pec_demande_at`, accord = `date_accord`, cotation = `cotation_recue_at`, facturation = `facture_cosium_at`, transmission = `transmis_mutuelle_at`, règlement = `paiement_recu_at`).
  - Effacer une date → autorisé, statut ne régresse pas (géré par trigger).
  - Garder le `Select` "Forcer le statut" pour override manuel.
  - Badge "À transmettre" rouge si `facture_cosium_at` rempli ET `transmis_mutuelle_at` vide (déjà présent en liste, à vérifier).
- `dossier-status.ts` : ajouter labels/couleurs pour `facture`, `transmis_mutuelle`, `regle`; cacher `livre_facture` et `verres_commandes` du sélecteur (mais garder dans le mapping pour affichage historique).
- `dossier-alerts.ts` et `dossiers.index.tsx` : adapter conditions de badges aux nouveaux statuts (`transmis_mutuelle` au lieu de `facture_cosium && transmis_mutuelle`).
- Ordre de tri statuts (récente demande utilisateur) : conserver, remplacer `livre_facture`→`facture`, ajouter `transmis_mutuelle` et `regle` aux bons rangs.

## 6. Migration SQL (résumé)

```sql
-- 1. enum
ALTER TYPE dossier_status ADD VALUE IF NOT EXISTS 'facture';
ALTER TYPE dossier_status ADD VALUE IF NOT EXISTS 'transmis_mutuelle';
ALTER TYPE dossier_status ADD VALUE IF NOT EXISTS 'regle';

-- 2. colonne
ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS cotation_recue_at date;

-- 3. backfill données existantes
UPDATE dossiers SET status='regle' WHERE paiement_recu;
UPDATE dossiers SET status='transmis_mutuelle' WHERE transmis_mutuelle AND NOT paiement_recu;
UPDATE dossiers SET status='facture' WHERE status='livre_facture';

-- 4. trigger BEFORE INSERT/UPDATE auto_status
--    + remplacer enforce_pec_status_consistency par cette logique unifiée
```

## Fichiers touchés
- nouvelle migration SQL
- `src/lib/dossier-status.ts` (enum/labels/couleurs, liste sélecteur)
- `src/lib/dossier-alerts.ts` (conditions)
- `src/routes/_authenticated/dossiers.$id.tsx` (refonte section Facturation, ajout cotation)
- `src/routes/_authenticated/dossiers.new.tsx` (suppression sélecteur statut)
- `src/routes/_authenticated/dossiers.index.tsx` (rangs de tri, badges)
- `src/components/StatusBadge.tsx` (pas de changement attendu)

## Confirmation demandée
1. OK pour renommer `livre_facture` → `facture` (donnée migrée, label affiché change) ?
2. OK pour supprimer du sélecteur les statuts `verres_commandes` et `livre_facture` (les anciennes données restent visibles dans l'historique) ?
3. OK pour ajouter le champ `cotation_recue_at` (sinon : conserver `cotation_recue` mais accessible uniquement via le sélecteur manuel) ?
