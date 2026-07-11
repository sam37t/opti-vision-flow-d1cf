import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { AlertOctagon, AlertTriangle, FolderKanban, TrendingUp, Wallet, Receipt, BadgeEuro, Search, X, Files, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DOSSIER_STATUSES, STATUS_LABELS, type DossierStatus } from "@/lib/dossier-status";
import { StatusBadge } from "@/components/StatusBadge";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({ meta: [{ title: "Tableau de bord — Optique Suivi" }] }),
  component: Dashboard,
});

type DateField = "created_at" | "facture_cosium_at";

function Dashboard() {
  const qc = useQueryClient();

  const { data: dossiers = [], isLoading } = useQuery({
    queryKey: ["dossiers-dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dossiers")
        .select("id, client_nom, client_prenom, mutuelle, status, montant_devis, montant_pec, reste_a_charge, probleme, last_status_change_at, created_at, facture_cosium_at, type_dossier")
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

  const ACTIFS_STATUSES: DossierStatus[] = [
    "a_traiter",
    "devis_envoye",
    "en_attente",
    "cotation_recue",
    "accord_recu",
  ];

  const now = Date.now();
  const stale = dossiers.filter(
    (d) =>
      ACTIFS_STATUSES.includes(d.status as DossierStatus) &&
      now - new Date(d.last_status_change_at).getTime() > 48 * 3600 * 1000,
  );


  const problemes = dossiers.filter((d) => d.probleme);

  const actifs = dossiers.filter(
    (d) => ACTIFS_STATUSES.includes(d.status as DossierStatus),
  );

  const totalActifs = actifs.length;
  const totalDossiersAll = dossiers.length;
  const actifsAvecDevis = actifs.filter((d) => Number(d.montant_devis) > 0);
  const sansMontant = actifs.length - actifsAvecDevis.length;
  const totalDevis = actifsAvecDevis.reduce((s, d) => s + Number(d.montant_devis), 0);
  const totalDevisAll = dossiers.reduce((s, d) => s + (Number(d.montant_devis) || 0), 0);
  const totalAccorde = actifs.reduce((s, d) => s + (Number(d.montant_pec) || 0), 0);
  const totalRAC = actifs.reduce((s, d) => s + (Number(d.reste_a_charge) || 0), 0);
  const totalEncaisse = dossiers
    .filter((d) => d.status === "regle")
    .reduce((s, d) => s + (Number(d.montant_pec) || 0), 0);
  const fmt = (n: number) => `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

  // ---- Filtres / recherche ----
  const [query, setQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<DossierStatus | "">("");
  const [filterMutuelle, setFilterMutuelle] = useState("");
  const [dateField, setDateField] = useState<DateField>("created_at");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const mutuelles = useMemo(() => {
    const set = new Set<string>();
    dossiers.forEach((d) => { if (d.mutuelle) set.add(d.mutuelle); });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "fr"));
  }, [dossiers]);

  const hasFilters = Boolean(query || filterStatus || filterMutuelle || dateFrom || dateTo);
  const filtered = useMemo(() => {
    if (!hasFilters) return [];
    const q = query.trim().toLowerCase();
    const from = dateFrom ? new Date(dateFrom).getTime() : null;
    const to = dateTo ? new Date(dateTo).getTime() + 24 * 3600 * 1000 - 1 : null;
    return dossiers.filter((d) => {
      if (filterStatus && d.status !== filterStatus) return false;
      if (filterMutuelle && d.mutuelle !== filterMutuelle) return false;
      if (q) {
        const name = `${d.client_nom ?? ""} ${d.client_prenom ?? ""}`.toLowerCase();
        if (!name.includes(q)) return false;
      }
      if (from !== null || to !== null) {
        const raw = (d as Record<string, unknown>)[dateField] as string | null | undefined;
        if (!raw) return false;
        const t = new Date(raw).getTime();
        if (from !== null && t < from) return false;
        if (to !== null && t > to) return false;
      }
      return true;
    });
  }, [dossiers, query, filterStatus, filterMutuelle, dateField, dateFrom, dateTo, hasFilters]);

  const resetFilters = () => {
    setQuery(""); setFilterStatus(""); setFilterMutuelle("");
    setDateField("created_at"); setDateFrom(""); setDateTo("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tableau de bord</h1>
        <p className="text-sm text-muted-foreground">Vue d'ensemble de l'activité du magasin (dossiers en cours)</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<FolderKanban className="h-5 w-5" />} label="Dossiers actifs" valueText={String(totalActifs)} />
        <StatCard icon={<Files className="h-5 w-5" />} label="Total dossiers" valueText={String(totalDossiersAll)} />
        <StatCard icon={<Receipt className="h-5 w-5" />} label="Total facturé" valueText={fmt(totalDevis)} hint={sansMontant > 0 ? `${sansMontant} dossier${sansMontant > 1 ? "s" : ""} sans montant exclu${sansMontant > 1 ? "s" : ""}` : undefined} />
        <StatCard icon={<FileText className="h-5 w-5" />} label="Total devis (tous dossiers)" valueText={fmt(totalDevisAll)} />
        <StatCard icon={<TrendingUp className="h-5 w-5" />} label="Total accordé (PEC)" valueText={fmt(totalAccorde)} />
        <StatCard icon={<Wallet className="h-5 w-5" />} label="Total reste à charge" valueText={fmt(totalRAC)} />
        <StatCard icon={<BadgeEuro className="h-5 w-5" />} label="Total encaissé (réglé)" valueText={fmt(totalEncaisse)} />
      </div>

      <section className="rounded-xl border bg-card p-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Search className="h-4 w-4" /> Rechercher un dossier
          </h2>
          {hasFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 rounded-md border bg-background px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent"
            >
              <X className="h-3 w-3" /> Réinitialiser
            </button>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-muted-foreground">Nom du client</span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nom ou prénom"
              className="h-9 rounded-md border bg-background px-2 text-sm"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs">
            <span className="text-muted-foreground">Statut</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as DossierStatus | "")}
              className="h-9 rounded-md border bg-background px-2 text-sm"
            >
              <option value="">Tous</option>
              {DOSSIER_STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs">
            <span className="text-muted-foreground">Mutuelle</span>
            <select
              value={filterMutuelle}
              onChange={(e) => setFilterMutuelle(e.target.value)}
              className="h-9 rounded-md border bg-background px-2 text-sm"
            >
              <option value="">Toutes</option>
              {mutuelles.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs">
            <span className="text-muted-foreground">Période sur</span>
            <select
              value={dateField}
              onChange={(e) => setDateField(e.target.value as DateField)}
              className="h-9 rounded-md border bg-background px-2 text-sm"
            >
              <option value="created_at">Date de création</option>
              <option value="facture_cosium_at">Date de facturation</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs">
            <span className="text-muted-foreground">Du</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-9 rounded-md border bg-background px-2 text-sm"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs">
            <span className="text-muted-foreground">Au</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-9 rounded-md border bg-background px-2 text-sm"
            />
          </label>
        </div>

        {hasFilters && (
          <div className="mt-4">
            <div className="mb-2 text-xs text-muted-foreground">
              {filtered.length} résultat{filtered.length > 1 ? "s" : ""}
            </div>
            {filtered.length > 0 ? (
              <ul className="divide-y rounded-lg border">
                {filtered.slice(0, 50).map((d) => (
                  <li key={d.id}>
                    <Link
                      to="/dossiers/$id"
                      params={{ id: d.id }}
                      className="flex items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-accent"
                    >
                      <span className="font-medium truncate">
                        {(d.client_nom || "").toUpperCase()} {d.client_prenom}
                      </span>
                      <span className="flex items-center gap-3 text-muted-foreground">
                        <span className="hidden sm:inline truncate max-w-[14rem]">{d.mutuelle || "—"}</span>
                        <StatusBadge status={d.status as DossierStatus} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-lg border bg-background px-3 py-4 text-sm text-muted-foreground">
                Aucun dossier ne correspond aux filtres.
              </p>
            )}
            {filtered.length > 50 && (
              <p className="mt-2 text-xs text-muted-foreground">
                Affichage des 50 premiers résultats sur {filtered.length}.
              </p>
            )}
          </div>
        )}
      </section>

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
          <Link
            to="/dossiers"
            className="flex items-center justify-between rounded-lg border bg-primary/10 px-3 py-3 transition-colors hover:bg-primary/20"
          >
            <span className="inline-flex items-center rounded-full border border-primary/30 bg-background px-2.5 py-0.5 text-xs font-medium text-primary">
              Total dossiers actifs
            </span>
            <span className="text-lg font-semibold tabular-nums">{totalActifs}</span>
          </Link>
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
  icon, label, valueText, tone = "default", hint,
}: { icon: React.ReactNode; label: string; valueText: string; tone?: "default" | "warning" | "danger"; hint?: string }) {
  const hasValue = valueText !== "0" && valueText !== "0,00 €";
  const toneClass =
    tone === "warning" && hasValue ? "border-amber-300 bg-amber-50" :
    tone === "danger" && hasValue ? "border-destructive/30 bg-destructive/5" :
    "bg-card";
  return (
    <div className={`rounded-xl border p-5 ${toneClass}`}>
      <div className="mb-2 flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <div className="text-2xl font-semibold tabular-nums">{valueText}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

function hoursAgo(date: string) {
  return Math.floor((Date.now() - new Date(date).getTime()) / 3600000);
}
