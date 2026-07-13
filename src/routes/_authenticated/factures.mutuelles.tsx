import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Building2, ChevronDown, ChevronRight, Search } from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/factures/mutuelles")({
  head: () => ({
    meta: [
      { title: "Répartition par mutuelle — Optique Suivi" },
      { name: "description", content: "Répartition par mutuelle des paiements facturés en attente d'encaissement." },
    ],
  }),
  component: FacturesMutuellesPage,
});

type Row = {
  id: string;
  client_nom: string;
  client_prenom: string;
  mutuelle: string | null;
  montant_pec: number | null;
  transmis_mutuelle: boolean;
  transmis_mutuelle_at: string | null;
  facture_cosium: boolean;
  facture_cosium_at: string | null;
  paiement_mutuelle_recu: boolean | null;
  paiement_recu: boolean;
};

const fmt = (n: number) =>
  n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

function FacturesMutuellesPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [q, setQ] = useState<string>("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const { data: dossiers = [], isLoading } = useQuery({
    queryKey: ["factures-mutuelles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dossiers")
        .select(
          "id, client_nom, client_prenom, mutuelle, montant_pec, transmis_mutuelle, transmis_mutuelle_at, facture_cosium, facture_cosium_at, paiement_mutuelle_recu, paiement_recu",
        )
        .eq("paiement_recu", false)
        .or("facture_cosium.eq.true,transmis_mutuelle.eq.true,transmis_mutuelle_at.not.is.null")
        .gt("montant_pec", 0);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const filtered = useMemo(() => {
    const fromT = from ? new Date(from + "T00:00:00").getTime() : null;
    const toT = to ? new Date(to + "T23:59:59.999").getTime() : null;
    const ql = q.trim().toLowerCase();
    return dossiers.filter((d) => {
      if (d.paiement_mutuelle_recu) return false;
      const ref = d.transmis_mutuelle_at ?? d.facture_cosium_at;
      if (fromT != null || toT != null) {
        if (!ref) return false;
        const t = new Date(ref).getTime();
        if (fromT != null && t < fromT) return false;
        if (toT != null && t > toT) return false;
      }
      if (ql) {
        const hay = `${d.mutuelle ?? ""} ${d.client_nom} ${d.client_prenom}`.toLowerCase();
        if (!hay.includes(ql)) return false;
      }
      return true;
    });
  }, [dossiers, from, to, q]);

  const groups = useMemo(() => {
    const map = new Map<string, { mutuelle: string; total: number; rows: Row[] }>();
    for (const d of filtered) {
      const key = d.mutuelle?.trim() || "— Sans mutuelle —";
      const bucket = map.get(key) ?? { mutuelle: key, total: 0, rows: [] };
      bucket.total += Number(d.montant_pec) || 0;
      bucket.rows.push(d);
      map.set(key, bucket);
    }
    return Array.from(map.values())
      .map((g) => ({
        ...g,
        rows: g.rows.sort((a, b) => (Number(b.montant_pec) || 0) - (Number(a.montant_pec) || 0)),
      }))
      .sort((a, b) => b.total - a.total);
  }, [filtered]);

  const grandTotal = groups.reduce((s, g) => s + g.total, 0);
  const grandCount = groups.reduce((s, g) => s + g.rows.length, 0);

  const setPreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    setFrom(start.toISOString().slice(0, 10));
    setTo(end.toISOString().slice(0, 10));
  };

  const toggle = (key: string) => setExpanded((s) => ({ ...s, [key]: !s[key] }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Building2 className="h-6 w-6" /> Répartition par mutuelle
          </h1>
          <p className="text-sm text-muted-foreground">
            Paiements mutuelle facturés et en attente d'encaissement.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="rounded-lg border bg-card px-4 py-2 text-right">
            <div className="text-xs uppercase text-muted-foreground">Total en attente</div>
            <div className="text-lg font-semibold">{fmt(grandTotal)}</div>
          </div>
          <div className="rounded-lg border bg-card px-4 py-2 text-right">
            <div className="text-xs uppercase text-muted-foreground">Dossiers</div>
            <div className="text-lg font-semibold">{grandCount}</div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative lg:col-span-2">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher une mutuelle ou un client..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Du (date de transmission)</label>
          <Input type="date" value={from} max={today} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Au</label>
          <Input type="date" value={to} max={today} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="flex flex-wrap items-end gap-1.5">
          <Button variant="outline" size="sm" onClick={() => setPreset(30)}>30 j</Button>
          <Button variant="outline" size="sm" onClick={() => setPreset(60)}>60 j</Button>
          <Button variant="outline" size="sm" onClick={() => setPreset(90)}>90 j</Button>
          <Button variant="ghost" size="sm" onClick={() => { setFrom(""); setTo(""); setQ(""); }}>
            Effacer
          </Button>
        </div>
      </div>

      {!isLoading && groups.length > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold">Répartition par mutuelle</h2>
            <span className="text-xs text-muted-foreground">
              Top {Math.min(12, groups.length)} sur {groups.length}
            </span>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={groups.slice(0, 12).map((g) => ({ name: g.mutuelle, total: g.total }))}
                margin={{ top: 8, right: 16, left: 8, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="name"
                  angle={-30}
                  textAnchor="end"
                  interval={0}
                  height={70}
                  tick={{ fontSize: 11 }}
                />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip
                  formatter={(v: number) => [fmt(v), "En attente"]}
                  cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                  {groups.slice(0, 12).map((_, i) => (
                    <Cell key={i} fill={`hsl(${(i * 47) % 360} 70% 55%)`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border bg-card">
        {isLoading ? (
          <p className="p-6 text-center text-sm text-muted-foreground">Chargement...</p>
        ) : groups.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            Aucun paiement mutuelle en attente pour cette période.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2 w-8"></th>
                <th className="px-4 py-2">Mutuelle</th>
                <th className="px-4 py-2 text-right">Dossiers</th>
                <th className="px-4 py-2 text-right">Part du total</th>
                <th className="px-4 py-2 text-right">Montant en attente</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {groups.map((g) => {
                const open = !!expanded[g.mutuelle];
                const pct = grandTotal > 0 ? (g.total / grandTotal) * 100 : 0;
                return (
                  <>
                    <tr
                      key={g.mutuelle}
                      className="cursor-pointer hover:bg-muted/30"
                      onClick={() => toggle(g.mutuelle)}
                    >
                      <td className="px-4 py-3 text-muted-foreground">
                        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </td>
                      <td className="px-4 py-3 font-medium">{g.mutuelle}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{g.rows.length}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                        {pct.toFixed(1)} %
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">{fmt(g.total)}</td>
                    </tr>
                    {open && (
                      <tr key={g.mutuelle + "-detail"} className="bg-muted/20">
                        <td colSpan={5} className="px-4 py-2">
                          <table className="w-full text-xs">
                            <thead className="text-muted-foreground">
                              <tr>
                                <th className="px-2 py-1 text-left">Client</th>
                                <th className="px-2 py-1 text-left">Transmis le</th>
                                <th className="px-2 py-1 text-left">Ancienneté</th>
                                <th className="px-2 py-1 text-right">Montant</th>
                              </tr>
                            </thead>
                            <tbody>
                              {g.rows.map((d) => {
                                const ref = d.transmis_mutuelle_at ?? d.facture_cosium_at;
                                const days = ref
                                  ? Math.floor((Date.now() - new Date(ref).getTime()) / 86400000)
                                  : null;
                                return (
                                  <tr key={d.id} className="border-t border-border/60">
                                    <td className="px-2 py-1.5">
                                      <Link
                                        to="/dossiers/$id"
                                        params={{ id: d.id }}
                                        className="font-medium hover:underline"
                                      >
                                        {d.client_nom?.toUpperCase()} {d.client_prenom}
                                      </Link>
                                    </td>
                                    <td className="px-2 py-1.5 text-muted-foreground">
                                      {ref ? new Date(ref).toLocaleDateString("fr-FR") : "—"}
                                    </td>
                                    <td className="px-2 py-1.5 text-muted-foreground">
                                      {days != null ? `${days} j` : "—"}
                                    </td>
                                    <td className="px-2 py-1.5 text-right tabular-nums font-medium">
                                      {fmt(Number(d.montant_pec) || 0)}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
            <tfoot className="border-t bg-muted/40">
              <tr>
                <td></td>
                <td className="px-4 py-2 font-semibold">Total</td>
                <td className="px-4 py-2 text-right font-semibold tabular-nums">{grandCount}</td>
                <td></td>
                <td className="px-4 py-2 text-right font-semibold tabular-nums">{fmt(grandTotal)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
