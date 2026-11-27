import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { LoaderCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SELECTABLE_STATUSES, STATUS_LABELS, type DossierStatus } from "@/lib/dossier-status";
import { analyzeDossierDelays } from "@/lib/dossier-analysis.functions";

export default function DossierAnalysis({ mutuelles, initialStatus, initialMutuelle, onClose }: {
  mutuelles: string[]; initialStatus: string | undefined; initialMutuelle: string | undefined; onClose: () => void;
}) {
  const [status, setStatus] = useState<DossierStatus | undefined>(SELECTABLE_STATUSES.find((s) => s === initialStatus));
  const [mutuelle, setMutuelle] = useState(initialMutuelle ?? "");
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Awaited<ReturnType<typeof analyzeDossierDelays>> | null>(null);
  const analyze = useServerFn(analyzeDossierDelays);
  async function generate() {
    if (!status || !mutuelle || busy.current) return;
    busy.current = true; setPending(true); setError(null); setResult(null);
    try { setResult(await analyze({ data: { status, mutuelle } })); }
    catch { setError("Impossible de lancer l’analyse. Vos dossiers sont inchangés."); }
    finally { busy.current = false; setPending(false); }
  }
  return (
    <Dialog open onOpenChange={(open) => { if (!open && !busy.current) onClose(); }}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> Analyse des retards</DialogTitle>
          <DialogDescription>Essai · Chaque analyse consomme des crédits IA. Aucun dossier ne sera modifié.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1"><label className="text-sm">Statut</label>
            <Select value={status ?? ""} disabled={pending} onValueChange={(value) => { setStatus(SELECTABLE_STATUSES.find((s) => s === value)); setResult(null); }}>
              <SelectTrigger aria-label="Statut à analyser"><SelectValue placeholder="Choisir un statut" /></SelectTrigger>
              <SelectContent>{SELECTABLE_STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><label className="text-sm">Mutuelle</label>
            <Select value={mutuelle} disabled={pending} onValueChange={(value) => { setMutuelle(value); setResult(null); }}>
              <SelectTrigger aria-label="Mutuelle à analyser"><SelectValue placeholder="Choisir une mutuelle" /></SelectTrigger>
              <SelectContent>{mutuelles.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={generate} disabled={!status || !mutuelle || pending} className="gap-2">
          {pending ? <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <Sparkles className="h-4 w-4" />}
          {pending ? "Analyse en cours…" : "Générer le résumé"}
        </Button>
        {(error || result?.error) && <p role="alert" className="text-sm text-destructive">{error || result?.error}</p>}
        {result && <div className="space-y-4" aria-live="polite">
          <div className="grid grid-cols-3 gap-2 border-y py-3 text-center">
            <div><strong className="block text-xl tabular-nums">{result.stats.total}</strong><span className="text-xs text-muted-foreground">Dossiers</span></div>
            <div><strong className="block text-xl tabular-nums">{result.stats.overdue}</strong><span className="text-xs text-muted-foreground">En attente ≥ 4 j</span></div>
            <div><strong className="block text-xl tabular-nums">{result.stats.maxDays} j</strong><span className="text-xs text-muted-foreground">Attente maximale</span></div>
          </div>
          {result.report && <>
            <p className="text-sm leading-relaxed">{result.report.summary}</p>
            <div><h3 className="mb-2 text-sm font-semibold">Points à retenir</h3><ul className="list-disc space-y-1 pl-5 text-sm">{result.report.observations.map((text, index) => <li key={index}>{text}</li>)}</ul></div>
            <div><h3 className="mb-2 text-sm font-semibold">Priorités suggérées</h3><ol className="list-decimal space-y-1 pl-5 text-sm">{result.report.actions.map((text, index) => <li key={index}>{text}</li>)}</ol></div>
            <p className="border-t pt-3 text-xs text-muted-foreground">{result.report.limitation}</p>
          </>}
          <p className="text-xs text-muted-foreground">Analyse du {new Date(result.generatedAt).toLocaleString("fr-FR")} · À vérifier avant toute décision.</p>
        </div>}
      </DialogContent>
    </Dialog>
  );
}