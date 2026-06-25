import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useMemo } from "react";
import { Receipt, ArrowRight, AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/factures")({
  head: () => ({ meta: [{ title: "Factures en attente — Optique Suivi" }] }),
  component: FacturesPage,
});

type Dossier = {
  id: string;
  client_nom: string;
  client_prenom: string;
  mutuelle: string;
  montant_pec: number | null;
  montant_devis: number | null;
  transmis_mutuelle: boolean;
  transmis_mutuelle_at: string | null;
  facture_cosium: boolean;
  facture_cosium_at: string | null;
};

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const ms = Date.now() - d.getTime();
  return Math.floor(ms / 86400000);
}

function alertForDays(days: number | null): {
  className: string;
  label: string;
  icon?: boolean;
} | null {
  if (days == null) return null;
  if (days >= 30) return { className: "bg-red-600 text-white", label: `${days} j`, icon: true };
  if (days >= 20) return { className: "bg-red-300 text-red-950", label: `${days} j`, icon: true };
  if (days >= 15) return { className: "bg-orange-300 text-orange-950", label: `${days} j`, icon: true };
  if (days >= 10) return { className: "bg-yellow-200 text-yellow-950", label: `${days} j` };
  return null;
}

function FacturesPage() {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [paymentDates, setPaymentDates] = useState<Record<string, string>>({});

  const { data: dossiers = [], isLoading } = useQuery({
    queryKey: ["factures-en-attente"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dossiers")
        .select(
          "id, client_nom, client_prenom, mutuelle, montant_pec, montant_devis, transmis_mutuelle, transmis_mutuelle_at, facture_cosium, facture_cosium_at",
        )
        .or("facture_cosium.eq.true,transmis_mutuelle.eq.true,transmis_mutuelle_at.not.is.null")
        .eq("paiement_recu", false)
        .order("transmis_mutuelle_at", { ascending: true, nullsFirst: false });

      if (error) throw error;
      return (data ?? []) as Dossier[];
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

  const totalDevis = dossiers.reduce(
    (acc, d) => acc + (Number(d.montant_devis) || 0),
    0,
  );

  const sortedDossiers = useMemo(() => {
    return [...dossiers].sort((a, b) => {
      const aDays = a.facture_cosium && !a.transmis_mutuelle ? daysSince(a.facture_cosium_at) : null;
      const bDays = b.facture_cosium && !b.transmis_mutuelle ? daysSince(b.facture_cosium_at) : null;
      const aAlert = aDays != null && aDays >= 2;
      const bAlert = bDays != null && bDays >= 2;
      if (aAlert && bAlert) return (bDays ?? 0) - (aDays ?? 0);
      if (aAlert && !bAlert) return -1;
      if (!aAlert && bAlert) return 1;
      return 0;
    });
  }, [dossiers]);

  const confirmPayment = async (id: string, date: string) => {
    const { error } = await supabase
      .from("dossiers")
      .update({ paiement_recu: true, paiement_recu_at: date })
      .eq("id", id);
    if (error) {
      toast.error("Erreur lors de la confirmation du règlement");
      return;
    }
    toast.success("Règlement confirmé");
    qc.invalidateQueries({ queryKey: ["factures-en-attente"] });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Receipt className="h-6 w-6" />
            Factures en attente
          </h1>
          <p className="text-sm text-muted-foreground">
            Dossiers facturés ou transmis à la mutuelle, en attente du règlement.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="rounded-lg border bg-card px-4 py-2 text-right">
            <div className="text-xs uppercase text-muted-foreground">Total en attente</div>
            <div className="text-lg font-semibold">
              {totalEnAttente.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
            </div>
          </div>
          <div className="rounded-lg border bg-card px-4 py-2 text-right">
            <div className="text-xs uppercase text-muted-foreground">Total devis</div>
            <div className="text-lg font-semibold">
              {totalDevis.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Mutuelle</th>
              <th className="px-4 py-3">Facturé le</th>
              <th className="px-4 py-3">Transmis le</th>
              <th className="px-4 py-3">Délai</th>
              <th className="px-4 py-3 text-right">Montant accordé</th>
              <th className="px-4 py-3">Règlement</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading && (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-muted-foreground">Chargement...</td></tr>
            )}
            {!isLoading && dossiers.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-muted-foreground">
                Aucune facture en attente de règlement.
              </td></tr>
            )}
            {sortedDossiers.map((d) => {
              const days = d.transmis_mutuelle ? daysSince(d.transmis_mutuelle_at) : null;
              const alert = alertForDays(days);
              const nonTransmisDays =
                d.facture_cosium && !d.transmis_mutuelle ? daysSince(d.facture_cosium_at) : null;
              const showNonTransmis = nonTransmisDays != null && nonTransmisDays >= 2;
              return (
                <tr key={d.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-2">
                      <span>{d.client_nom?.toUpperCase()} {d.client_prenom}</span>
                      {showNonTransmis && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">
                          <AlertTriangle className="h-3 w-3" />
                          {nonTransmisDays}j non transmis
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">{d.mutuelle || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {d.facture_cosium_at
                      ? new Date(d.facture_cosium_at).toLocaleDateString("fr-FR")
                      : d.facture_cosium ? "—" : "Non facturé"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {d.transmis_mutuelle_at
                      ? new Date(d.transmis_mutuelle_at).toLocaleDateString("fr-FR")
                      : "Non transmis"}
                  </td>
                  <td className="px-4 py-3">
                    {alert ? (
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${alert.className}`}>
                        {alert.icon && <AlertTriangle className="h-3 w-3" />}
                        {alert.label}
                      </span>
                    ) : days != null ? (
                      <span className="text-xs text-muted-foreground">{days} j</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {Number(d.montant_pec || 0).toLocaleString("fr-FR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })} €
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="date"
                        value={paymentDates[d.id] ?? today}
                        onChange={(e) => setPaymentDates((p) => ({ ...p, [d.id]: e.target.value }))}
                        className="h-8 w-[140px]"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() => confirmPayment(d.id, paymentDates[d.id] || today)}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Reçu
                      </Button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link to="/dossiers/$id" params={{ id: d.id }}>
                      <Button size="sm" variant="ghost" className="gap-1">
                        Ouvrir <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border bg-card p-3 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Alertes mutuelle :</span>{" "}
        <span className="ml-2 inline-block rounded-full bg-yellow-200 px-2 py-0.5 text-yellow-950">10+ j</span>{" "}
        <span className="ml-2 inline-block rounded-full bg-orange-300 px-2 py-0.5 text-orange-950">15+ j</span>{" "}
        <span className="ml-2 inline-block rounded-full bg-red-300 px-2 py-0.5 text-red-950">20+ j</span>{" "}
        <span className="ml-2 inline-block rounded-full bg-red-600 px-2 py-0.5 text-white">30+ j</span>
      </div>
    </div>
  );
}
