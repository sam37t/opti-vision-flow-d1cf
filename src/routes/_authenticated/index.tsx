import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Clock, FolderKanban, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DOSSIER_STATUSES, STATUS_LABELS, type DossierStatus } from "@/lib/dossier-status";
import { StatusBadge } from "@/components/StatusBadge";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({ meta: [{ title: "Tableau de bord — Optique Suivi" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data: dossiers = [], isLoading } = useQuery({
    queryKey: ["dossiers-dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dossiers")
        .select("id, client_nom, client_prenom, mutuelle, status, montant_devis, last_status_change_at, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const counts = DOSSIER_STATUSES.reduce<Record<DossierStatus, number>>((acc, s) => {
    acc[s] = dossiers.filter((d) => d.status === s).length;
    return acc;
  }, {} as Record<DossierStatus, number>);

  const now = Date.now();
  const TERMINAL: DossierStatus[] = ["livre_facture", "refuse"];
  const stale = dossiers.filter(
    (d) =>
      !TERMINAL.includes(d.status as DossierStatus) &&
      now - new Date(d.last_status_change_at).getTime() > 48 * 3600 * 1000,
  );

  const totalActifs = dossiers.filter(
    (d) => d.status !== "livre_facture" && d.status !== "refuse",
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tableau de bord</h1>
        <p className="text-sm text-muted-foreground">Vue d'ensemble de l'activité du magasin</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<FolderKanban className="h-5 w-5" />} label="Dossiers actifs" value={totalActifs} />
        <StatCard icon={<Clock className="h-5 w-5" />} label="En attente mutuelle" value={counts.en_attente} />
        <StatCard
          icon={<AlertTriangle className="h-5 w-5" />}
          label="En retard (>48h)"
          value={stale.length}
          tone={stale.length > 0 ? "warning" : "default"}
        />
        <StatCard icon={<TrendingUp className="h-5 w-5" />} label="Total" value={dossiers.length} />
      </div>

      <section className="rounded-xl border bg-card p-5">
        <h2 className="mb-4 text-base font-semibold">Répartition par statut</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {DOSSIER_STATUSES.map((s) => (
            <Link
              key={s}
              to="/dossiers"
              search={{ status: s }}
              className="flex items-center justify-between rounded-lg border bg-background px-3 py-3 transition-colors hover:bg-accent"
            >
              <StatusBadge status={s} />
              <span className="text-lg font-semibold tabular-nums">{counts[s]}</span>
            </Link>
          ))}
        </div>
      </section>

      {stale.length > 0 && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <div className="mb-3 flex items-center gap-2 text-amber-900">
            <AlertTriangle className="h-5 w-5" />
            <h2 className="font-semibold">Dossiers en attente depuis plus de 48h</h2>
          </div>
          <ul className="divide-y divide-amber-200">
            {stale.map((d) => (
              <li key={d.id} className="py-2">
                <Link
                  to="/dossiers/$id"
                  params={{ id: d.id }}
                  className="flex items-center justify-between text-sm hover:underline"
                >
                  <span className="font-medium">
                    {d.client_nom.toUpperCase()} {d.client_prenom}
                  </span>
                  <span className="text-muted-foreground">
                    {d.mutuelle} · {hoursAgo(d.last_status_change_at)}h
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {isLoading && <p className="text-sm text-muted-foreground">Chargement...</p>}
    </div>
  );
}

function StatCard({
  icon, label, value, tone = "default",
}: { icon: React.ReactNode; label: string; value: number; tone?: "default" | "warning" }) {
  return (
    <div
      className={`rounded-xl border p-5 ${
        tone === "warning" && value > 0
          ? "border-amber-300 bg-amber-50"
          : "bg-card"
      }`}
    >
      <div className="mb-2 flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <div className="text-3xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function hoursAgo(date: string) {
  return Math.floor((Date.now() - new Date(date).getTime()) / 3600000);
}
