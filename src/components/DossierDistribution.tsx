import { useMemo } from "react";
import { Cell, Pie, PieChart } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { dossierDistribution } from "@/lib/dossier-distribution";
import { STATUS_LABELS, type DossierStatus } from "@/lib/dossier-status";

export default function DossierDistribution({ dossiers, selectedStatus }: {
  dossiers: readonly { status: DossierStatus; mutuelle: string | null }[];
  selectedStatus: string | undefined;
}) {
  const groups = useMemo(() => dossierDistribution(dossiers, selectedStatus), [dossiers, selectedStatus]);
  return (
    <section aria-label="Répartition par mutuelle" className="space-y-4">
      <h2 className="text-lg font-semibold">Répartition par mutuelle</h2>
      <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
        {groups.map(({ status, total, slices }) => (
          <article key={status} aria-label={STATUS_LABELS[status]} className="min-w-0 rounded-lg border bg-card p-4">
            <header className="flex items-start justify-between gap-3">
              <h3 className="min-w-0 break-words font-semibold">{STATUS_LABELS[status]}</h3>
              <span className="shrink-0 text-sm tabular-nums text-muted-foreground">{total} dossier{total > 1 ? "s" : ""}</span>
            </header>
            {total === 0 ? (
              <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">Aucun dossier</div>
            ) : (
              <>
                <ChartContainer config={{ value: { label: "Dossiers" } }} className="h-56 w-full aspect-auto" aria-label={`Camembert ${STATUS_LABELS[status]}`}>
                  <PieChart accessibilityLayer>
                    <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                    <Pie data={slices} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} stroke="var(--card)" strokeWidth={2} isAnimationActive={false}>
                      {slices.map((slice) => <Cell key={slice.name} fill={`var(--distribution-${slice.colorIndex})`} />)}
                    </Pie>
                  </PieChart>
                </ChartContainer>
                <ul className="max-h-48 space-y-2 overflow-y-auto pr-1 text-sm" aria-label={`Mutuelles — ${STATUS_LABELS[status]}`}>
                  {slices.map((slice) => (
                    <li key={slice.name} className="grid grid-cols-[12px_minmax(0,1fr)_auto] items-start gap-2">
                      <svg width="12" height="12" className="mt-1" aria-hidden="true"><circle cx="6" cy="6" r="5" fill={`var(--distribution-${slice.colorIndex})`} /></svg>
                      <span className="break-words">{slice.name}</span>
                      <span className="tabular-nums">{slice.value} <span className="text-muted-foreground">· {slice.percentage.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %</span></span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}