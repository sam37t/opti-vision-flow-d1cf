import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  KeyRound, Search, Plus, Copy, Check, Eye, EyeOff, ExternalLink, Pencil, Trash2, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/connexions")({
  head: () => ({
    meta: [
      { title: "Connexions mutuelles — Optic House" },
      { name: "description", content: "Identifiants et mots de passe de connexion aux portails des mutuelles, avec accès direct aux sites." },
      { property: "og:title", content: "Connexions mutuelles — Optic House" },
      { property: "og:description", content: "Identifiants et mots de passe de connexion aux portails des mutuelles." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ConnexionsPage,
});

type Credential = {
  id: string;
  mutuelle: string;
  site_url: string;
  username: string;
  password: string;
  contact: string;
  notes: string;
};

type FormState = Omit<Credential, "id"> & { id?: string };

const EMPTY: FormState = { mutuelle: "", site_url: "", username: "", password: "", contact: "", notes: "" };

function normalizeUrl(url: string) {
  const u = url.trim();
  if (!u) return "";
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
}

function ConnexionsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<FormState | null>(null);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["mutuelle-credentials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mutuelle_credentials")
        .select("id, mutuelle, site_url, username, password, contact, notes")
        .order("mutuelle");
      if (error) throw error;
      return (data ?? []) as Credential[];
    },
  });

  const save = useMutation({
    mutationFn: async (payload: FormState) => {
      const values = {
        mutuelle: payload.mutuelle.trim(),
        site_url: payload.site_url.trim(),
        username: payload.username.trim(),
        password: payload.password,
        contact: payload.contact.trim(),
        notes: payload.notes.trim(),
      };
      if (payload.id) {
        const { error } = await supabase.from("mutuelle_credentials").update(values).eq("id", payload.id);
        if (error) throw error;
      } else {
        const { data: u } = await supabase.auth.getUser();
        const { error } = await supabase
          .from("mutuelle_credentials")
          .insert({ ...values, created_by: u.user?.id ?? null });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mutuelle-credentials"] });
      setForm(null);
      toast.success("Accès enregistré");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("mutuelle_credentials").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mutuelle-credentials"] });
      toast.success("Accès supprimé");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.mutuelle, r.username, r.site_url, r.contact, r.notes].join(" ").toLowerCase().includes(q),
    );
  }, [rows, search]);

  const copy = async (key: string, value: string, label: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const el = document.createElement("textarea");
      el.value = value;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      el.remove();
    }
    setCopied(key);
    toast.success(`${label} copié`);
    setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <KeyRound className="h-6 w-6 text-primary" /> Connexions mutuelles
          </h1>
          <p className="text-sm text-muted-foreground">
            Identifiants des portails mutuelles — visibles uniquement par l'équipe connectée.
          </p>
        </div>
        <Button className="gap-1.5" onClick={() => setForm({ ...EMPTY })}>
          <Plus className="h-4 w-4" /> Nouvel accès
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher une mutuelle, un identifiant…"
          className="pl-9"
        />
      </div>

      {form && (
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium">{form.id ? "Modifier l'accès" : "Nouvel accès"}</h2>
            <Button variant="ghost" size="icon" onClick={() => setForm(null)} aria-label="Fermer">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Mutuelle *">
              <Input value={form.mutuelle} onChange={(e) => setForm({ ...form, mutuelle: e.target.value })} />
            </Field>
            <Field label="Site de connexion">
              <Input
                value={form.site_url}
                placeholder="portail.mutuelle.fr"
                onChange={(e) => setForm({ ...form, site_url: e.target.value })}
              />
            </Field>
            <Field label="Identifiant">
              <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            </Field>
            <Field label="Mot de passe">
              <Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </Field>
            <Field label="Contact (tél. / email)">
              <Input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
            </Field>
            <Field label="Notes">
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
          </div>
          <div className="mt-4 flex gap-2">
            <Button
              disabled={!form.mutuelle.trim() || save.isPending}
              onClick={() => save.mutate(form)}
            >
              Enregistrer
            </Button>
            <Button variant="outline" onClick={() => setForm(null)}>Annuler</Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          Aucun accès enregistré{search ? " pour cette recherche" : ""}.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((r) => {
            const url = normalizeUrl(r.site_url);
            const show = !!revealed[r.id];
            return (
              <div key={r.id} className="flex flex-col rounded-lg border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold">{r.mutuelle}</h3>
                    {url && (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" /> Se connecter au site
                      </a>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setForm({ ...r })} title="Modifier">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Supprimer"
                      onClick={() => {
                        if (confirm(`Supprimer l'accès « ${r.mutuelle} » ?`)) remove.mutate(r.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  <CopyRow
                    label="Identifiant"
                    value={r.username}
                    copied={copied === `${r.id}-u`}
                    onCopy={() => copy(`${r.id}-u`, r.username, "Identifiant")}
                  />
                  <CopyRow
                    label="Mot de passe"
                    value={show ? r.password : r.password ? "••••••••" : ""}
                    mono
                    copied={copied === `${r.id}-p`}
                    onCopy={() => copy(`${r.id}-p`, r.password, "Mot de passe")}
                    extra={
                      r.password ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title={show ? "Masquer" : "Afficher"}
                          onClick={() => setRevealed((s) => ({ ...s, [r.id]: !show }))}
                        >
                          {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </Button>
                      ) : null
                    }
                  />
                  {r.contact && <p className="text-xs text-muted-foreground">Contact : {r.contact}</p>}
                  {r.notes && <p className="text-xs text-muted-foreground">{r.notes}</p>}
                </div>

                {url && (
                  <a href={url} target="_blank" rel="noopener noreferrer" className="mt-3">
                    <Button variant="outline" size="sm" className="w-full gap-1.5">
                      <ExternalLink className="h-3.5 w-3.5" /> Ouvrir le portail
                    </Button>
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function CopyRow({
  label, value, onCopy, copied, mono, extra,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  copied: boolean;
  mono?: boolean;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-2.5 py-1.5">
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className={`truncate text-sm ${mono ? "font-mono" : ""}`}>{value || "—"}</div>
      </div>
      {extra}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        disabled={!value}
        title={`Copier ${label.toLowerCase()}`}
        onClick={onCopy}
      >
        {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}
