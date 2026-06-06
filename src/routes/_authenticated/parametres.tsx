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
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-2xl font-semibold tracking-tight">Paramètres</h1>
      </div>

      <ManagedList
        title="Mutuelles"
        description="Gérez la liste des mutuelles proposées dans les formulaires."
        table="mutuelles"
        queryKeys={[["mutuelles-list"], ["mutuelles"]]}
        placeholder="Nom de la mutuelle"
        addedLabel="Mutuelle ajoutée"
        confirmDelete="Supprimer cette mutuelle ?"
      />

      <ManagedList
        title="Types de verres"
        description="Gérez la liste des types de verres proposés dans les formulaires."
        table="types_verres"
        queryKeys={[["types-verres-list"], ["types_verres"]]}
        placeholder="Nom du type de verres"
        addedLabel="Type de verres ajouté"
        confirmDelete="Supprimer ce type de verres ?"
      />
    </div>
  );
}

function ManagedList({
  title, description, table, queryKeys, placeholder, addedLabel, confirmDelete,
}: {
  title: string;
  description: string;
  table: "mutuelles" | "types_verres";
  queryKeys: string[][];
  placeholder: string;
  addedLabel: string;
  confirmDelete: string;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState("");

  const { data: items = [], isLoading } = useQuery({
    queryKey: queryKeys[0],
    queryFn: async () => {
      const { data, error } = await supabase.from(table).select("*").order("name");
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
  });

  const invalidateAll = () => queryKeys.forEach((k) => qc.invalidateQueries({ queryKey: k }));

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    const { error } = await supabase.from(table).insert({ name: n });
    if (error) toast.error(error.message);
    else {
      toast.success(addedLabel);
      setName("");
      invalidateAll();
    }
  };

  const remove = async (id: string) => {
    if (!confirm(confirmDelete)) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) toast.error(error.message);
    else invalidateAll();
  };

  return (
    <section className="rounded-xl border bg-card p-5">
      <h2 className="mb-1 text-base font-semibold">{title}</h2>
      <p className="mb-4 text-sm text-muted-foreground">{description}</p>

      <form onSubmit={add} className="mb-4 flex gap-2">
        <Input placeholder={placeholder} value={name} onChange={(e) => setName(e.target.value)} />
        <Button type="submit" className="gap-1.5"><Plus className="h-4 w-4" /> Ajouter</Button>
      </form>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun élément enregistré.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {items.map((m) => (
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
  );
}
