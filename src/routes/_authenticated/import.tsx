import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { ArrowLeft, CheckCircle2, AlertTriangle, HelpCircle, Loader2, GitMerge } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { TERMINAL_STATUSES } from "@/lib/dossier-status";

const isArchived = (d: { status: string | null }) =>
  !!d.status && (TERMINAL_STATUSES as readonly string[]).includes(d.status);

export const Route = createFileRoute("/_authenticated/import")({
  head: () => ({ meta: [{ title: "Import Excel — Optique Suivi" }] }),
  component: ImportPage,
});

type Staging = {
  id: string;
  source_row: number;
  raw_nom_prenom: string;
  client_nom: string;
  client_prenom: string;
  date_achat: string | null;
  mutuelle: string | null;
  rbsmt_attente: number | null;
  rac: number | null;
  a_regler_papiers: number | null;
  type_reglement: string | null;
  paye: string | null;
  tp_status: string | null;
  decision: string;
  imported_dossier_id: string | null;
  type_dossier: string | null;
};

type Dossier = {
  id: string;
  client_nom: string;
  client_prenom: string;
  created_at: string;
  mutuelle: string | null;
  telephone: string | null;
  type_dossier: string | null;
  montant_devis: number | null;
  montant_pec: number | null;
  reste_a_charge: number | null;
  avoir_commercial: number | null;
  reste_a_charge_payment_method: string | null;
  paiement_client_recu: boolean | null;
  paiement_mutuelle_recu: boolean | null;
  transmis_mutuelle: boolean | null;
  status: string | null;
};

