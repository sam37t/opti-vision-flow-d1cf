import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  CalendarClock,
  FilePlus2,
  ArrowRightLeft,
  Banknote,
  MessageSquarePlus,
  ChevronLeft,
  ChevronRight,
  User,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { STATUS_LABELS, type DossierStatus } from "@/lib/dossier-status";
import { StatusBadge } from "@/components/StatusBadge";

export const Route = createFileRoute("/_authenticated/recap")({
  head: () => ({ meta: [{ title: "Récapitulatif du jour — Optique Suivi" }] }),
  component: RecapJour,
});

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function dayRange(dateStr: string) {
  const start = new Date(dateStr + "T00:00:00").toISOString();
  const end = new Date(dateStr + "T23:59:59.999").toISOString();
  return { start, end };
}

function RecapJour() {
  const { user } = useAuth();
  const [date, setDate] = useState(toISODate(new Date()));
  const [onlyMe, setOnlyMe] = useState(false);

  const { start, end } = useMemo(() => dayRange(date), [date]);

  // Noms des collaborateurs (léger : 1 requête mise en cache)
  const { data: profiles = [] } = useQuery({
    queryKey: ["recap-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30 * 60 * 1000,
  });
  const nameOf = useMemo(() => {
    const map = new Map(profiles.map((p) => [p.id, p.full_name]));
    return (id: string | null | undefined) => (id ? map.get(id) ?? "sys" : "sys");
  }, [profiles]);

  // --- Queries ---
  // 1. Dossiers créés ce jour
  const { data: createdDossiers = [] } = useQuery({
    queryKey: ["recap-created", date, onlyMe, user?.id],
    queryFn: async () => {
      let q = supabase
        .from("dossiers")
        .select("id, client_nom, client_prenom, mutuelle, status, type_dossier, created_at, montant_devis, created_by")
        .gte("created_at", start)
        .lte("created_at", end)
        .order("created_at", { ascending: false });
      if (onlyMe && user) q = q.eq("created_by", user.id);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  // 2. Changements de statut (dossier_history)
  const { data: historyChanges = [] } = useQuery({
    queryKey: ["recap-history", date, onlyMe, user?.id],
    queryFn: async () => {
      let q = supabase
        .from("dossier_history")
        .select("id, dossier_id, old_status, new_status, changed_at, changed_by, dossier:dossiers!dossier_history_dossier_id_fkey(client_nom, client_prenom, mutuelle, type_dossier)")
        .gte("changed_at", start)
        .lte("changed_at", end)
        .order("changed_at", { ascending: false });
      if (onlyMe && user) q = q.eq("changed_by", user.id);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  // 3. Paiements enregistrés
  const { data: payments = [] } = useQuery({
    queryKey: ["recap-payments", date, onlyMe, user?.id],
    queryFn: async () => {
      let q = supabase
        .from("dossier_paiements")
        .select("id, dossier_id, part, montant, methode, date_paiement, note, created_at, created_by, dossier:dossiers!dossier_paiements_dossier_id_fkey(client_nom, client_prenom, mutuelle)")
        .gte("created_at", start)
        .lte("created_at", end)
        .order("created_at", { ascending: false });
      if (onlyMe && user) q = q.eq("created_by", user.id);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  // 4. Notes ajoutées
  const { data: notes = [] } = useQuery({
    queryKey: ["recap-notes", date, onlyMe, user?.id],
    queryFn: async () => {
      let q = supabase
        .from("dossier_notes")
        .select("id, dossier_id, content, created_at, author_id, dossier:dossiers!dossier_notes_dossier_id_fkey(client_nom, client_prenom)")
        .gte("created_at", start)
        .lte("created_at", end)
        .order("created_at", { ascending: false });
      if (onlyMe && user) q = q.eq("author_id", user.id);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  // --- Derived ---
  const totalPaiements = payments.reduce((s, p) => s + (Number(p.montant) || 0), 0);
  const totalCreatedDevis = createdDossiers.reduce((s, d) => s + (Number(d.montant_devis) || 0), 0);

  const fmt = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

  const shiftDate = (days: number) => {
    const d = new Date(date + "T12:00:00");
    d.setDate(d.getDate() + days);
    setDate(toISODate(d));
  };

  const isToday = date === toISODate(new Date());
  const dateLabel = new Date(date + "T12:00:00").toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const hasAnyActivity =
    createdDossiers.length > 0 || historyChanges.length > 0 || payments.length > 0 || notes.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Récapitulatif du jour</h1>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarClock className="h-4 w-4" />
            {dateLabel}
          </p>
        </div>

        {/* Date navigation */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => shiftDate(-1)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border bg-background hover:bg-accent"
            title="Jour précédent"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <input
            type="date"
            value={date}
            max={toISODate(new Date())}
            onChange={(e) => setDate(e.target.value)}
            className="h-9 rounded-md border bg-background px-2 text-sm"
          />
          <button
            type="button"
            onClick={() => shiftDate(1)}
            disabled={isToday}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border bg-background hover:bg-accent disabled:opacity-40"
            title="Jour suivant"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          {!isToday && (
            <button
              type="button"
              onClick={() => setDate(toISODate(new Date()))}
              className="ml-1 rounded-md border bg-background px-3 py-1.5 text-xs hover:bg-accent"
            >
              Aujourd'hui
            </button>
          )}
        </div>
      </div>

      {/* Filter toggle */}
      <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={onlyMe}
          onChange={(e) => setOnlyMe(e.target.checked)}
          className="h-4 w-4 rounded border"
        />
        <User className="h-4 w-4 text-muted-foreground" />
        Mes actions uniquement
      </label>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={<FilePlus2 className="h-5 w-5" />}
          label="Dossiers créés"
          count={createdDossiers.length}
          sub={totalCreatedDevis > 0 ? fmt(totalCreatedDevis) + " de devis" : undefined}
          color="text-blue-600"
        />
        <SummaryCard
          icon={<ArrowRightLeft className="h-5 w-5" />}
          label="Statuts modifiés"
          count={historyChanges.length}
          color="text-violet-600"
        />
        <SummaryCard
          icon={<Banknote className="h-5 w-5" />}
          label="Paiements enregistrés"
          count={payments.length}
          sub={totalPaiements > 0 ? fmt(totalPaiements) : undefined}
          color="text-green-600"
        />
        <SummaryCard
          icon={<MessageSquarePlus className="h-5 w-5" />}
          label="Notes ajoutées"
          count={notes.length}
          color="text-amber-600"
        />
      </div>

      {/* Empty state */}
      {!hasAnyActivity && (
        <div className="rounded-xl border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Aucune activité enregistrée {onlyMe ? "de votre part " : ""}le {dateLabel}.
          </p>
        </div>
      )}

      {/* Dossiers créés */}
      {createdDossiers.length > 0 && (
        <RecapSection title="Dossiers créés" icon={<FilePlus2 className="h-4 w-4" />} count={createdDossiers.length}>
          <ul className="divide-y">
            {createdDossiers.map((d) => (
              <li key={d.id} className="py-2">
                <Link to="/dossiers/$id" params={{ id: d.id }} className="flex items-center justify-between gap-3 text-sm hover:underline">
                  <span className="flex items-center gap-1.5 font-medium">
                    {(d.client_nom || "").toUpperCase()} {d.client_prenom}
                    {d.type_dossier === "lentilles" && <LensBadge />}
                    <Who name={nameOf((d as any).created_by)} />
                  </span>
                  <span className="flex items-center gap-3 text-muted-foreground">
                    <span className="hidden sm:inline truncate max-w-[12rem]">{d.mutuelle || "—"}</span>
                    {Number(d.montant_devis) > 0 && <span className="tabular-nums">{fmt(Number(d.montant_devis))}</span>}
                    <StatusBadge status={d.status as DossierStatus} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </RecapSection>
      )}

      {/* Changements de statut */}
      {historyChanges.length > 0 && (
        <RecapSection title="Changements de statut" icon={<ArrowRightLeft className="h-4 w-4" />} count={historyChanges.length}>
          <ul className="divide-y">
            {historyChanges.map((h) => {
              const dossier = h.dossier as any;
              return (
                <li key={h.id} className="py-2">
                  <Link to="/dossiers/$id" params={{ id: h.dossier_id }} className="flex items-center justify-between gap-3 text-sm hover:underline">
                    <span className="flex items-center gap-1.5 font-medium">
                      {dossier ? (
                        <>
                          {(dossier.client_nom || "").toUpperCase()} {dossier.client_prenom}
                          {dossier.type_dossier === "lentilles" && <LensBadge />}
                        </>
                      ) : (
                        <span className="text-muted-foreground">Dossier supprimé</span>
                      )}
                      <Who name={nameOf(h.changed_by)} />
                    </span>
                    <span className="flex items-center gap-2">
                      {h.old_status && (
                        <>
                          <StatusBadge status={h.old_status as DossierStatus} />
                          <span className="text-muted-foreground">→</span>
                        </>
                      )}
                      <StatusBadge status={h.new_status as DossierStatus} />
                      <span className="ml-1 hidden text-xs text-muted-foreground sm:inline">
                        {new Date(h.changed_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </RecapSection>
      )}

      {/* Paiements enregistrés */}
      {payments.length > 0 && (
        <RecapSection title="Paiements enregistrés" icon={<Banknote className="h-4 w-4" />} count={payments.length}>
          <ul className="divide-y">
            {payments.map((p) => {
              const dossier = p.dossier as any;
              const partLabel = p.part === "mutuelle" ? "Mutuelle" : p.part === "client" ? "Client" : p.part;
              return (
                <li key={p.id} className="py-2">
                  <Link to="/dossiers/$id" params={{ id: p.dossier_id }} className="flex items-center justify-between gap-3 text-sm hover:underline">
                    <span className="flex items-center gap-1.5 font-medium">
                      {dossier ? (
                        <>
                          {(dossier.client_nom || "").toUpperCase()} {dossier.client_prenom}
                        </>
                      ) : (
                        <span className="text-muted-foreground">Dossier supprimé</span>
                      )}
                      <Who name={nameOf((p as any).created_by)} />
                    </span>
                    <span className="flex items-center gap-3 text-muted-foreground">
                      <span className="rounded-full border px-2 py-0.5 text-xs">{partLabel}</span>
                      <span className="hidden sm:inline text-xs">{p.methode}</span>
                      {p.note && <span className="hidden text-xs italic lg:inline">{p.note}</span>}
                      <span className="font-semibold tabular-nums text-foreground">{fmt(Number(p.montant))}</span>
                      <span className="hidden text-xs sm:inline">
                        {new Date(p.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 flex items-center justify-between border-t pt-2 text-sm font-semibold">
            <span>Total encaissé</span>
            <span className="tabular-nums">{fmt(totalPaiements)}</span>
          </div>
        </RecapSection>
      )}

      {/* Notes ajoutées */}
      {notes.length > 0 && (
        <RecapSection title="Notes ajoutées" icon={<MessageSquarePlus className="h-4 w-4" />} count={notes.length}>
          <ul className="divide-y">
            {notes.map((n) => {
              const dossier = n.dossier as any;
              return (
                <li key={n.id} className="py-2">
                  <Link to="/dossiers/$id" params={{ id: n.dossier_id }} className="block text-sm hover:underline">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium">
                        {dossier ? `${(dossier.client_nom || "").toUpperCase()} ${dossier.client_prenom}` : "Dossier supprimé"}
                      </span>
                      <span className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Who name={nameOf((n as any).author_id)} />
                        {new Date(n.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-muted-foreground">{n.content}</p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </RecapSection>
      )}
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  count,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="mb-2 flex items-center gap-2 text-muted-foreground">
        <span className={color}>{icon}</span>
        <span className="text-sm">{label}</span>
      </div>
      <div className="text-2xl font-semibold tabular-nums">{count}</div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function RecapSection({
  title,
  icon,
  count,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <h2 className="text-base font-semibold">{title}</h2>
        <span className="inline-flex min-w-6 items-center justify-center rounded-full border px-2 py-0.5 text-xs font-bold tabular-nums text-muted-foreground">
          {count}
        </span>
      </div>
      {children}
    </section>
  );
}

function Who({ name }: { name: string }) {
  if (!name || name === "—") return null;
  return <span className="text-xs font-normal text-muted-foreground">· {name}</span>;
}

function LensBadge() {
  return (
    <span
      className="inline-flex items-center rounded-full border border-red-300 bg-red-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-600"
      title="Dossier lentilles"
    >
      LENT
    </span>
  );
}
