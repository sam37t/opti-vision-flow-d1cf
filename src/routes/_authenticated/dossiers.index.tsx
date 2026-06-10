import { createFileRoute, Link } from "@tanstack/react-router";
import { daysSinceDevisSansRetour, daysSinceTransmisNonRegle } from "@/lib/dossier-alerts";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { AlertOctagon, CheckCircle2, Clock, LayoutGrid, List, Receipt, Search, Send, X } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { SELECTABLE_STATUSES, STATUS_LABELS, TERMINAL_STATUSES, type DossierStatus } from "@/lib/dossier-status";

const searchSchema = z.object({
  status: z.string().optional(),
  mutuelle: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  q: z.string().optional(),
  probleme: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/dossiers/")({
  head: () => ({ meta: [{ title: "Dossiers — Optique Suivi" }] }),
  validateSearch: (s) => searchSchema.parse(s),
  component: DossiersPage,
});

function parisDayBounds(date: string, end: boolean): string {
  const [y, m, d] = date.split("-").map(Number);
  const isDST = (() => {
    const jan = new Date(y, 0, 1).getTimezoneOffset();
    const jul = new Date(y, 6, 1).getTimezoneOffset();
    const cur = new Date(y, m - 1, d).getTimezoneOffset();
    return cur < Math.max(jan, jul);
  })();
  const offset = isDST ? "+02:00" : "+01:00";
  return new Date(`${date}T${end ? "23:59:59.999" : "00:00:00.000"}${offset}`).toISOString();
}

type Dossier = {
  id: string;
  client_nom: string;
  client_prenom: string;
  telephone: string;
  mutuelle: string;
  status: DossierStatus;
  montant_devis: number;
  montant_pec: number | null;
  reste_a_charge: number | null;
  remboursement_attendu: number | null;
  probleme: boolean;
  facture_cosium: boolean;
  transmis_mutuelle: boolean;
  paiement_recu: boolean;
  pec_demande_at: string | null;
  transmis_mutuelle_at: string | null;
  facture_cosium_at: string | null;
  created_at: string;
  updated_at: string;
  last_status_change_at: string;
};

function isRecentlyUpdated(d: Dossier): boolean {
  if (!d.updated_at) return false;
  const updated = new Date(d.updated_at).getTime();
  const created = new Date(d.created_at).getTime();
  // Évite d'afficher le badge sur les dossiers tout juste créés (création ≈ update)
  if (Math.abs(updated - created) < 60 * 1000) return false;
  return Date.now() - updated < 24 * 3600 * 1000;
}

