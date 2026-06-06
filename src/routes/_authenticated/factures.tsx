import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Receipt, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/factures")({
  head: () => ({ meta: [{ title: "Factures en attente — Optique Suivi" }] }),
  component: FacturesPage,
});

function FacturesPage() {
  const qc = useQueryClient();

  const { data: dossiers = [], isLoading } = useQuery({
    queryKey: ["factures-en-attente"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dossiers")
        .select("id, client_nom, client_prenom, mutuelle, montant_pec, transmis_mutuelle, transmis_mutuelle_at, facture_cosium")
        .or("facture_cosium.eq.true,transmis_mutuelle.eq.true")
        .eq("paiement_recu", false)
        .order("transmis_mutuelle_at", { ascending: true, nullsFirst: false });

      if (error) throw error;
      return data as any[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("factures-en-attente")
      .on("postgres_changes", { event: "*", schema: "public", table: "dossiers" }, () => {
        qc.invalidateQueries({ queryKey: ["factures-en-attente"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  const totalEnAttente = dossiers.reduce(
    (acc, d) => acc + (Number(d.montant_pec) || 0),
    0,
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Receipt className="h-6 w-6" />
            Factures en attente
          </h1>
          <p className="text-sm text-muted-foreground">
            Dossiers transmis à la mutuelle, en attente du règlement.
          </p>
        </div>
        <div className="rounded-lg border bg-card px-4 py-2 text-right">
          <div className="text-xs uppercase text-muted-foreground">Total en attente</div>
          <div className="text-lg font-semibold">
            {totalEnAttente.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Mutuelle</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3 text-right">Montant accordé</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">Chargement...</td></tr>
            )}
            {!isLoading && dossiers.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                Aucune facture en attente de règlement.
              </td></tr>
            )}
            {dossiers.map((d) => (
              <tr key={d.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">
                  {d.client_nom?.toUpperCase()} {d.client_prenom}
                </td>
                <td className="px-4 py-3">{d.mutuelle || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {d.transmis_mutuelle && d.transmis_mutuelle_at
                    ? `Transmis le ${new Date(d.transmis_mutuelle_at).toLocaleDateString("fr-FR")}`
                    : d.facture_cosium
                      ? "Facturé sur Cosium"
                      : "—"}
                </td>

                <td className="px-4 py-3 text-right font-medium">
                  {Number(d.montant_pec || 0).toLocaleString("fr-FR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })} €
                </td>
                <td className="px-4 py-3 text-right">
                  <Link to="/dossiers/$id" params={{ id: d.id }}>
                    <Button size="sm" variant="ghost" className="gap-1">
                      Ouvrir <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