const normalize = (s: string) =>
  (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s*\(.*?\)\s*/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .trim();

function ImportPage() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);

  const { data: staging = [], isLoading: loadingStaging } = useQuery({
    queryKey: ["import-staging"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dossiers_import_staging")
        .select("*")
        .order("source_row");
      if (error) throw error;
      return data as Staging[];
    },
  });

  const { data: dossiers = [] } = useQuery({
    queryKey: ["all-dossiers-for-match"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dossiers")
        .select("id, client_nom, client_prenom, created_at, mutuelle, telephone, type_dossier, montant_devis, montant_pec, reste_a_charge, avoir_commercial, reste_a_charge_payment_method, paiement_client_recu, paiement_mutuelle_recu, transmis_mutuelle, status");
      if (error) throw error;
      return data as Dossier[];
    },
  });

  const importedIds = useMemo(() => {
    const set = new Set<string>();
    for (const s of staging) {
      if (s.imported_dossier_id) set.add(s.imported_dossier_id);
    }
    return set;
  }, [staging]);

  const enriched = useMemo(() => {
    const idx = new Map<string, Dossier[]>();
    for (const d of dossiers) {
      const key = normalize(d.client_nom) + "|" + normalize(d.client_prenom);
      const arr = idx.get(key) || [];
      arr.push(d);
      idx.set(key, arr);
    }
    return staging.map((s) => {
      const key = normalize(s.client_nom) + "|" + normalize(s.client_prenom);
      const matches = idx.get(key) || [];
      return { s, matches };
    });
  }, [staging, dossiers]);

  const nouveau = enriched.filter((e) => e.matches.length === 0 && e.s.decision === "pending");
  const unique = enriched.filter((e) => e.matches.length === 1 && e.s.decision === "pending");
  const multi = enriched.filter((e) => e.matches.length > 1 && e.s.decision === "pending");
  const done = enriched.filter((e) => e.s.decision !== "pending");

  const importAsNew = async (s: Staging) => {
    setBusy(s.id);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const rbsmt = s.rbsmt_attente || 0;
      const rac = s.rac || 0;
      const arp = s.a_regler_papiers || 0;
      const montantDevis = rbsmt + rac + arp;
      const payeX = (s.paye || "").toLowerCase() === "x";
      const isPasDeTP = (s.tp_status || "").toLowerCase().includes("pas");

      const status: "regle" | "transmis_mutuelle" | "a_traiter" =
        payeX && isPasDeTP ? "regle" : rbsmt > 0 ? "transmis_mutuelle" : "a_traiter";

      const insert = {
        client_nom: s.client_nom || "?",
        client_prenom: s.client_prenom || "-",
        telephone: "",
        mutuelle: s.mutuelle || "",
        type_verres: "",
        type_dossier: "lunettes",
        montant_devis: montantDevis,
        montant_pec: rbsmt,
        avoir_commercial: arp,
        reste_a_charge_payment_method: s.type_reglement,
        paiement_client_recu: rac === 0 || payeX,
        paiement_mutuelle_recu: rbsmt === 0,
        facture_cosium: true,
        transmis_mutuelle: rbsmt > 0,
        status,
        created_by: userData.user?.id,
        created_at: s.date_achat ? new Date(s.date_achat).toISOString() : undefined,
      };

      const { data: newDossier, error } = await supabase
        .from("dossiers")
        .insert(insert)
        .select("id")
        .single();
      if (error) throw error;

      await supabase
        .from("dossiers_import_staging")
        .update({
          decision: "imported_new",
          imported_at: new Date().toISOString(),
          imported_dossier_id: newDossier.id,
          matched_dossier_id: newDossier.id,
        })
        .eq("id", s.id);

      toast.success(`Dossier créé : ${s.raw_nom_prenom}`);
      qc.invalidateQueries({ queryKey: ["import-staging"] });
      qc.invalidateQueries({ queryKey: ["all-dossiers-for-match"] });
    } catch (e: any) {
      toast.error(e.message || "Erreur");
    } finally {
      setBusy(null);
    }
  };

  const skip = async (s: Staging) => {
    setBusy(s.id);
    await supabase
      .from("dossiers_import_staging")
      .update({ decision: "skipped", imported_at: new Date().toISOString() })
      .eq("id", s.id);
    qc.invalidateQueries({ queryKey: ["import-staging"] });
    setBusy(null);
  };

  const linkExisting = async (s: Staging, dossierId: string) => {
    setBusy(s.id);
    await supabase
      .from("dossiers_import_staging")
      .update({
        decision: "linked_existing",
        matched_dossier_id: dossierId,
        imported_dossier_id: dossierId,
        imported_at: new Date().toISOString(),
      })
      .eq("id", s.id);
    toast.success("Marqué comme déjà présent");
    qc.invalidateQueries({ queryKey: ["import-staging"] });
    setBusy(null);
  };

  const [mergeTarget, setMergeTarget] = useState<{ s: Staging; dossier: Dossier } | null>(null);

  const applyMerge = async (patch: Record<string, unknown>) => {
    if (!mergeTarget) return;
    const { s, dossier } = mergeTarget;
    setBusy(s.id);
    try {
      if (Object.keys(patch).length > 0) {
        const { error } = await supabase.from("dossiers").update(patch as never).eq("id", dossier.id);
        if (error) throw error;
      }
      await supabase
        .from("dossiers_import_staging")
        .update({
          decision: "merged_existing",
          matched_dossier_id: dossier.id,
          imported_dossier_id: dossier.id,
          imported_at: new Date().toISOString(),
        })
        .eq("id", s.id);
      toast.success("Dossier existant complété avec les infos Excel");
      setMergeTarget(null);
      qc.invalidateQueries({ queryKey: ["import-staging"] });
      qc.invalidateQueries({ queryKey: ["all-dossiers-for-match"] });
    } catch (e: any) {
      toast.error(e.message || "Erreur");
    } finally {
      setBusy(null);
    }
  };

  const bulkImportNew = async () => {
    if (!confirm(`Créer ${nouveau.length} nouveaux dossiers ?`)) return;
    for (const e of nouveau) {
      await importAsNew(e.s);
    }
  };

  const bulkLinkUnique = async () => {
    if (!confirm(`Marquer ${unique.length} dossiers comme déjà présents (aucune modification) ?`)) return;
    for (const e of unique) {
      await linkExisting(e.s, e.matches[0].id);
    }
  };

  if (loadingStaging) return <div className="p-6"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Link to="/parametres"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-2xl font-semibold tracking-tight">Import Excel — Attente Encaissement</h1>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Total lignes" value={staging.length} />
        <StatCard label="Nouveaux (à créer)" value={nouveau.length} tone="green" />
        <StatCard label="Déjà présents" value={unique.length} tone="amber" />
        <StatCard label="Ambigus" value={multi.length} tone="red" />
      </div>

      <Tabs defaultValue="new" className="space-y-3">
        <TabsList>
          <TabsTrigger value="new">Nouveaux ({nouveau.length})</TabsTrigger>
          <TabsTrigger value="unique">Match unique ({unique.length})</TabsTrigger>
          <TabsTrigger value="multi">Ambigus ({multi.length})</TabsTrigger>
          <TabsTrigger value="done">Traités ({done.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="new" className="space-y-2">
          {nouveau.length > 0 && (
            <Button onClick={bulkImportNew} className="mb-2">
              <CheckCircle2 className="mr-2 h-4 w-4" /> Créer les {nouveau.length} nouveaux dossiers
            </Button>
          )}
          {nouveau.map((e) => (
            <RowCard key={e.s.id} s={e.s} busy={busy === e.s.id}>
              <Button size="sm" onClick={() => importAsNew(e.s)} disabled={busy === e.s.id}>
                Créer
              </Button>
              <Button size="sm" variant="ghost" onClick={() => skip(e.s)} disabled={busy === e.s.id}>
                Ignorer
              </Button>
            </RowCard>
          ))}
        </TabsContent>

        <TabsContent value="unique" className="space-y-2">
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <AlertTriangle className="mr-1 inline h-4 w-4" />
            Ces lignes correspondent à un dossier déjà présent. Trois options :{" "}
            <strong>« Compléter »</strong> pour enrichir le dossier existant avec les infos Excel (TP réglé, mutuelle, etc.),{" "}
            <strong>« Déjà présent »</strong> pour ne rien toucher, ou <strong>« Créer quand même »</strong> si c'est un dossier différent.
          </div>
          {unique.length > 0 && (
            <Button onClick={bulkLinkUnique} variant="outline" className="mb-2">
              Marquer les {unique.length} comme déjà présents
            </Button>
          )}
          {unique.map((e) => {
            const archived = isArchived(e.matches[0]);
            return (
              <RowCard key={e.s.id} s={e.s} busy={busy === e.s.id} match={e.matches[0]} matchFromImport={importedIds.has(e.matches[0].id)} matchArchived={archived}>
                {!archived && (
                  <Button size="sm" onClick={() => setMergeTarget({ s: e.s, dossier: e.matches[0] })} disabled={busy === e.s.id}>
                    <GitMerge className="mr-1 h-3 w-3" /> Compléter
                  </Button>
                )}
                <Button size="sm" variant={archived ? "default" : "outline"} onClick={() => linkExisting(e.s, e.matches[0].id)} disabled={busy === e.s.id}>
                  Déjà présent{archived ? " (archivé)" : ""}
                </Button>
                {!archived && (
                  <Button size="sm" variant="secondary" onClick={() => importAsNew(e.s)} disabled={busy === e.s.id}>
                    Créer quand même
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => skip(e.s)} disabled={busy === e.s.id}>
                  Ignorer
                </Button>
              </RowCard>
            );
          })}
        </TabsContent>

        <TabsContent value="multi" className="space-y-2">
          {multi.map((e) => (
            <RowCard key={e.s.id} s={e.s} busy={busy === e.s.id}>
              <div className="w-full space-y-2">
                <div className="text-xs text-muted-foreground">Correspondances possibles — compare et choisis :</div>
                {e.matches.map((m) => (
                  <MatchCandidate
                    key={m.id}
                    dossier={m}
                    fromImport={importedIds.has(m.id)}
                    onSelect={() => linkExisting(e.s, m.id)}
                    onMerge={isArchived(m) ? undefined : () => setMergeTarget({ s: e.s, dossier: m })}
                  />
                ))}
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="secondary" onClick={() => importAsNew(e.s)}>Aucun ne correspond — Créer un nouveau</Button>
                  <Button size="sm" variant="ghost" onClick={() => skip(e.s)}>Ignorer</Button>
                </div>
              </div>
            </RowCard>
          ))}
        </TabsContent>

        <TabsContent value="done" className="space-y-2">
          {done.map((e) => (
            <div key={e.s.id} className="flex items-center justify-between rounded border p-2 text-sm">
              <span>#{e.s.source_row} — {e.s.raw_nom_prenom}</span>
              <Badge variant="outline">{e.s.decision}</Badge>
            </div>
          ))}
        </TabsContent>
      </Tabs>

      <MergeDialog
        target={mergeTarget}
        onClose={() => setMergeTarget(null)}
        onApply={applyMerge}
      />
    </div>
  );
}

type MergeField = {
  key: string;
  label: string;
  current: unknown;
  incoming: unknown;
  display: (v: unknown) => string;
  patchValue: unknown;
};

function buildMergeFields(s: Staging, d: Dossier): MergeField[] {
  const fmtNum = (v: unknown) => (v == null || v === "" ? "—" : `${Number(v).toFixed(2)} €`);
  const fmtBool = (v: unknown) => (v === true ? "✅ Oui" : v === false ? "❌ Non" : "—");
  const fmtText = (v: unknown) => (v == null || v === "" ? "—" : String(v));

  const rbsmt = s.rbsmt_attente ?? 0;
  const rac = s.rac ?? 0;
  const arp = s.a_regler_papiers ?? 0;
  const payeX = (s.paye || "").toLowerCase() === "x";
  const isPasDeTP = (s.tp_status || "").toLowerCase().includes("pas");

  const fields: MergeField[] = [];

  if (s.mutuelle) {
    fields.push({
      key: "mutuelle",
      label: "Mutuelle",
      current: d.mutuelle,
      incoming: s.mutuelle,
      display: fmtText,
      patchValue: s.mutuelle,
    });
  }

  if (s.rbsmt_attente != null) {
    fields.push({
      key: "montant_pec",
      label: "Montant PEC (Rbsmt attente)",
      current: d.montant_pec,
      incoming: rbsmt,
      display: fmtNum,
      patchValue: rbsmt,
    });
  }

  if (s.a_regler_papiers != null && arp > 0) {
    fields.push({
      key: "avoir_commercial",
      label: "Avoir commercial (Papiers à régler)",
      current: d.avoir_commercial,
      incoming: arp,
      display: fmtNum,
      patchValue: arp,
    });
  }

  if (s.type_reglement) {
    fields.push({
      key: "reste_a_charge_payment_method",
      label: "Type de règlement",
      current: d.reste_a_charge_payment_method,
      incoming: s.type_reglement,
      display: fmtText,
      patchValue: s.type_reglement,
    });
  }

  // TP mutuelle transmis
  if (rbsmt > 0) {
    fields.push({
      key: "transmis_mutuelle",
      label: "Transmis à la mutuelle",
      current: d.transmis_mutuelle,
      incoming: true,
      display: fmtBool,
      patchValue: true,
    });
  }

  // Paiement mutuelle reçu (si Rbsmt = 0 dans Excel, ça veut dire soit pas de TP, soit déjà réglé)
  // On propose uniquement si l'Excel indique clairement "Payé"
  if (payeX && rbsmt > 0) {
    fields.push({
      key: "paiement_mutuelle_recu",
      label: "TP mutuelle réglé",
      current: d.paiement_mutuelle_recu,
      incoming: true,
      display: fmtBool,
      patchValue: true,
    });
  }

  // Paiement client reçu (si RAC = 0 ou marqué payé)
  if (payeX || rac === 0) {
    fields.push({
      key: "paiement_client_recu",
      label: "Paiement client reçu (RAC)",
      current: d.paiement_client_recu,
      incoming: true,
      display: fmtBool,
      patchValue: true,
    });
  }

  return fields;
}

function MergeDialog({
  target,
  onClose,
  onApply,
}: {
  target: { s: Staging; dossier: Dossier } | null;
  onClose: () => void;
  onApply: (patch: Record<string, unknown>) => void;
}) {
  const fields = useMemo(() => (target ? buildMergeFields(target.s, target.dossier) : []), [target]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Par défaut : cocher uniquement les champs où la valeur actuelle est vide/null
    const init: Record<string, boolean> = {};
    for (const f of fields) {
      const isEmpty = f.current == null || f.current === "" || f.current === false;
      const isDifferent = f.current !== f.incoming;
      init[f.key] = isEmpty && isDifferent;
    }
    setSelected(init);
  }, [fields]);

  if (!target) return null;

  const toggle = (k: string) => setSelected((p) => ({ ...p, [k]: !p[k] }));

  const submit = () => {
    const patch: Record<string, unknown> = {};
    for (const f of fields) {
      if (selected[f.key]) patch[f.key] = f.patchValue;
    }
    onApply(patch);
  };

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Compléter le dossier existant</DialogTitle>
          <DialogDescription>
            Coche les infos Excel que tu veux appliquer au dossier <strong>{target.dossier.client_nom} {target.dossier.client_prenom}</strong>.
            Les champs déjà remplis dans l'app sont laissés décochés par défaut — coche-les seulement si tu veux les écraser.
          </DialogDescription>
        </DialogHeader>

        {fields.length === 0 ? (
          <div className="rounded border bg-muted/40 p-4 text-sm text-muted-foreground">
            Aucune donnée exploitable dans cette ligne Excel pour enrichir le dossier.
          </div>
        ) : (
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            <div className="grid grid-cols-[auto,1fr,1fr,1fr] items-center gap-2 border-b pb-1 text-xs font-medium text-muted-foreground">
              <span></span>
              <span>Champ</span>
              <span>Valeur actuelle (app)</span>
              <span>Valeur Excel</span>
            </div>
            {fields.map((f) => {
              const same = f.current === f.incoming;
              return (
                <label
                  key={f.key}
                  className={`grid grid-cols-[auto,1fr,1fr,1fr] items-center gap-2 rounded border p-2 text-sm ${same ? "opacity-50" : "cursor-pointer hover:bg-muted/40"}`}
                >
                  <Checkbox
                    checked={!!selected[f.key]}
                    onCheckedChange={() => toggle(f.key)}
                    disabled={same}
                  />
                  <span className="font-medium">{f.label}</span>
                  <span className="text-muted-foreground">{f.display(f.current)}</span>
                  <span className={same ? "text-muted-foreground" : "font-medium text-green-700"}>
                    {f.display(f.incoming)}
                  </span>
                </label>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button onClick={submit} disabled={fields.length === 0 || Object.values(selected).every((v) => !v)}>
            <CheckCircle2 className="mr-1 h-4 w-4" /> Appliquer les changements cochés
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone?: "green" | "amber" | "red" }) {
  const color = tone === "green" ? "text-green-700" : tone === "amber" ? "text-amber-700" : tone === "red" ? "text-red-700" : "text-foreground";
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-semibold ${color}`}>{value}</div>
    </div>
  );
}

function RowCard({ s, busy, match, matchFromImport, matchArchived, children }: { s: Staging; busy: boolean; match?: Dossier; matchFromImport?: boolean; matchArchived?: boolean; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">#{s.source_row}</span>
            <span className="font-medium">{s.raw_nom_prenom}</span>
            {s.date_achat && <span className="text-xs text-muted-foreground">{new Date(s.date_achat).toLocaleDateString("fr-FR")}</span>}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {s.mutuelle && <span>Mutuelle : <strong>{s.mutuelle}</strong></span>}
            {s.rbsmt_attente != null && <span>Rbsmt : {s.rbsmt_attente.toFixed(2)} €</span>}
            {s.rac != null && <span>RAC : {s.rac.toFixed(2)} €</span>}
            {s.a_regler_papiers != null && <span>Papiers : {s.a_regler_papiers.toFixed(2)} €</span>}
            {s.type_reglement && <span>Règl. : {s.type_reglement}</span>}
            {s.paye && <span className="text-green-700">Payé</span>}
          </div>
          {match && (
            <div className="mt-2">
              {matchArchived ? (
                <div className="mb-1 flex items-center gap-1 text-xs text-green-700">
                  <CheckCircle2 className="h-3 w-3" />
                  Dossier déjà archivé dans l'app — considéré à jour, aucune donnée à compléter :
                </div>
              ) : (
                <div className="mb-1 flex items-center gap-1 text-xs text-amber-700">
                  <HelpCircle className="h-3 w-3" />
                  Dossier existant potentiellement identique :
                </div>
              )}
              <MatchCandidate dossier={match} fromImport={!!matchFromImport} />
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : children}
        </div>
      </div>
    </div>
  );
}

function MatchCandidate({ dossier, fromImport, onSelect, onMerge }: { dossier: Dossier; fromImport: boolean; onSelect?: () => void; onMerge?: () => void }) {
  return (
    <div className="rounded border bg-muted/30 p-2 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{dossier.client_nom} {dossier.client_prenom}</span>
          <Badge variant="outline" className="text-xs">
            {fromImport ? "📥 Importé depuis Excel" : "✍️ Créé dans l'app"}
          </Badge>
          {isArchived(dossier) && <Badge className="bg-green-600 text-white hover:bg-green-600 text-xs">Archivé — à jour</Badge>}
          {dossier.status && <Badge variant="secondary" className="text-xs">{dossier.status}</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <Link to="/dossiers/$id" params={{ id: dossier.id }} target="_blank">
            <Button size="sm" variant="ghost">Voir le dossier ↗</Button>
          </Link>
          {onMerge && (
            <Button size="sm" onClick={onMerge}>
              <GitMerge className="mr-1 h-3 w-3" /> Compléter
            </Button>
          )}
          {onSelect && (
            <Button size="sm" variant="outline" onClick={onSelect}>
              C'est celui-ci
            </Button>
          )}
        </div>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
        <span>Créé le {new Date(dossier.created_at).toLocaleDateString("fr-FR")}</span>
        {dossier.type_dossier && <span>Type : {dossier.type_dossier}</span>}
        {dossier.mutuelle && <span>Mutuelle : <strong>{dossier.mutuelle}</strong></span>}
        {dossier.telephone && <span>Tél : {dossier.telephone}</span>}
        {dossier.montant_devis != null && <span>Devis : {Number(dossier.montant_devis).toFixed(2)} €</span>}
        {dossier.montant_pec != null && <span>PEC : {Number(dossier.montant_pec).toFixed(2)} €</span>}
        {dossier.reste_a_charge != null && <span>RAC : {Number(dossier.reste_a_charge).toFixed(2)} €</span>}
      </div>
    </div>
  );
}