function RecentBadge({ d, compact }: { d: Dossier; compact?: boolean }) {
  if (!isRecentlyUpdated(d)) return null;
  const cls = compact ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-0.5";
  const size = compact ? "h-3 w-3" : "h-3.5 w-3.5";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-amber-50 font-medium text-amber-700 border border-amber-200 ${cls}`}
      title={`Modifié le ${new Date(d.updated_at).toLocaleString("fr-FR")}`}
    >
      <Clock className={size} /> Modifié récemment
    </span>
  );
}

function alertFactureNonTransmise(d: Dossier): boolean {
  // Facturé mais pas encore transmis à la mutuelle
  return d.status === "facture";
}

function AlertBadges({ d, compact }: { d: Dossier; compact?: boolean }) {
  const a1 = alertFactureNonTransmise(d);
  const daysSansRetour = daysSinceDevisSansRetour(d);
  const daysNonRegle = daysSinceTransmisNonRegle(d);
  if (!a1 && daysSansRetour == null && daysNonRegle == null) return null;
  const cls = compact ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-0.5";
  const size = compact ? "h-3 w-3" : "h-3.5 w-3.5";
  return (
    <div className="flex flex-wrap items-center gap-1">
      {a1 && (
        <span className={`inline-flex items-center gap-1 rounded-full bg-red-600 font-medium text-white ${cls}`} title="Facturé sur Cosium mais non transmis à la mutuelle">
          <AlertOctagon className={size} /> À transmettre
        </span>
      )}
      {daysSansRetour != null && (
        <span className={`inline-flex items-center gap-1 rounded-full bg-red-600 font-medium text-white ${cls}`} title={`Devis envoyé sans retour depuis ${daysSansRetour} jours`}>
          <AlertOctagon className={size} /> {daysSansRetour}j sans retour
        </span>
      )}
      {daysNonRegle != null && (
        <span className={`inline-flex items-center gap-1 rounded-full bg-red-600 font-medium text-white ${cls}`} title={`Transmis à la mutuelle depuis ${daysNonRegle} jours sans règlement`}>
          <AlertOctagon className={size} /> {daysNonRegle}j non réglé
        </span>
      )}
    </div>
  );
}

const STATUS_RANK: Partial<Record<DossierStatus, number>> = {
  refuse: 10,
  a_traiter: 20,
  devis_envoye: 30,
  en_attente: 40,
  cotation_recue: 50,
  a_modifier: 55,
  accord_recu: 60,
  verres_commandes: 70,
  facture: 80,
  transmis_mutuelle: 90,
  sans_suite_client: 100,
  livre_facture: 105,
  regle: 110,
  pas_de_tp: 110,
};

function dossierRank(d: Dossier): number {
  // Problème — prioritaire sur tout le reste
  if (d.probleme) return 0;
  return STATUS_RANK[d.status] ?? 999;
}

function BillingBadges(_props: { d: Dossier; compact?: boolean }) {
  // Le statut affiche déjà l'état (Facturé / Transmis / Réglé) — on évite le doublon.
  return null;
}


function DossiersPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const qc = useQueryClient();
  const [view, setView] = useState<"list" | "kanban">("list");

  useEffect(() => {
    const channel = supabase
      .channel("dossiers-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "dossiers" },
        () => qc.invalidateQueries({ queryKey: ["dossiers"] }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);


  const { data: dossiers = [], isLoading } = useQuery({
    queryKey: ["dossiers", search],
    queryFn: async () => {
      let q = supabase.from("dossiers").select("*").order("created_at", { ascending: false });
      if (search.status) q = q.eq("status", search.status as DossierStatus);
      if (search.mutuelle) q = q.eq("mutuelle", search.mutuelle);
      if (search.probleme === "1") q = q.eq("probleme", true);
      if (search.from) q = q.gte("created_at", parisDayBounds(search.from, false));
      if (search.to) q = q.lte("created_at", parisDayBounds(search.to, true));
      if (search.q) {
        q = q.or(
          `client_nom.ilike.%${search.q}%,client_prenom.ilike.%${search.q}%,telephone.ilike.%${search.q}%`,
        );
      }
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as Dossier[];
    },
  });

  const sortedDossiers = useMemo(() => {
    return [...dossiers].sort((a, b) => {
      const ra = dossierRank(a);
      const rb = dossierRank(b);
      if (ra !== rb) return ra - rb;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [dossiers]);

  const { data: mutuelles = [] } = useQuery({
    queryKey: ["mutuelles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("mutuelles").select("name").order("name");
      if (error) throw error;
      return data.map((m) => m.name);
    },
  });

  const update = (key: string, value: string | undefined) =>
    navigate({ search: { ...search, [key]: value || undefined } });

  const clearFilters = () => navigate({ search: {} });

  const hasFilters = !!(search.status || search.mutuelle || search.from || search.to || search.q || search.probleme);

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
          <Button variant={view === "list" ? "secondary" : "ghost"} size="sm" onClick={() => setView("list")} className="gap-1.5">
            <List className="h-4 w-4" /> Liste
          </Button>
          <Button variant={view === "kanban" ? "secondary" : "ghost"} size="sm" onClick={() => setView("kanban")} className="gap-1.5">
            <LayoutGrid className="h-4 w-4" /> Kanban
          </Button>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative lg:col-span-2">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Nom, prénom, téléphone..."
              className="pl-8"
              value={search.q ?? ""}
              onChange={(e) => update("q", e.target.value)}
            />
          </div>
          <Select value={search.status ?? "all"} onValueChange={(v) => update("status", v === "all" ? undefined : v)}>
            <SelectTrigger><SelectValue placeholder="Statut" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              {SELECTABLE_STATUSES.map((s) => (
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
          <div className="flex items-center gap-2">
            <Button
              variant={search.probleme === "1" ? "destructive" : "outline"}
              size="sm"
              onClick={() => update("probleme", search.probleme === "1" ? undefined : "1")}
              className="gap-1"
            >
              <AlertOctagon className="h-4 w-4" /> Problèmes
            </Button>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
                <X className="h-4 w-4" /> Effacer
              </Button>
            )}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1 lg:col-span-2">
            <label className="text-xs text-muted-foreground">Du</label>
            <Input type="date" value={search.from ?? ""} onChange={(e) => update("from", e.target.value)} />
          </div>
          <div className="space-y-1 lg:col-span-2">
            <label className="text-xs text-muted-foreground">Au</label>
            <Input type="date" value={search.to ?? ""} onChange={(e) => update("to", e.target.value)} />
          </div>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement...</p>
      ) : view === "list" ? (
        <ListView dossiers={sortedDossiers} />
      ) : (
        <KanbanView dossiers={dossiers} />
      )}

    </div>
  );
}

function ListView({ dossiers }: { dossiers: Dossier[] }) {
  if (dossiers.length === 0) return <EmptyState />;
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-muted-foreground">
          <tr>
            <Th>Client</Th><Th>Mutuelle</Th><Th>Devis</Th><Th>Accordé</Th><Th>Reste à charge</Th><Th>Statut</Th><Th>Créé le</Th>
          </tr>
        </thead>
        <tbody>
          {dossiers.map((d) => {
            const stale =
              !TERMINAL_STATUSES.includes(d.status) &&
              Date.now() - new Date(d.last_status_change_at).getTime() > 48 * 3600 * 1000;
            return (
              <tr key={d.id} className={`border-t hover:bg-accent/50 ${d.probleme ? "bg-destructive/5" : ""}`}>
                <td className="px-4 py-3">
                  <Link to="/dossiers/$id" params={{ id: d.id }} className="flex items-center gap-2 font-medium hover:underline">
                    {d.probleme && <AlertOctagon className="h-4 w-4 text-destructive" />}
                    <span>{d.client_nom.toUpperCase()} {d.client_prenom}</span>
                  </Link>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{d.telephone}</span>
                    <StatusBadge status={d.status} className="text-[10px] px-1.5 py-0" />
                    <BillingBadges d={d} compact />
                    <AlertBadges d={d} compact />
                    <RecentBadge d={d} compact />
                  </div>
                </td>
                <td className="px-4 py-3">{d.mutuelle || "—"}</td>
                <td className="px-4 py-3 tabular-nums">{Number(d.montant_devis ?? 0).toFixed(2)} €</td>
                <td className="px-4 py-3 tabular-nums">
                  {d.montant_pec != null ? `${Number(d.montant_pec).toFixed(2)} €` : "—"}
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {d.reste_a_charge != null ? `${Number(d.reste_a_charge).toFixed(2)} €` : "—"}
                </td>
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
      {SELECTABLE_STATUSES.map((s) => {
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
                  className={`block rounded-md border p-3 transition-colors hover:bg-accent ${
                    d.probleme ? "border-destructive/40 bg-destructive/5" : "bg-background"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    {d.probleme && <AlertOctagon className="h-3.5 w-3.5 text-destructive" />}
                    {d.client_nom.toUpperCase()} {d.client_prenom}
                  </div>
                  <div className="text-xs text-muted-foreground">{d.mutuelle || "—"}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-1"><StatusBadge status={d.status} className="text-[10px] px-1.5 py-0" /><BillingBadges d={d} compact /><AlertBadges d={d} compact /><RecentBadge d={d} compact /></div>
                  <div className="mt-1 space-y-0.5 text-xs tabular-nums">
                    <div>Devis : <span className="font-medium">{Number(d.montant_devis ?? 0).toFixed(2)} €</span></div>
                    {d.montant_pec != null && <div>Accordé : <span className="font-medium">{Number(d.montant_pec).toFixed(2)} €</span></div>}
                    {d.reste_a_charge != null && <div>Reste à charge : <span className="font-medium">{Number(d.reste_a_charge).toFixed(2)} €</span></div>}
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
