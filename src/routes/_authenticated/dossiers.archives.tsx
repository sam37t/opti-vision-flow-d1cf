import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Archive, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { TERMINAL_STATUSES, type DossierStatus } from "@/lib/dossier-status";

export const Route = createFileRoute("/_authenticated/dossiers/archives")({
  head: () => ({ meta: [{ title: "Dossiers archivés — Optique Suivi" }] }),
  component: ArchivesPage,
});

type Dossier = {
  id: string;
  client_nom: string;
  client_prenom: string;
  telephone: string | null;
  mutuelle: string | null;
  status: DossierStatus;
  montant_devis: number | null;
  montant_pec: number | null;
  reste_a_charge: number | null;
  created_at: string;
  updated_at: string;
  last_status_change_at: string;
};

function ArchivesPage() {
  const [q, setQ] = useState("");

  const { data: dossiers = [], isLoading } = useQuery({
    queryKey: ["dossiers-archives"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dossiers")
        .select("*")
        .in("status", TERMINAL_STATUSES)
        .order("last_status_change_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Dossier[];
    },
  });

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return dossiers;
    return dossiers.filter((d) =>
      [d.client_nom, d.client_prenom, d.telephone, d.mutuelle]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(term)),
    );
  }, [dossiers, q]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Archive className="h-6 w-6" /> Dossiers archivés
          </h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} dossier{filtered.length > 1 ? "s" : ""} terminé
            {filtered.length > 1 ? "s" : ""} (réglés, refusés, sans suite, sans TP)
          </p>
        </div>
        <Link to="/dossiers">
          <Button variant="outline" size="sm">Retour aux dossiers actifs</Button>
        </Link>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, prénom, téléphone, mutuelle..."
            className="pl-8"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement...</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">Aucun dossier archivé trouvé.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-muted-foreground">
              <tr>
                <Th>Client</Th>
                <Th>Mutuelle</Th>
                <Th>Devis</Th>
                <Th>Accordé</Th>
                <Th>Reste à charge</Th>
                <Th>Statut</Th>
                <Th>Clôturé le</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.id} className="border-t hover:bg-accent/50">
                  <td className="px-4 py-3">
                    <Link
                      to="/dossiers/$id"
                      params={{ id: d.id }}
                      className="font-medium hover:underline"
                    >
                      {d.client_nom.toUpperCase()} {d.client_prenom}
                    </Link>
                    {d.telephone && (
                      <div className="text-xs text-muted-foreground">{d.telephone}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">{d.mutuelle || "—"}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {Number(d.montant_devis ?? 0).toFixed(2)} €
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {d.montant_pec != null ? `${Number(d.montant_pec).toFixed(2)} €` : "—"}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {d.reste_a_charge != null
                      ? `${Number(d.reste_a_charge).toFixed(2)} €`
                      : "—"}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(d.last_status_change_at).toLocaleDateString("fr-FR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide">{children}</th>
  );
}
