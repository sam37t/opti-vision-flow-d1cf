import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
import { dossierDistribution } from "./dossier-distribution";

describe("Répartition des dossiers par statut et mutuelle", () => {
  const dossiers = [
    { status: "a_traiter" as const, mutuelle: "APGIS" },
    { status: "a_traiter" as const, mutuelle: "APGIS" },
    { status: "a_traiter" as const, mutuelle: "DYNALIS" },
    { status: "facture" as const, mutuelle: "DYNALIS" },
  ];
  test("compte séparément les mutuelles pour chaque statut", () => {
    const result = dossierDistribution(dossiers);
    const pending = result.find((group) => group.status === "a_traiter");
    assert.equal(pending?.total, 3);
    assert.deepEqual(pending?.slices.map((slice) => [slice.name, slice.value]), [["APGIS", 2], ["DYNALIS", 1]]);
    assert.equal(result.find((group) => group.status === "facture")?.total, 1);
  });
  test("respecte le filtre de statut", () => {
    assert.deepEqual(dossierDistribution(dossiers, "facture").map((group) => [group.status, group.total]), [["facture", 1]]);
  });
  test("conserve les dossiers sans mutuelle et les statuts vides", () => {
    const result = dossierDistribution([{ status: "accord_recu", mutuelle: null }]);
    assert.equal(result.find((group) => group.status === "accord_recu")?.slices[0]?.name, "Non renseignée");
    assert.equal(result.find((group) => group.status === "a_traiter")?.total, 0);
  });
});