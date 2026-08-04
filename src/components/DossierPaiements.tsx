import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Plus, Trash2, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PaymentMethodSelect } from "@/components/PaymentMethodSelect";
import { PaymentMethodBadge } from "@/components/PaymentMethodBadge";
import type { PaymentMethod } from "@/lib/payment-methods";
import { toast } from "sonner";

export interface Paiement {
  id: string;
  dossier_id: string;
  part: "client" | "mutuelle";
  montant: number;
  methode: PaymentMethod;
  date_paiement: string;
  note: string;
}

const db = supabase as any;

export function useDossierPaiements(dossierId: string, enabled = true) {
  return useQuery({
    queryKey: ["paiements", dossierId],
    enabled,
    queryFn: async () => {
      const { data, error } = await db
        .from("dossier_paiements")
        .select("*")
        .eq("dossier_id", dossierId)
        .order("date_paiement", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Paiement[];
    },
  });
}

interface Props {
  dossierId: string;
  resteACharge: number;
  montantPec: number;
  enabled?: boolean;
}

export function DossierPaiements({ dossierId, resteACharge, montantPec, enabled = true }: Props) {
  const qc = useQueryClient();
  const { data: paiements = [] } = useDossierPaiements(dossierId, enabled);

  const [open, setOpen] = useState(false);
  const [part, setPart] = useState<"client" | "mutuelle">("client");
  const [montant, setMontant] = useState("");
  const [methode, setMethode] = useState<PaymentMethod | null>("carte_credit");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["paiements", dossierId] });
    qc.invalidateQueries({ queryKey: ["dossier", dossierId] });
    qc.invalidateQueries({ queryKey: ["dossiers"] });
  };

  const addMutation = useMutation({
    mutationFn: async () => {
      const value = Number(montant.replace(",", "."));
      if (!value || value <= 0) throw new Error("Montant invalide");
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await db.from("dossier_paiements").insert({
        dossier_id: dossierId,
        part,
        montant: value,
        methode: methode ?? "autre",
        date_paiement: date,
        note: note.trim(),
        created_by: userData.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Paiement enregistré");
      setMontant("");
      setNote("");
      setOpen(false);
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur lors de l'enregistrement"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (paiementId: string) => {
      const { error } = await db.from("dossier_paiements").delete().eq("id", paiementId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Paiement supprimé");
      invalidate();
    },
    onError: () => toast.error("Erreur lors de la suppression"),
  });

  const sum = (p: "client" | "mutuelle") =>
    paiements.filter((x) => x.part === p).reduce((acc, x) => acc + Number(x.montant || 0), 0);
  const clientPaid = sum("client");
  const mutuellePaid = sum("mutuelle");
  const clientRest = Math.max(0, resteACharge - clientPaid);
  const mutuelleRest = Math.max(0, montantPec - mutuellePaid);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border p-3">
          <div className="text-xs text-muted-foreground">Part client</div>
          <div className="text-lg font-semibold">
            {clientPaid.toFixed(2)} € <span className="text-sm font-normal text-muted-foreground">/ {resteACharge.toFixed(2)} €</span>
          </div>
          <div className={`text-xs ${clientRest > 0 ? "text-amber-600" : "text-emerald-600"}`}>
            {clientRest > 0 ? `Reste ${clientRest.toFixed(2)} €` : "Soldé"}
          </div>
        </div>
        <div className="rounded-lg border p-3">
          <div className="text-xs text-muted-foreground">Part mutuelle</div>
          <div className="text-lg font-semibold">
            {mutuellePaid.toFixed(2)} € <span className="text-sm font-normal text-muted-foreground">/ {montantPec.toFixed(2)} €</span>
          </div>
          <div className={`text-xs ${mutuelleRest > 0 ? "text-amber-600" : "text-emerald-600"}`}>
            {mutuelleRest > 0 ? `Reste ${mutuelleRest.toFixed(2)} €` : "Soldé"}
          </div>
        </div>
      </div>

      {paiements.length > 0 && (
        <ul className="divide-y rounded-lg border">
          {paiements.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{Number(p.montant).toFixed(2)} €</span>
                <PaymentMethodBadge method={p.methode} />
                <span className="text-xs text-muted-foreground">
                  {new Date(p.date_paiement).toLocaleDateString("fr-FR")} · {p.part === "client" ? "Client" : "Mutuelle"}
                </span>
                {p.note && <span className="text-xs italic text-muted-foreground">{p.note}</span>}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteMutation.mutate(p.id)}
                title="Supprimer ce paiement"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {open ? (
        <div className="space-y-3 rounded-lg border p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Part</Label>
              <Select value={part} onValueChange={(v) => setPart(v as "client" | "mutuelle")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="mutuelle">Mutuelle</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Montant (€)</Label>
              <Input
                inputMode="decimal"
                value={montant}
                onChange={(e) => setMontant(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Mode de paiement</Label>
              <PaymentMethodSelect value={methode} onChange={setMethode} required />
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Note (facultatif)</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex : acompte" />
          </div>
          <div className="flex gap-2">
            <Button onClick={() => addMutation.mutate()} disabled={addMutation.isPending}>
              Enregistrer le paiement
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" onClick={() => setOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Ajouter un paiement
        </Button>
      )}

      {paiements.length === 0 && !open && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Wallet className="h-3.5 w-3.5" /> Aucun paiement enregistré — un dossier peut être réglé en plusieurs fois (CB, espèces, chèque, avoir…).
        </p>
      )}
    </div>
  );
}
