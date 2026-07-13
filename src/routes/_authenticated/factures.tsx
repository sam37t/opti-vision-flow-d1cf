import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useEffect, useState, useMemo } from "react";
import { Receipt, ArrowRight, AlertTriangle, CheckCircle2, Building2, ChevronDown, ChevronRight, Search } from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { PaymentMethodSelect } from "@/components/PaymentMethodSelect";
import type { PaymentMethod } from "@/lib/payment-methods";

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
  facture_client: boolean;
  facture_client_at: string | null;
  reste_a_charge: number | null;
  avoir_commercial: number | null;
  reste_a_charge_payment_method: string | null;
  type_dossier: string | null;
  paiement_client_recu: boolean | null;
  paiement_client_recu_at: string | null;
  paiement_mutuelle_recu: boolean | null;
  paiement_mutuelle_recu_at: string | null;
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

function alertForClientDays(days: number | null): {
  className: string;
  label: string;
  icon?: boolean;
} | null {
  if (days == null) return null;
  if (days >= 21) return { className: "bg-red-600 text-white", label: `${days} j`, icon: true };
  if (days >= 14) return { className: "bg-orange-300 text-orange-950", label: `${days} j`, icon: true };
  if (days >= 7) return { className: "bg-yellow-200 text-yellow-950", label: `${days} j` };
  return null;
}

function LensBadge() {
  return (
    <span
      className="inline-flex items-center rounded-full border border-red-400 bg-red-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-red-700 shadow-sm"
      title="Dossier lentilles"
    >
      LENT
    </span>
  );
}

const fmt = (n: number) =>
  n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

