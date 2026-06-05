import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { LayoutGrid, List, Search } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { DOSSIER_STATUSES, STATUS_LABELS, type DossierStatus } from "@/lib/dossier-status";

const searchSchema = z.object({
  status: z.string().optional(),
  mutuelle: z.string().optional(),
  from: z.string().optional(),
  q: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/dossiers/")({
  head: () => ({ meta: [{ title: "Dossiers — Optique Suivi" }] }),
  validateSearch: (s) => searchSchema.parse(s),
  component: DossiersPage,
});

function DossiersPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [view, setView] = useState<"list" | "kanban">("list");

  const { data: dossiers = [], isLoading } = useQuery({
    queryKey: ["dossiers", search],
    queryFn: async () => {
      let q = supabase.from("dossiers").select("*").order("created_at", { ascending: false });
      if (search.status) q = q.eq("status", search.status as DossierStatus);
      if (search.mutuelle) q = q.ilike("mutuelle", `%${search.mutuelle}%`);
      if (search.from) q = q.gte("created_at", search.from);
      if (search.q) {
        q = q.or(
          `client_nom.ilike.%${search.q}%,client_prenom.ilike.%${search.q}%,telephone.ilike.%${search.q}%`,
        );
      }
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const mutuelles = useMemo(
    () => Array.from(new Set(dossiers.map((d) => d.mutuelle).filter(Boolean))),
    [dossiers],
  );

  const update = (key: string, value: string | undefined) =>
    navigate({ search: { ...search, [key]: value || undefined } });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dossiers</h1>
          <p className="text-sm text-muted-foreground">
            {dossiers.length} dossier{dossiers.length > 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-md border bg-card p-1">
          <Button
            variant={view === "list" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setView("list")}
            className="gap-1.5"
          >
            <List className="h-4 w-4" /> Liste
          </Button>
          <Button
            variant={view === "kanban" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setView("kanban")}
            className="gap-1.5"
          >
            <LayoutGrid className="h-4 w-4" /> Kanban
          </Button>
        </div>
      </div>

      <div className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Nom, prénom, téléphone..."
            className="pl-8"
            defaultValue={search.q ?? ""}
            onChange={(e) => update("q", e.target.value)}
          />
        </div>
        <Select value={search.status ?? "all"} onValueChange={(v) => update("status", v === "all" ? undefined : v)}>
          <SelectTrigger><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {DOSSIER_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={search.mutuelle ?? "all"} onValueChange={(v) => update("mutuelle", v === "all" ? undefined : v)}>
          <SelectTrigger><SelectValue placeholder="Mutuelle" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes mutuelles</SelectItem>
            {mutuelles.map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={search.from ?? ""}
          onChange={(e) => update("from", e.target.value)}
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement...</p>
      ) : view === "list" ? (
        <ListView dossiers={dossiers} />
      ) : (
        <KanbanView dossiers={dossiers} />
      )}
    </div>
  );
}

type Dossier = {
  id: string;
  client_nom: string;
  client_prenom: string;
  telephone: string;
  mutuelle: string;
  monture: string;
  status: DossierStatus;
  montant_devis: number;
  montant_pec: number | null;
  reste_a_charge: number | null;
  created_at: string;
  last_status_change_at: string;
};

function ListView({ dossiers }: { dossiers: Dossier[] }) {
  if (dossiers.length === 0)
    return <EmptyState />;
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-muted-foreground">
          <tr>
            <Th>Client</Th><Th>Mutuelle</Th><Th>Devis</Th><Th>Statut</Th><Th>Créé le</Th>
          </tr>
        </thead>
        <tbody>
          {dossiers.map((d) => {
            const stale =
              d.status === "en_attente" &&
              Date.now() - new Date(d.last_status_change_at).getTime() > 48 * 3600 * 1000;
            return (
              <tr key={d.id} className="border-t hover:bg-accent/50">
                <td className="px-4 py-3">
                  <Link to="/dossiers/$id" params={{ id: d.id }} className="font-medium hover:underline">
                    {d.client_nom.toUpperCase()} {d.client_prenom}
                  </Link>
                  <div className="text-xs text-muted-foreground">{d.telephone}</div>
                </td>
                <td className="px-4 py-3">{d.mutuelle || "—"}</td>
                <td className="px-4 py-3 tabular-nums">{Number(d.montant_devis).toFixed(2)} €</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={d.status} />
                    {stale && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                        &gt;48h
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(d.created_at).toLocaleDateString("fr-FR")}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function KanbanView({ dossiers }: { dossiers: Dossier[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {DOSSIER_STATUSES.map((s) => {
        const items = dossiers.filter((d) => d.status === s);
        return (
          <div key={s} className="rounded-xl border bg-card p-3">
            <div className="mb-3 flex items-center justify-between">
              <StatusBadge status={s} />
              <span className="text-xs font-medium text-muted-foreground">{items.length}</span>
            </div>
            <div className="space-y-2">
              {items.map((d) => (
                <Link
                  key={d.id}
                  to="/dossiers/$id"
                  params={{ id: d.id }}
                  className="block rounded-md border bg-background p-3 transition-colors hover:bg-accent"
                >
                  <div className="text-sm font-medium">
                    {d.client_nom.toUpperCase()} {d.client_prenom}
                  </div>
                  <div className="text-xs text-muted-foreground">{d.mutuelle || "—"}</div>
                  <div className="mt-1 text-xs tabular-nums">
                    {Number(d.montant_devis).toFixed(2)} €
                  </div>
                </Link>
              ))}
              {items.length === 0 && (
                <p className="px-1 py-3 text-xs text-muted-foreground">Aucun dossier</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide">{children}</th>;
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed bg-card p-10 text-center">
      <p className="text-sm text-muted-foreground">Aucun dossier trouvé pour ces critères.</p>
      <Link to="/dossiers/new">
        <Button className="mt-4">Créer un dossier</Button>
      </Link>
    </div>
  );
}
