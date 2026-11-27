import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
import { canAnalyzeDossiers, summarizeDelays, type AnalysisRow } from "./dossier-analysis";

const row = (days: number, future: string | null = null): AnalysisRow => ({
  last_status_change_at: new Date(Date.UTC(2026, 10, 27, 12) - days * 86400000).toISOString(),
  updated_at: "2026-11-27T12:00:00Z", created_at: "2026-01-01T12:00:00Z",
  pec_a_demander_le: future, appeler_mutuelle: false,
});
const now = new Date("2026-11-27T12:00:00Z");
describe("Analyse des retards", () => {
  test("seule la gérante est autorisée", () => {
    assert.equal(canAnalyzeDossiers("gerante"), true);
    assert.equal(canAnalyzeDossiers("employe"), false);
    assert.equal(canAnalyzeDossiers(null), false);
  });
  test("compte les attentes à partir de quatre jours", () => {
    const result = summarizeDelays([row(3), row(4), row(40)], "facture", now);
    assert.equal(result.overdue, 2);
    assert.equal(result.medianDays, 4);
    assert.equal(result.maxDays, 40);
  });
  test("exclut les PEC futures uniquement pour les dossiers à traiter", () => {
    assert.equal(summarizeDelays([row(40, "2026-12-01")], "a_traiter", now).overdue, 0);
    assert.equal(summarizeDelays([row(40, "2026-12-01")], "accord_recu", now).overdue, 1);
  });
  test("ne considère pas les dossiers réglés comme en retard", () => {
    assert.equal(summarizeDelays([row(40)], "regle", now).overdue, 0);
  });
});