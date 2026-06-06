import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DOSSIER_STATUSES, STATUS_LABELS, type DossierStatus } from "@/lib/dossier-status";

export const Route = createFileRoute("/_authenticated/dossiers/new")({
  head: () => ({ meta: [{ title: "Nouveau dossier — Optique Suivi" }] }),
  component: NewDossierPage,
});

function NewDossierPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<DossierStatus>("a_traiter");

  const { data: mutuelles = [] } = useQuery({
    queryKey: ["mutuelles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("mutuelles").select("name").order("name");
      if (error) throw error;
      return data.map((m) => m.name);
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

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();

    const mutuelle = String(fd.get("mutuelle") || "").trim();
    // Ajoute la mutuelle si nouvelle
    if (mutuelle && !mutuelles.includes(mutuelle)) {
      await supabase.from("mutuelles").insert({ name: mutuelle });
    }

    const { data, error } = await supabase
      .from("dossiers")
      .insert({
        client_nom: String(fd.get("client_nom")),
        client_prenom: String(fd.get("client_prenom")),
        telephone: String(fd.get("telephone") || ""),
        mutuelle,
        type_verres: String(fd.get("type_verres") || ""),
        montant_devis: Number(String(fd.get("montant_devis") || "0").replace(",", ".")) || 0,
        remboursement_attendu: fd.get("remboursement_attendu")
          ? Number(String(fd.get("remboursement_attendu")).replace(",", ".")) || null
          : null,
        status,
        created_by: userData.user?.id,
      })
      .select("id")
      .single();
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Dossier créé");
    router.navigate({ to: "/dossiers/$id", params: { id: data.id } });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link to="/dossiers" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Retour à la liste
      </Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nouveau dossier</h1>
        <p className="text-sm text-muted-foreground">Saisir les informations du dossier client</p>
      </div>
      <form onSubmit={submit} className="space-y-5 rounded-xl border bg-card p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Fld name="client_nom" label="Nom" required />
          <Fld name="client_prenom" label="Prénom" required />
          <Fld name="telephone" label="Téléphone" type="tel" />
          <div className="space-y-2">
            <Label htmlFor="mutuelle">Mutuelle</Label>
            <Input id="mutuelle" name="mutuelle" list="mutuelles-list" placeholder="Tapez ou choisissez" />
            <datalist id="mutuelles-list">
              {mutuelles.map((m) => <option key={m} value={m} />)}
            </datalist>
          </div>
          <Fld name="type_verres" label="Type de verres" />
          <Fld name="montant_devis" label="Montant devis (€)" type="number" step="0.01" />
          <Fld name="remboursement_attendu" label="Remboursement attendu (€)" type="number" step="0.01" />
          <div className="space-y-2">
            <Label>Statut initial</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as DossierStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DOSSIER_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Link to="/dossiers"><Button type="button" variant="ghost">Annuler</Button></Link>
          <Button disabled={loading}>{loading ? "Création..." : "Créer le dossier"}</Button>
        </div>
      </form>
    </div>
  );
}

function Fld({
  name, label, type = "text", step, required,
}: { name: string; label: string; type?: string; step?: string; required?: boolean }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}{required && <span className="text-destructive"> *</span>}</Label>
      <Input id={name} name={name} type={type} step={step} required={required} />
    </div>
  );
}
