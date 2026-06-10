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
  const [typeDossier, setTypeDossier] = useState<"lunettes" | "lentilles" | "autre">("lunettes");

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
    if (mutuelle && !mutuelles.includes(mutuelle)) {
      await supabase.from("mutuelles").insert({ name: mutuelle });
    }

    const typeVerres = String(fd.get("type_verres") || "").trim();
    if (typeVerres && !typesVerres.includes(typeVerres)) {
      await supabase.from("types_verres").insert({ name: typeVerres });
    }

    const parseNum = (v: FormDataEntryValue | null) =>
      v && String(v).trim() !== "" ? Number(String(v).replace(",", ".")) || null : null;

    const { data, error } = await supabase
      .from("dossiers")
      .insert({
        client_nom: String(fd.get("client_nom")),
        client_prenom: String(fd.get("client_prenom")),
        telephone: String(fd.get("telephone") || ""),
        mutuelle,
        type_verres: typeVerres,
        montant_devis: parseNum(fd.get("montant_devis")) ?? 0,
        montant_pec: parseNum(fd.get("montant_pec")),
        type_dossier: typeDossier,
        created_by: userData.user?.id,
      } as any)
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
          <div className="space-y-2">
            <Label htmlFor="type_verres">Type de verres</Label>
            <Input id="type_verres" name="type_verres" list="types-verres-list" placeholder="Tapez ou choisissez" />
            <datalist id="types-verres-list">
              {typesVerres.map((t) => <option key={t} value={t} />)}
            </datalist>
          </div>
          <Fld name="montant_devis" label="Montant du devis (€)" type="number" step="0.01" />
          <Fld name="montant_pec" label="Montant accordé / PEC (€)" type="number" step="0.01" />
          <div className="space-y-2">
            <Label>Type de dossier</Label>
            <Select value={typeDossier} onValueChange={(v) => setTypeDossier(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="lunettes">Lunettes</SelectItem>
                <SelectItem value="lentilles">Lentilles</SelectItem>
                <SelectItem value="autre">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 text-xs text-muted-foreground sm:col-span-1">
            Le statut est défini automatiquement à « À traiter » et évoluera ensuite selon les dates saisies.
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
