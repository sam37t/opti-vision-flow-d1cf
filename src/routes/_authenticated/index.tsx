import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { AlertOctagon, AlertTriangle, Clock, FolderKanban, TrendingUp, Wallet, Receipt } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DOSSIER_STATUSES, STATUS_LABELS, TERMINAL_STATUSES, type DossierStatus } from "@/lib/dossier-status";
import { StatusBadge } from "@/components/StatusBadge";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({ meta: [{ title: "Tableau de bord — Optique Suivi" }] }),
  component: Dashboard,
});

function Dashboard() {
  const qc = useQueryClient();

  const { data: dossiers = [], isLoading } = useQuery({
    queryKey: ["dossiers-dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dossiers")
        .select("id, client_nom, client_prenom, mutuelle, status, montant_devis, montant_pec, reste_a_charge, probleme, last_status_change_at, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("dossiers-dashboard-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "dossiers" },
        () => qc.invalidateQueries({ queryKey: ["dossiers-dashboard"] }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  const counts = DOSSIER_STATUSES.reduce<Record<DossierStatus, number>>((acc, s) => {
    acc[s] = dossiers.filter((d) => d.status === s).length;
    return acc;
  }, {} as Record<DossierStatus, number>);

  const now = Date.now();
  const stale = dossiers.filter(
    (d) =>
      !TERMINAL_STATUSES.includes(d.status as DossierStatus) &&
      now - new Date(d.last_status_change_at).getTime() > 48 * 3600 * 1000,
  );

  const problemes = dossiers.filter((d) => d.probleme);

  const actifs = dossiers.filter(
    (d) => !TERMINAL_STATUSES.includes(d.status as DossierStatus),
  );

  const totalActifs = actifs.length;
  const totalDevis = actifs.reduce((s, d) => s + (Number(d.montant_devis) || 0), 0);
  const totalAccorde = actifs.reduce((s, d) => s + (Number(d.montant_pec) || 0), 0);
  const totalRAC = actifs.reduce((s, d) => s + (Number(d.reste_a_charge) || 0), 0);
  const fmt = (n: number) => `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tableau de bord</h1>
        <p className="text-sm text-muted-foreground">Vue d'ensemble de l'activité du magasin (dossiers en cours)</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<FolderKanban className="h-5 w-5" />} label="Dossiers actifs" valueText={String(totalActifs)} />
        <StatCard icon={<Receipt className="h-5 w-5" />} label="Total devis" valueText={fmt(totalDevis)} />
        <StatCard icon={<TrendingUp className="h-5 w-5" />} label="Total accordé (PEC)" valueText={fmt(totalAccorde)} />
        <StatCard icon={<Wallet className="h-5 w-5" />} label="Total reste à charge" valueText={fmt(totalRAC)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          icon={<AlertTriangle className="h-5 w-5" />}
          label="En retard (>48h)"
          valueText={String(stale.length)}
          tone={stale.length > 0 ? "warning" : "default"}
        />
        <StatCard
          icon={<AlertOctagon className="h-5 w-5" />}
          label="Problèmes signalés"
          valueText={String(problemes.length)}
          tone={problemes.length > 0 ? "danger" : "default"}
        />
      </div>


      <section className="rounded-xl border bg-card p-5">
        <h2 className="mb-4 text-base font-semibold">Répartition par statut</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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

      {problemes.length > 0 && (
        <section className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
          <div className="mb-3 flex items-center gap-2 text-destructive">
            <AlertOctagon className="h-5 w-5" />
            <h2 className="font-semibold">Dossiers signalés comme problématiques</h2>
          </div>
          <ul className="divide-y divide-destructive/20">
            {problemes.map((d) => (
              <li key={d.id} className="py-2">
                <Link to="/dossiers/$id" params={{ id: d.id }} className="flex items-center justify-between text-sm hover:underline">
                  <span className="font-medium">{d.client_nom.toUpperCase()} {d.client_prenom}</span>
                  <span className="text-muted-foreground">{d.mutuelle || "—"}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {stale.length > 0 && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <div className="mb-3 flex items-center gap-2 text-amber-900">
            <AlertTriangle className="h-5 w-5" />
            <h2 className="font-semibold">Dossiers sans changement depuis plus de 48h</h2>
          </div>
          <ul className="divide-y divide-amber-200">
            {stale.map((d) => (
              <li key={d.id} className="py-2">
                <Link to="/dossiers/$id" params={{ id: d.id }} className="flex items-center justify-between text-sm hover:underline">
                  <span className="font-medium">{d.client_nom.toUpperCase()} {d.client_prenom}</span>
                  <span className="text-muted-foreground">{d.mutuelle} · {hoursAgo(d.last_status_change_at)}h</span>
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
}: { icon: React.ReactNode; label: string; value: number; tone?: "default" | "warning" | "danger" }) {
  const toneClass =
    tone === "warning" && value > 0 ? "border-amber-300 bg-amber-50" :
    tone === "danger" && value > 0 ? "border-destructive/30 bg-destructive/5" :
    "bg-card";
  return (
    <div className={`rounded-xl border p-5 ${toneClass}`}>
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
