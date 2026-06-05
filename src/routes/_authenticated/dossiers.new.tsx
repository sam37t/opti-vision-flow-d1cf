import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dossiers/new")({
  head: () => ({ meta: [{ title: "Nouveau dossier — Optique Suivi" }] }),
  component: NewDossierPage,
});

function NewDossierPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("dossiers")
      .insert({
        client_nom: String(fd.get("client_nom")),
        client_prenom: String(fd.get("client_prenom")),
        telephone: String(fd.get("telephone")),
        mutuelle: String(fd.get("mutuelle")),
        monture: String(fd.get("monture")),
        type_verres: String(fd.get("type_verres")),
        montant_devis: Number(fd.get("montant_devis") || 0),
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
          <Fld name="mutuelle" label="Mutuelle" />
          <Fld name="monture" label="Monture choisie" />
          <Fld name="type_verres" label="Type de verres" />
          <Fld name="montant_devis" label="Montant devis (€)" type="number" step="0.01" />
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
