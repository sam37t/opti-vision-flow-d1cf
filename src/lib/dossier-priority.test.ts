import { test } from "node:test";
import { strict as assert } from "node:assert";
import { compareDossierPriority, daysUnprocessed } from "./dossier-priority";
import { SELECTABLE_STATUSES } from "./dossier-status";

const now = Date.parse("2026-11-27T17:00:00Z");
const dossier = (days: number, call = false) => ({
  last_status_change_at: new Date(now - days * 86_400_000).toISOString(),
  updated_at: new Date(now).toISOString(),
  created_at: "2025-01-01T00:00:00Z",
  appeler_mutuelle: call, client_nom: "Test", client_prenom: "Client",
});

test("tous les statuts sont classés par jours non traités décroissants", () => {
  for (const status of SELECTABLE_STATUSES) {
    const rows = [4, 173, 0, 30].map((days) => ({ ...dossier(days), status }));
    rows.sort((a, b) => compareDossierPriority(a, b, now));
    assert.deepEqual(rows.map((row) => daysUnprocessed(row, now)), [173, 30, 4, 0], status);
  }
});
test("un appel mutuelle ne passe pas devant un dossier non traité depuis plus longtemps", () => {
  assert.ok(compareDossierPriority(dossier(173), dossier(4, true), now) < 0);
});
test("l'ancienneté de création ne remplace pas les jours dans le statut courant", () => {
  assert.equal(daysUnprocessed(dossier(4), now), 4);
});
test("les dossiers transmis suivent le retard de règlement affiché, 286 puis 163 puis 137 jours", () => {
  const rows = [
    { ...dossier(173), status: "transmis_mutuelle", transmis_mutuelle_at: dossier(137).last_status_change_at },
    { ...dossier(173), status: "transmis_mutuelle", transmis_mutuelle_at: dossier(163).last_status_change_at },
    { ...dossier(170), status: "transmis_mutuelle", transmis_mutuelle_at: dossier(286).last_status_change_at },
  ];
  rows.sort((a, b) => compareDossierPriority(a, b, now));
  assert.deepEqual(rows.map((row) => daysUnprocessed(row, now)), [286, 163, 137]);
});
test("les devis sont classés selon la date de demande sans retour", () => {
  assert.equal(daysUnprocessed({ ...dossier(173), status: "devis_envoye", pec_demande_at: dossier(30).last_status_change_at }, now), 30);
});