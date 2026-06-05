import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { ArrowLeft, Phone, History, MessageSquare, Trash2 } from "lucide-react";
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
import { DOSSIER_STATUSES, STATUS_LABELS, type DossierStatus } from "@/lib/dossier-status";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dossiers/$id")({
  head: () => ({ meta: [{ title: "Détail dossier — Optique Suivi" }] }),
  component: DossierDetail,
});

function DossierDetail() {
  const { id } = Route.useParams();
  const router = useRouter();
  const qc = useQueryClient();
  const { user, role } = useAuth();

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
        .select("*, profiles!dossier_history_changed_by_profile_fkey(full_name)")
        .eq("dossier_id", id)
        .order("changed_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: notes = [] } = useQuery({
    queryKey: ["notes", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dossier_notes")
        .select("*, profiles!dossier_notes_author_profile_fkey(full_name)")
        .eq("dossier_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  // Realtime
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

  const [saving, setSaving] = useState(false);
  const [pec, setPec] = useState("");
  const [rac, setRac] = useState("");
  const [noteContent, setNoteContent] = useState("");

  useEffect(() => {
    if (dossier) {
      setPec(dossier.montant_pec?.toString() ?? "");
      setRac(dossier.reste_a_charge?.toString() ?? "");
    }
  }, [dossier]);

  if (isLoading || !dossier) return <p className="text-sm text-muted-foreground">Chargement...</p>;

  const changeStatus = async (newStatus: DossierStatus) => {
    const { error } = await supabase.from("dossiers").update({ status: newStatus }).eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Statut mis à jour");
  };

  const saveMontants = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("dossiers")
      .update({
        montant_pec: pec === "" ? null : Number(pec),
        reste_a_charge: rac === "" ? null : Number(rac),
      })
      .eq("id", id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Montants enregistrés");
  };

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

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {dossier.client_nom.toUpperCase()} {dossier.client_prenom}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {dossier.telephone && (
              <span className="inline-flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" /> {dossier.telephone}
              </span>
            )}
            <span>Créé le {new Date(dossier.created_at).toLocaleDateString("fr-FR")}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={dossier.status} />
          {role === "gerante" && (
            <Button variant="ghost" size="icon" onClick={deleteDossier} title="Supprimer">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card title="Informations">
            <Grid>
              <Info label="Mutuelle" value={dossier.mutuelle || "—"} />
              <Info label="Monture" value={dossier.monture || "—"} />
              <Info label="Type de verres" value={dossier.type_verres || "—"} />
              <Info label="Montant devis" value={`${Number(dossier.montant_devis).toFixed(2)} €`} />
            </Grid>
          </Card>

          <Card title="Statut">
            <div className="space-y-2">
              <Label>Changer le statut</Label>
              <Select value={dossier.status} onValueChange={(v) => changeStatus(v as DossierStatus)}>
                <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOSSIER_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Card>

          <Card title="Prise en charge mutuelle">
            {role === "gerante" ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Montant PEC (€)</Label>
                    <Input type="number" step="0.01" value={pec} onChange={(e) => setPec(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Reste à charge (€)</Label>
                    <Input type="number" step="0.01" value={rac} onChange={(e) => setRac(e.target.value)} />
                  </div>
                </div>
                <Button onClick={saveMontants} disabled={saving} className="mt-4">
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </Button>
              </>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <Info label="Montant PEC" value={dossier.montant_pec != null ? `${Number(dossier.montant_pec).toFixed(2)} €` : "—"} />
                <Info label="Reste à charge" value={dossier.reste_a_charge != null ? `${Number(dossier.reste_a_charge).toFixed(2)} €` : "—"} />
              </div>
            )}
          </Card>

          <Card title="Notes internes" icon={<MessageSquare className="h-4 w-4" />}>
            <div className="space-y-3">
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
              <ul className="divide-y">
                {notes.map((n) => (
                  <li key={n.id} className="group flex items-start justify-between gap-3 py-3">
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
                {notes.length === 0 && (
                  <li className="py-3 text-sm text-muted-foreground">Aucune note pour le moment.</li>
                )}
              </ul>
            </div>
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
        </div>
      </div>
    </div>
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