function FacturesPage() {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [tab, setTab] = useState<"liste" | "mutuelle">("liste");
  const [clientDates, setClientDates] = useState<Record<string, string>>({});
  const [mutuelleDates, setMutuelleDates] = useState<Record<string, string>>({});
  const [paymentMethods, setPaymentMethods] = useState<Record<string, PaymentMethod | null>>({});

  // Filtres vue par mutuelle
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [q, setQ] = useState<string>("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const { data: dossiers = [], isLoading } = useQuery({
    queryKey: ["factures-en-attente"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dossiers")
        .select(
          "id, client_nom, client_prenom, mutuelle, montant_pec, montant_devis, transmis_mutuelle, transmis_mutuelle_at, facture_cosium, facture_cosium_at, facture_client, facture_client_at, reste_a_charge, avoir_commercial, reste_a_charge_payment_method, type_dossier, paiement_client_recu, paiement_client_recu_at, paiement_mutuelle_recu, paiement_mutuelle_recu_at",
        )
        .or("facture_cosium.eq.true,transmis_mutuelle.eq.true,transmis_mutuelle_at.not.is.null,facture_client.eq.true")
        .eq("paiement_recu", false)
        .order("transmis_mutuelle_at", { ascending: true, nullsFirst: false });

      if (error) throw error;
      const result = (data ?? []) as Dossier[];
      const methods: Record<string, PaymentMethod | null> = {};
      result.forEach((d) => {
        if (d.reste_a_charge_payment_method) {
          methods[d.id] = d.reste_a_charge_payment_method as PaymentMethod;
        }
      });
      setPaymentMethods(methods);
      return result;
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

  const computeDue = (d: Dossier) => {
    const isLentilles = d.type_dossier === "lentilles";
    const pec = Number(d.montant_pec) || 0;
    const rac = Number(d.reste_a_charge) || 0;
    const avoir = Number(d.avoir_commercial) || 0;

    const mutuelleExpected = pec;
    const mutuellePaid = !!d.paiement_mutuelle_recu;
    const mutuelleDue = mutuellePaid ? 0 : mutuelleExpected;

    let clientExpected = Math.max(0, rac);
    if (clientExpected === 0 && pec === 0 && rac === 0 && (d.facture_client || isLentilles)) {
      clientExpected = Math.max(0, (Number(d.montant_devis) || 0) - avoir);
    }
    const clientPaid = !!d.paiement_client_recu;
    const clientDue = clientPaid ? 0 : clientExpected;

    return {
      mutuelleExpected,
      mutuelleDue,
      mutuellePaid,
      clientExpected,
      clientDue,
      clientPaid,
      total: mutuelleDue + clientDue,
    };
  };

  const totalEnAttente = dossiers.reduce((acc, d) => acc + computeDue(d).total, 0);
  const totalMutuelle = dossiers.reduce((acc, d) => acc + computeDue(d).mutuelleDue, 0);
  const totalClient = dossiers.reduce((acc, d) => acc + computeDue(d).clientDue, 0);
  const totalFacture = dossiers.reduce((acc, d) => {
    const due = computeDue(d);
    return acc + due.mutuelleExpected + due.clientExpected;
  }, 0);
  const totalAvoir = dossiers.reduce((acc, d) => acc + (Number(d.avoir_commercial) || 0), 0);

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

  // Données pour la répartition par mutuelle
  const filteredMutuelle = useMemo(() => {
    const fromT = from ? new Date(from + "T00:00:00").getTime() : null;
    const toT = to ? new Date(to + "T23:59:59.999").getTime() : null;
    const ql = q.trim().toLowerCase();
    return dossiers.filter((d) => {
      const due = computeDue(d);
      if (due.mutuelleExpected <= 0 || due.mutuellePaid) return false;
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
    const map = new Map<string, { mutuelle: string; total: number; rows: Dossier[] }>();
    for (const d of filteredMutuelle) {
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
  }, [filteredMutuelle]);

  const grandTotalMutuelle = groups.reduce((s, g) => s + g.total, 0);
  const grandCountMutuelle = groups.reduce((s, g) => s + g.rows.length, 0);

  const confirmClient = async (id: string, date: string) => {
    const { error } = await supabase
      .from("dossiers")
      .update({ paiement_client_recu: true, paiement_client_recu_at: date } as any)
      .eq("id", id);
    if (error) {
      toast.error("Erreur lors de la confirmation du règlement client");
      return;
    }
    toast.success("Règlement client confirmé");
    qc.invalidateQueries({ queryKey: ["factures-en-attente"] });
  };

  const confirmMutuelle = async (id: string, date: string) => {
    const { error } = await supabase
      .from("dossiers")
      .update({ paiement_mutuelle_recu: true, paiement_mutuelle_recu_at: date } as any)
      .eq("id", id);
    if (error) {
      toast.error("Erreur lors de la confirmation du règlement mutuelle");
      return;
    }
    toast.success("Règlement mutuelle confirmé");
    qc.invalidateQueries({ queryKey: ["factures-en-attente"] });
  };

  const updateClientDate = async (id: string, date: string) => {
    const { error } = await supabase
      .from("dossiers")
      .update({ paiement_client_recu_at: date } as any)
      .eq("id", id);
    if (error) {
      toast.error("Erreur lors de la mise à jour de la date");
      return;
    }
    toast.success("Date mise à jour");
    qc.invalidateQueries({ queryKey: ["factures-en-attente"] });
  };

  const updateMutuelleDate = async (id: string, date: string) => {
    const { error } = await supabase
      .from("dossiers")
      .update({ paiement_mutuelle_recu_at: date } as any)
      .eq("id", id);
    if (error) {
      toast.error("Erreur lors de la mise à jour de la date");
      return;
    }
    toast.success("Date mise à jour");
    qc.invalidateQueries({ queryKey: ["factures-en-attente"] });
  };

  const updatePaymentMethod = useMutation({
    mutationFn: async ({ id, method }: { id: string; method: PaymentMethod | null }) => {
      const { error } = await supabase
        .from("dossiers")
        .update({ reste_a_charge_payment_method: method } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Mode de paiement enregistré");
      qc.invalidateQueries({ queryKey: ["factures-en-attente"] });
    },
    onError: (error) => {
      console.error(error);
      toast.error("Erreur lors de la sauvegarde du mode de paiement");
    },
  });

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
            <Receipt className="h-6 w-6" />
            Factures en attente
          </h1>
          <p className="text-sm text-muted-foreground">
            Suivi indépendant des règlements <span className="font-medium text-sky-800">mutuelle</span> et <span className="font-medium text-emerald-800">client</span>.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="rounded-lg border bg-card px-4 py-2 text-right">
            <div className="text-xs uppercase text-muted-foreground">Total en attente</div>
            <div className="text-lg font-semibold">
              {totalEnAttente.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
            </div>
          </div>
          <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-2 text-right">
            <div className="text-xs uppercase text-sky-900">Dû mutuelle</div>
            <div className="text-lg font-semibold text-sky-900">
              {totalMutuelle.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
            </div>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-right">
            <div className="text-xs uppercase text-emerald-900">Dû client</div>
            <div className="text-lg font-semibold text-emerald-900">
              {totalClient.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
            </div>
          </div>
          <div className="rounded-lg border bg-card px-4 py-2 text-right">
            <div className="text-xs uppercase text-muted-foreground">Total facturé</div>
            <div className="text-lg font-semibold">
              {totalFacture.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
            </div>
          </div>
          {totalAvoir > 0 && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-right">
              <div className="text-xs uppercase text-amber-900">Total avoirs</div>
              <div className="text-lg font-semibold text-amber-900">
                -{totalAvoir.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 border-b">
        <button
          onClick={() => setTab("liste")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "liste"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Liste des factures
        </button>
        <button
          onClick={() => setTab("mutuelle")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "mutuelle"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Building2 className="h-4 w-4" /> Par mutuelle
          </span>
        </button>
      </div>

      {tab === "liste" && (
        <>
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full min-w-[1100px] text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-2 py-2">Client</th>
                  <th className="px-2 py-2 hidden xl:table-cell">Mutuelle</th>
                  <th className="px-2 py-2">Délai</th>
                  <th className="px-2 py-2 text-right hidden lg:table-cell">Montant / Avoir</th>
                  <th className="px-2 py-2">Règlement mutuelle</th>
                  <th className="px-2 py-2">Règlement client</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading && (
                  <tr><td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">Chargement...</td></tr>
                )}
                {!isLoading && dossiers.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                    Aucune facture en attente de règlement.
                  </td></tr>
                )}
                {sortedDossiers.map((d) => {
                  const isLentilles = d.type_dossier === "lentilles";
                  const due = computeDue(d);
                  const isClientDirect = (d.facture_client && !d.transmis_mutuelle) || (isLentilles && !d.transmis_mutuelle);
                  const days = d.transmis_mutuelle
                    ? daysSince(d.transmis_mutuelle_at)
                    : isClientDirect
                      ? daysSince(d.facture_client_at || d.facture_cosium_at)
                      : null;
                  const alert = isClientDirect ? alertForClientDays(days) : alertForDays(days);
                  const nonTransmisDays =
                    d.facture_cosium && !d.transmis_mutuelle && due.mutuelleExpected > 0
                      ? daysSince(d.facture_cosium_at)
                      : null;
                  const showNonTransmis = nonTransmisDays != null && nonTransmisDays >= 2;
                  const avoir = Number(d.avoir_commercial) || 0;

                  return (
                    <tr key={d.id} className="hover:bg-muted/30 align-top">
                      <td className="px-2 py-2 font-medium">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span>{d.client_nom?.toUpperCase()} {d.client_prenom}</span>
                          {isLentilles && <LensBadge />}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {due.mutuelleExpected > 0 && (
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${due.mutuellePaid ? "bg-sky-100 text-sky-500 line-through" : "bg-sky-100 text-sky-800"}`}>
                              Mutuelle {due.mutuelleExpected.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€
                            </span>
                          )}
                          {due.clientExpected > 0 && (
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${due.clientPaid ? "bg-emerald-100 text-emerald-500 line-through" : "bg-emerald-100 text-emerald-800"}`}>
                              Client {due.clientExpected.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€
                            </span>
                          )}
                          {showNonTransmis && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                              <AlertTriangle className="h-3 w-3" />
                              {nonTransmisDays}j non transmis
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-2 hidden xl:table-cell text-muted-foreground">
                        {d.mutuelle || (isClientDirect ? <span className="italic">Client direct</span> : "—")}
                        {d.transmis_mutuelle_at && (
                          <div className="text-[11px]">Transmis {new Date(d.transmis_mutuelle_at).toLocaleDateString("fr-FR")}</div>
                        )}
                      </td>
                      <td className="px-2 py-2">
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
                      <td className="px-2 py-2 text-right hidden lg:table-cell text-xs">
                        <div>Devis : <span className="font-medium">{Number(d.montant_devis || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</span></div>
                        {avoir > 0 && (
                          <div className="text-amber-700">Avoir : -{avoir.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</div>
                        )}
                      </td>

                      <td className="px-2 py-2 min-w-[220px]">
                        {due.mutuelleExpected > 0 ? (
                          due.mutuellePaid ? (
                            <div className="space-y-1">
                              <div className="text-xs text-emerald-700 font-medium">✓ Reçu</div>
                              <div className="flex items-center gap-1.5">
                                <Input
                                  type="date"
                                  value={mutuelleDates[d.id] ?? (d.paiement_mutuelle_recu_at ?? today)}
                                  onChange={(e) => setMutuelleDates((p) => ({ ...p, [d.id]: e.target.value }))}
                                  onClick={(e) => e.currentTarget.showPicker?.()}
                                  onBlur={(e) => {
                                    if (e.target.value && e.target.value !== d.paiement_mutuelle_recu_at) {
                                      updateMutuelleDate(d.id, e.target.value);
                                    }
                                  }}
                                  max={today}
                                  aria-label={`Modifier la date du règlement mutuelle de ${d.client_prenom} ${d.client_nom}`}
                                  title="Modifier la date du règlement mutuelle"
                                  className="h-8 w-[140px] cursor-pointer text-xs"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <div className="text-xs font-semibold text-sky-800">
                                {due.mutuelleDue.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} € dû
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Input
                                  type="date"
                                  value={mutuelleDates[d.id] ?? today}
                                  onChange={(e) => setMutuelleDates((p) => ({ ...p, [d.id]: e.target.value }))}
                                  onClick={(e) => e.currentTarget.showPicker?.()}
                                  max={today}
                                  aria-label={`Choisir la date du règlement mutuelle de ${d.client_prenom} ${d.client_nom}`}
                                  title="Choisir la date réelle d'encaissement"
                                  className="h-8 w-[140px] cursor-pointer text-xs"
                                />
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 gap-1 px-2"
                                  onClick={() => confirmMutuelle(d.id, mutuelleDates[d.id] || today)}
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Reçu
                                </Button>
                              </div>
                              {!d.transmis_mutuelle && (
                                <div className="text-[10px] text-red-600">⚠ Non transmis</div>
                              )}
                            </div>
                          )
                        ) : (
                          <div className="text-xs text-muted-foreground">—</div>
                        )}
                      </td>

                      <td className="px-2 py-2 min-w-[260px]">
                        {due.clientExpected > 0 ? (
                          due.clientPaid ? (
                            <div className="space-y-1">
                              <div className="text-xs text-emerald-700 font-medium">✓ Encaissé</div>
                              <div className="flex items-center gap-1.5">
                                <PaymentMethodSelect
                                  value={paymentMethods[d.id] ?? null}
                                  onChange={(method) => {
                                    setPaymentMethods((p) => ({ ...p, [d.id]: method }));
                                    updatePaymentMethod.mutate({ id: d.id, method });
                                  }}
                                  placeholder="Mode"
                                  disabled={updatePaymentMethod.isPending}
                                />
                                <Input
                                  type="date"
                                  value={clientDates[d.id] ?? (d.paiement_client_recu_at ?? today)}
                                  onChange={(e) => setClientDates((p) => ({ ...p, [d.id]: e.target.value }))}
                                  onClick={(e) => e.currentTarget.showPicker?.()}
                                  onBlur={(e) => {
                                    if (e.target.value && e.target.value !== d.paiement_client_recu_at) {
                                      updateClientDate(d.id, e.target.value);
                                    }
                                  }}
                                  max={today}
                                  aria-label={`Modifier la date d'encaissement client de ${d.client_prenom} ${d.client_nom}`}
                                  title="Modifier la date d'encaissement"
                                  className="h-8 w-[140px] cursor-pointer text-xs"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <div className="text-xs font-semibold text-emerald-800">
                                {due.clientDue.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} € dû
                              </div>
                              <div className="flex items-center gap-1.5">
                                <PaymentMethodSelect
                                  value={paymentMethods[d.id] ?? null}
                                  onChange={(method) => {
                                    setPaymentMethods((p) => ({ ...p, [d.id]: method }));
                                    updatePaymentMethod.mutate({ id: d.id, method });
                                  }}
                                  placeholder="Mode"
                                  disabled={updatePaymentMethod.isPending}
                                />
                                <Input
                                  type="date"
                                  value={clientDates[d.id] ?? today}
                                  onChange={(e) => setClientDates((p) => ({ ...p, [d.id]: e.target.value }))}
                                  onClick={(e) => e.currentTarget.showPicker?.()}
                                  max={today}
                                  aria-label={`Choisir la date d'encaissement client de ${d.client_prenom} ${d.client_nom}`}
                                  title="Choisir la date d'encaissement"
                                  className="h-8 w-[150px] cursor-pointer text-xs"
                                />
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 gap-1 px-2"
                                  onClick={() => confirmClient(d.id, clientDates[d.id] || today)}
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Reçu
                                </Button>
                              </div>
                            </div>
                          )
                        ) : (
                          <div className="text-xs text-muted-foreground">—</div>
                        )}
                      </td>

                      <td className="px-2 py-2 text-right">
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
        </>
      )}

      {tab === "mutuelle" && (
        <div className="space-y-5">
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

          <div className="flex gap-3">
            <div className="rounded-lg border bg-card px-4 py-2 text-right">
              <div className="text-xs uppercase text-muted-foreground">Total en attente</div>
              <div className="text-lg font-semibold">{fmt(grandTotalMutuelle)}</div>
            </div>
            <div className="rounded-lg border bg-card px-4 py-2 text-right">
              <div className="text-xs uppercase text-muted-foreground">Dossiers</div>
              <div className="text-lg font-semibold">{grandCountMutuelle}</div>
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
                    <RechartsTooltip
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
                    const pct = grandTotalMutuelle > 0 ? (g.total / grandTotalMutuelle) * 100 : 0;
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
                    <td className="px-4 py-2 text-right font-semibold tabular-nums">{grandCountMutuelle}</td>
                    <td></td>
                    <td className="px-4 py-2 text-right font-semibold tabular-nums">{fmt(grandTotalMutuelle)}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
