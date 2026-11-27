import { DOSSIER_STATUSES, SELECTABLE_STATUSES, type DossierStatus } from "@/lib/dossier-status";

export function dossierDistribution(
  dossiers: readonly { status: DossierStatus; mutuelle: string | null }[],
  selectedStatus?: string,
) {
  const names = [...new Set(dossiers.map((d) => d.mutuelle?.trim() || "Non renseignée"))]
    .sort((a, b) => a.localeCompare(b, "fr"));
  const statuses = DOSSIER_STATUSES.filter((status) => selectedStatus
    ? status === selectedStatus
    : SELECTABLE_STATUSES.includes(status) || dossiers.some((d) => d.status === status));
  return statuses.map((status) => {
    const counts = new Map<string, number>();
    for (const dossier of dossiers) {
      if (dossier.status !== status) continue;
      const name = dossier.mutuelle?.trim() || "Non renseignée";
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    const total = [...counts.values()].reduce((sum, count) => sum + count, 0);
    const slices = [...counts].map(([name, value]) => ({
      name, value, percentage: total ? value / total * 100 : 0,
      colorIndex: names.indexOf(name) % 10 + 1,
    })).sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, "fr"));
    return { status, total, slices };
  });
}