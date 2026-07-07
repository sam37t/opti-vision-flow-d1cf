import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { ArrowLeft, ExternalLink, Phone, History, MessageSquare, Trash2, AlertOctagon, Receipt, CheckCircle2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { StatusBadge } from "@/components/StatusBadge";
import { SELECTABLE_STATUSES, STATUS_LABELS, type DossierStatus } from "@/lib/dossier-status";
import { getTpPlatform, isDifferentPlatform } from "@/lib/tp-platforms";
import { daysSinceTransmisNonRegle } from "@/lib/dossier-alerts";
import { PaymentMethodSelect } from "@/components/PaymentMethodSelect";
import { PaymentMethodBadge } from "@/components/PaymentMethodBadge";
import type { PaymentMethod } from "@/lib/payment-methods";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dossiers/$id")({
  head: () => ({ meta: [{ title: "Détail dossier — Optique Suivi" }] }),
  component: DossierDetail,
});

function DossierDetail() {
  const { id } = Route.useParams();
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = useAuth();

  const { data: dossier, isLoading } = useQuery({
    queryKey: ["dossier", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("dossiers").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: history = [] } = useQuery({
    queryKey: ["history", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dossier_history")
        .select("*")
        .eq("dossier_id", id)
        .order("changed_at", { ascending: false });
      if (error) throw error;
      const ids = Array.from(new Set((data ?? []).map((h: any) => h.changed_by).filter(Boolean)));
      let profilesMap: Record<string, string> = {};
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids);
        profilesMap = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p.full_name]));
      }
      return (data ?? []).map((h: any) => ({ ...h, profiles: { full_name: profilesMap[h.changed_by] } }));
    },
  });

  const { data: notes = [] } = useQuery({
    queryKey: ["notes", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dossier_notes")
        .select("*")
        .eq("dossier_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const ids = Array.from(new Set((data ?? []).map((n: any) => n.author_id).filter(Boolean)));
      let profilesMap: Record<string, string> = {};
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids);
        profilesMap = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p.full_name]));
      }
      return (data ?? []).map((n: any) => ({ ...n, profiles: { full_name: profilesMap[n.author_id] } }));
    },
  });


  const { data: typesVerres = [] } = useQuery({
    queryKey: ["types_verres"],
    queryFn: async () => {
      const { data, error } = await supabase.from("types_verres").select("name").order("name");
      if (error) throw error;
      return data.map((t) => t.name);
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`dossier-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "dossiers", filter: `id=eq.${id}` },
        () => qc.invalidateQueries({ queryKey: ["dossier", id] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "dossier_notes", filter: `dossier_id=eq.${id}` },
        () => qc.invalidateQueries({ queryKey: ["notes", id] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "dossier_history", filter: `dossier_id=eq.${id}` },
        () => qc.invalidateQueries({ queryKey: ["history", id] }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, qc]);

  const { data: mutuelles = [] } = useQuery({
    queryKey: ["mutuelles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("mutuelles").select("name").order("name");
      if (error) throw error;
      return data.map((m) => m.name);
    },
  });

  const [saving, setSaving] = useState(false);
  const [savingInfo, setSavingInfo] = useState(false);
  const [clientNom, setClientNom] = useState("");
  const [clientPrenom, setClientPrenom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [mutuelle, setMutuelle] = useState("");
  const [typeVerres, setTypeVerres] = useState("");
  const [typeDossier, setTypeDossier] = useState<"lunettes" | "lentilles" | "autre">("lunettes");
  const [devis, setDevis] = useState("");
  const [pec, setPec] = useState("");
  const [ss, setSs] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [paiementDate, setPaiementDate] = useState(new Date().toISOString().slice(0, 10));
  const [avoir, setAvoir] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);

  useEffect(() => {
    if (dossier) {
      const dd = dossier as any;
      setClientNom(dd.client_nom ?? "");
      setClientPrenom(dd.client_prenom ?? "");
      setTelephone(dd.telephone ?? "");
      setMutuelle(dd.mutuelle ?? "");
      setTypeVerres(dd.type_verres ?? "");
      setTypeDossier((dd.type_dossier as any) ?? "lunettes");
      setDevis(dd.montant_devis?.toString() ?? "");
      setPec(dd.montant_pec?.toString() ?? "");
      setSs(dd.montant_ss?.toString() ?? "");
      setAvoir(dd.avoir_commercial?.toString() ?? "");
      setPaymentMethod(dd.reste_a_charge_payment_method as PaymentMethod | null);
    }
  }, [dossier]);

  const parseAmount = (v: string) => v.trim() === "" ? null : Number(v.replace(",", ".")) || 0;
  const devisNum = parseAmount(devis) ?? 0;
  const pecNum = parseAmount(pec) ?? 0;
  const ssNum = parseAmount(ss) ?? 0;
  const avoirNum = parseAmount(avoir) ?? 0;
  const racLive = Math.max(0, devisNum - ssNum - pecNum - avoirNum);


  const saveInfos = async () => {
    if (!clientNom.trim() || !clientPrenom.trim()) {
      toast.error("Nom et prénom sont obligatoires");
      return;
    }
    setSavingInfo(true);
    const mut = mutuelle.trim();
    const tv = typeVerres.trim();
    if (mut && !mutuelles.includes(mut)) {
      await supabase.from("mutuelles").insert({ name: mut });
      qc.invalidateQueries({ queryKey: ["mutuelles"] });
    }
    if (tv && !typesVerres.includes(tv)) {
      await supabase.from("types_verres").insert({ name: tv });
      qc.invalidateQueries({ queryKey: ["types_verres"] });
    }
    const { error } = await supabase.from("dossiers").update({
      client_nom: clientNom.trim(),
      client_prenom: clientPrenom.trim(),
      telephone: telephone.trim(),
      mutuelle: mut,
      type_verres: tv,
      type_dossier: typeDossier,
    } as any).eq("id", id);
    setSavingInfo(false);
    if (error) toast.error(error.message);
    else toast.success("Informations mises à jour");
  };

  if (isLoading || !dossier) return <p className="text-sm text-muted-foreground">Chargement...</p>;
  const d = dossier as any;
  const daysNonRegle = daysSinceTransmisNonRegle(d);

  const changeStatus = async (newStatus: DossierStatus) => {
    const { error } = await supabase.from("dossiers").update({ status: newStatus }).eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Statut mis à jour");
  };

  const toggleProbleme = async () => {
    const { error } = await supabase.from("dossiers").update({ probleme: !d.probleme }).eq("id", id);
    if (error) toast.error(error.message);
    else toast.success(d.probleme ? "Problème retiré" : "Dossier marqué comme problématique");
  };

  const saveMontants = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("dossiers")
      .update({
        montant_devis: parseAmount(devis) ?? 0,
        montant_pec: parseAmount(pec),
        montant_ss: parseAmount(ss),
        avoir_commercial: parseAmount(avoir),
      } as any)
      .eq("id", id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Montants enregistrés");
  };

  const updatePaymentMethodMutation = useMutation({
    mutationFn: async (method: PaymentMethod | null) => {
      const { error } = await supabase
        .from("dossiers")
        .update({ reste_a_charge_payment_method: method } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Mode de paiement enregistré");
      qc.invalidateQueries({ queryKey: ["dossier", id] });
    },
    onError: (error) => {
      console.error(error);
      toast.error("Erreur lors de la sauvegarde du mode de paiement");
    },
  });

  const updateDossier = async (patch: any, successMsg = "Dossier mis à jour") => {
    const { error } = await supabase.from("dossiers").update(patch).eq("id", id);
    if (error) toast.error(error.message);
    else toast.success(successMsg);
  };

  const today = new Date().toISOString().slice(0, 10);


  const addNote = async () => {
    if (!noteContent.trim() || !user) return;
    const { error } = await supabase.from("dossier_notes").insert({
      dossier_id: id,
      author_id: user.id,
      content: noteContent.trim(),
    });
    if (error) toast.error(error.message);
    else setNoteContent("");
  };

  const deleteNote = async (noteId: string) => {
    await supabase.from("dossier_notes").delete().eq("id", noteId);
  };

  const deleteDossier = async () => {
    if (!confirm("Supprimer ce dossier ?")) return;
    const { error } = await supabase.from("dossiers").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Dossier supprimé");
      router.navigate({ to: "/dossiers" });
    }
  };

  return (
    <div className="space-y-5">
      <Link to="/dossiers" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Retour à la liste
      </Link>

      {d.probleme && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertOctagon className="h-4 w-4" />
          <span className="font-medium">Dossier signalé comme problématique</span>
        </div>
      )}
      {daysNonRegle != null && (
        <div className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertOctagon className="h-4 w-4" />
          <span className="font-medium">{daysNonRegle} jours non réglé — dossier transmis à la mutuelle en attente de règlement</span>
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {d.client_nom.toUpperCase()} {d.client_prenom}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {d.telephone && (
              <span className="inline-flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" /> {d.telephone}
              </span>
            )}
            <span>Créé le {new Date(d.created_at).toLocaleDateString("fr-FR")}</span>
            <TpLink mutuelle={d.mutuelle} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={d.status} />
          <Button
            variant={d.probleme ? "destructive" : "outline"}
            size="sm"
            onClick={toggleProbleme}
            className="gap-1.5"
          >
            <AlertOctagon className="h-4 w-4" />
            {d.probleme ? "Retirer le problème" : "Signaler un problème"}
          </Button>
          <Button variant="ghost" size="icon" onClick={deleteDossier} title="Supprimer">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      {notes.length > 0 && (
        <Card title="Notes internes" icon={<MessageSquare className="h-4 w-4" />}>
          <ul className="divide-y">
            {notes.map((n) => (
              <li key={n.id} className="group flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div>
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {n.profiles?.full_name ?? "Utilisateur"}
                    </span>
                    {" · "}
                    {new Date(n.created_at).toLocaleString("fr-FR")}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{n.content}</p>
                </div>
                {n.author_id === user?.id && (
                  <Button
                    variant="ghost" size="icon"
                    className="opacity-0 group-hover:opacity-100"
                    onClick={() => deleteNote(n.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}


      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card title="Informations client">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="client_nom">Nom <span className="text-destructive">*</span></Label>
                <Input id="client_nom" value={clientNom} onChange={(e) => setClientNom(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client_prenom">Prénom <span className="text-destructive">*</span></Label>
                <Input id="client_prenom" value={clientPrenom} onChange={(e) => setClientPrenom(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telephone">Téléphone</Label>
                <Input id="telephone" type="tel" value={telephone} onChange={(e) => setTelephone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mutuelle">Mutuelle</Label>
                <Input
                  id="mutuelle"
                  value={mutuelle}
                  onChange={(e) => setMutuelle(e.target.value)}
                  list="mutuelles-list-detail"
                  placeholder="Tapez ou choisissez"
                />
                <datalist id="mutuelles-list-detail">
                  {mutuelles.map((m) => <option key={m} value={m} />)}
                </datalist>
              </div>
              <div className="space-y-2">
                <Label htmlFor="type_dossier">Type de dossier</Label>
                <Select value={typeDossier} onValueChange={(v) => setTypeDossier(v as any)}>
                  <SelectTrigger id="type_dossier"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lunettes">Lunettes</SelectItem>
                    <SelectItem value="lentilles">Lentilles</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="type_verres">Type de verres</Label>
                <Input
                  id="type_verres"
                  value={typeVerres}
                  onChange={(e) => setTypeVerres(e.target.value)}
                  list="types-verres-list-detail"
                  placeholder="Tapez ou choisissez"
                />
                <datalist id="types-verres-list-detail">
                  {typesVerres.map((t) => <option key={t} value={t} />)}
                </datalist>
              </div>
            </div>
            <Button onClick={saveInfos} disabled={savingInfo} className="mt-4">
              {savingInfo ? "Enregistrement..." : "Enregistrer les informations"}
            </Button>
          </Card>


          <Card title="Statut">
            <div className="space-y-2">
              <Label>Changer le statut</Label>
              <Select value={d.status} onValueChange={(v) => changeStatus(v as DossierStatus)}>
                <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SELECTABLE_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Card>

          <Card title="Montants">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Montant du devis (€)</Label>
                <Input type="number" step="0.01" value={devis} onChange={(e) => setDevis(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Remboursement Sécurité Sociale (€)</Label>
                <Input type="number" step="0.01" value={ss} onChange={(e) => setSs(e.target.value)} placeholder="Optionnel" />
              </div>
              <div className="space-y-2">
                <Label>Montant accordé / PEC mutuelle (€)</Label>
                <Input type="number" step="0.01" value={pec} onChange={(e) => setPec(e.target.value)} placeholder="Optionnel" />
              </div>
              <div className="space-y-2">
                <Label>Avoir commercial (€)</Label>
                <Input type="number" step="0.01" value={avoir} onChange={(e) => setAvoir(e.target.value)} placeholder="Optionnel" />
              </div>
              <div className="space-y-2">
                <Label>Reste à charge (€) <span className="text-xs text-muted-foreground">(auto)</span></Label>
                <Input type="number" step="0.01" value={racLive.toFixed(2)} readOnly className="bg-muted/40 font-semibold" />
              </div>
              {racLive > 0 && (
                <div className="space-y-2 sm:col-span-2">
                  <Label>Mode de paiement du reste à charge</Label>
                  <PaymentMethodSelect
                    value={paymentMethod}
                    onChange={(method) => {
                      setPaymentMethod(method);
                      updatePaymentMethodMutation.mutate(method);
                    }}
                    placeholder="Renseigner le mode de paiement"
                    disabled={updatePaymentMethodMutation.isPending}
                  />
                </div>
              )}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Reste à charge = Montant du devis − Remboursement SS − Montant accordé mutuelle.
            </p>
            <Button onClick={saveMontants} disabled={saving} className="mt-4">
              {saving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </Card>


          <Card title="Suivi du dossier" icon={<Receipt className="h-4 w-4" />}>
            <p className="mb-3 text-xs text-muted-foreground">
              Le statut du dossier évolue automatiquement à mesure que vous saisissez les dates ci-dessous. Vous pouvez forcer un statut manuellement dans la carte « Statut » : il sera respecté tant qu'aucun champ plus avancé n'est rempli.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <DateField
                label="Date d'envoi du devis"
                value={d.pec_demande_at}
                onChange={(v) => updateDossier({ pec_demande_at: v }, "Date d'envoi du devis mise à jour")}
              />
              <DateField
                label="Date de réception cotation"
                value={d.cotation_recue_at}
                onChange={(v) => updateDossier({ cotation_recue_at: v }, "Date de cotation mise à jour")}
              />
              <DateField
                label="Date d'accord mutuelle"
                value={d.date_accord}
                onChange={(v) => updateDossier({ date_accord: v }, "Date d'accord mise à jour")}
              />
              <DateField
                label="Date de facturation Cosium"
                value={d.facture_cosium_at}
                onChange={(v) =>
                  updateDossier(
                    {
                      facture_cosium_at: v,
                      facture_cosium: !!v,
                      ...(v ? {} : { transmis_mutuelle: false, transmis_mutuelle_at: null, paiement_recu: false, paiement_recu_at: null }),
                    },
                    "Date de facturation mise à jour",
                  )
                }
              />
              <DateField
                label="Date de transmission à la mutuelle"
                value={d.transmis_mutuelle_at ? new Date(d.transmis_mutuelle_at).toISOString().slice(0, 10) : null}
                onChange={(v) =>
                  updateDossier(
                    {
                      transmis_mutuelle_at: v ? new Date(v).toISOString() : null,
                      transmis_mutuelle: !!v,
                      ...(v && !d.facture_cosium ? { facture_cosium: true, facture_cosium_at: d.facture_cosium_at ?? today } : {}),
                      ...(v ? {} : { paiement_recu: false, paiement_recu_at: null }),
                    },
                    "Date de transmission mise à jour",
                  )
                }
              />
              <DateField
                label="Date de règlement reçu"
                value={d.paiement_recu_at ? new Date(d.paiement_recu_at).toISOString().slice(0, 10) : null}
                onChange={(v) =>
                  updateDossier(
                    {
                      paiement_recu_at: v ? new Date(v).toISOString() : null,
                      paiement_recu: !!v,
                    },
                    v ? "Règlement confirmé" : "Règlement annulé",
                  )
                }
              />
            </div>
            {d.status === "facture" && (
              <div className="mt-3 flex items-center gap-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">
                <AlertOctagon className="h-3.5 w-3.5" />
                <span>À transmettre à la mutuelle</span>
              </div>
            )}
            {d.paiement_recu && (
              <div className="mt-3 flex items-center gap-2 rounded-md border border-green-300 bg-green-50 px-3 py-2 text-xs text-green-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Règlement reçu le {d.paiement_recu_at ? new Date(d.paiement_recu_at).toLocaleDateString("fr-FR") : "—"}</span>
              </div>
            )}
          </Card>


        </div>

        <div className="space-y-5">
          <Card title="Historique" icon={<History className="h-4 w-4" />}>
            <ol className="space-y-3">
              {history.map((h) => (
                <li key={h.id} className="border-l-2 border-primary/30 pl-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {h.old_status && (
                      <>
                        <StatusBadge status={h.old_status} />
                        <span className="text-xs text-muted-foreground">→</span>
                      </>
                    )}
                    <StatusBadge status={h.new_status} />
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {h.profiles?.full_name ?? "Système"} ·{" "}
                    {new Date(h.changed_at).toLocaleString("fr-FR")}
                  </div>
                </li>
              ))}
              {history.length === 0 && (
                <li className="text-sm text-muted-foreground">Aucun historique.</li>
              )}
            </ol>
          </Card>

          <Card title="Ajouter une note" icon={<MessageSquare className="h-4 w-4" />}>
            <div className="space-y-2">
              <Textarea
                placeholder="Laissez un message à votre collègue..."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                rows={3}
              />
              <Button onClick={addNote} disabled={!noteContent.trim()} size="sm">
                Publier
              </Button>
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
}

function TpLink({ mutuelle }: { mutuelle: string }) {
  const platform = getTpPlatform(mutuelle);
  if (!platform) return null;
  const showVia = isDifferentPlatform(mutuelle, platform);
  return (
    <a
      href={platform.url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-md border bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10"
      title={`Ouvrir la plateforme TP ${platform.name}`}
    >
      <ExternalLink className="h-3.5 w-3.5" />
      Plateforme TP{showVia ? ` (via ${platform.name})` : ` ${platform.name}`}
    </a>
  );
}

function Card({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-5">
      <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
        {icon} {title}
      </h2>
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <dl className="grid gap-3 sm:grid-cols-2">{children}</dl>;
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null | undefined;
  onChange: (v: string | null) => void;
}) {
  const v = value ? String(value).slice(0, 10) : "";
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type="date"
        value={v}
        className="h-9"
        onChange={(e) => onChange(e.target.value || null)}
      />
    </div>
  );
}

