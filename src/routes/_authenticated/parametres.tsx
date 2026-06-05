import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Settings, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/parametres")({
  head: () => ({ meta: [{ title: "Paramètres — Optique Suivi" }] }),
  component: Parametres,
});

function Parametres() {
  const qc = useQueryClient();
  const [name, setName] = useState("");

  const { data: mutuelles = [], isLoading } = useQuery({
    queryKey: ["mutuelles-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("mutuelles").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    const { error } = await supabase.from("mutuelles").insert({ name: n });
    if (error) toast.error(error.message);
    else {
      toast.success("Mutuelle ajoutée");
      setName("");
      qc.invalidateQueries({ queryKey: ["mutuelles-list"] });
      qc.invalidateQueries({ queryKey: ["mutuelles"] });
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer cette mutuelle ?")) return;
    const { error } = await supabase.from("mutuelles").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      qc.invalidateQueries({ queryKey: ["mutuelles-list"] });
      qc.invalidateQueries({ queryKey: ["mutuelles"] });
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-2xl font-semibold tracking-tight">Paramètres</h1>
      </div>

      <section className="rounded-xl border bg-card p-5">
        <h2 className="mb-1 text-base font-semibold">Mutuelles</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Gérez la liste des mutuelles proposées dans les formulaires.
        </p>

        <form onSubmit={add} className="mb-4 flex gap-2">
          <Input placeholder="Nom de la mutuelle" value={name} onChange={(e) => setName(e.target.value)} />
          <Button type="submit" className="gap-1.5"><Plus className="h-4 w-4" /> Ajouter</Button>
        </form>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement...</p>
        ) : mutuelles.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune mutuelle enregistrée.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {mutuelles.map((m) => (
              <li key={m.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <span>{m.name}</span>
                <Button variant="ghost" size="icon" onClick={() => remove(m.id)} title="Supprimer">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
