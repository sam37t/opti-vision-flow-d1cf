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