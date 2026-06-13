import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { MessageCircle, Send, FolderOpen, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type MessageRow = {
  id: string;
  sender_id: string;
  recipient_id: string;
  dossier_id: string | null;
  body: string;
  read_at: string | null;
  created_at: string;
};

type ProfileRow = { id: string; full_name: string };
type DossierLite = { id: string; client_nom: string; client_prenom: string };

function formatTime(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function MessagesPanel() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [recipientId, setRecipientId] = useState<string>("");
  const [dossierId, setDossierId] = useState<string>("none");
  const autoOpenedRef = useRef(false);

  const userId = user?.id ?? null;

  const messagesQuery = useQuery({
    queryKey: ["messages", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as MessageRow[];
    },
  });

  const profilesQuery = useQuery({
    queryKey: ["profiles-others", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name");
      if (error) throw error;
      return ((data ?? []) as ProfileRow[]).filter((p) => p.id !== userId);
    },
  });

  const dossiersQuery = useQuery({
    queryKey: ["dossiers-lite"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dossiers")
        .select("id, client_nom, client_prenom")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as DossierLite[];
    },
  });

  const messages = messagesQuery.data ?? [];
  const others = profilesQuery.data ?? [];
  const dossiers = dossiersQuery.data ?? [];

  const unreadCount = useMemo(
    () => messages.filter((m) => m.recipient_id === userId && !m.read_at).length,
    [messages, userId]
  );

  // Default recipient = the other user (single peer case)
  useEffect(() => {
    if (!recipientId && others.length > 0) setRecipientId(others[0].id);
  }, [others, recipientId]);

  // Auto-open once if unread on mount
  useEffect(() => {
    if (!autoOpenedRef.current && unreadCount > 0) {
      autoOpenedRef.current = true;
      setOpen(true);
    }
  }, [unreadCount]);

  // Realtime
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`messages-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => qc.invalidateQueries({ queryKey: ["messages", userId] })
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, qc]);

  // Mark visible received messages as read when panel open
  useEffect(() => {
    if (!open || !userId) return;
    const unreadIds = messages
      .filter((m) => m.recipient_id === userId && !m.read_at)
      .map((m) => m.id);
    if (unreadIds.length === 0) return;
    void supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .in("id", unreadIds)
      .then(({ error }) => {
        if (!error) qc.invalidateQueries({ queryKey: ["messages", userId] });
      });
  }, [open, messages, userId, qc]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!userId || !recipientId) throw new Error("Destinataire manquant");
      const text = body.trim();
      if (!text) throw new Error("Message vide");
      const { error } = await supabase.from("messages").insert({
        sender_id: userId,
        recipient_id: recipientId,
        dossier_id: dossierId === "none" ? null : dossierId,
        body: text,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setBody("");
      setDossierId("none");
      qc.invalidateQueries({ queryKey: ["messages", userId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const dossierMap = useMemo(() => {
    const m = new Map<string, DossierLite>();
    for (const d of dossiers) m.set(d.id, d);
    return m;
  }, [dossiers]);

  const profileMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of others) m.set(p.id, p.full_name);
    return m;
  }, [others]);

  if (!userId) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" title="Messagerie">
          <MessageCircle className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground">
              {unreadCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle>Messagerie interne</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {messagesQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun message pour le moment.</p>
          ) : (
            <ul className="space-y-3">
              {messages.map((m) => {
                const isMine = m.sender_id === userId;
                const senderName = isMine ? "Moi" : profileMap.get(m.sender_id) ?? "Utilisateur";
                const dossier = m.dossier_id ? dossierMap.get(m.dossier_id) : null;
                const unread = m.recipient_id === userId && !m.read_at;
                return (
                  <li
                    key={m.id}
                    className={`rounded-lg border p-3 text-sm ${
                      isMine ? "bg-muted/40" : unread ? "border-accent bg-accent/10" : "bg-card"
                    }`}
                  >
                    <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                      <span className="font-medium text-foreground">{senderName}</span>
                      <span className="text-muted-foreground">{formatTime(m.created_at)}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-foreground">{m.body}</p>
                    {m.dossier_id && (
                      <Link
                        to="/dossiers/$id"
                        params={{ id: m.dossier_id }}
                        onClick={() => setOpen(false)}
                        className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        <FolderOpen className="h-3 w-3" />
                        {dossier ? `${dossier.client_nom} ${dossier.client_prenom}` : "Voir le dossier"}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <form
          className="space-y-2 border-t bg-card/60 px-4 py-3"
          onSubmit={(e) => {
            e.preventDefault();
            sendMutation.mutate();
          }}
        >
          {others.length > 1 && (
            <Select value={recipientId} onValueChange={setRecipientId}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Destinataire" />
              </SelectTrigger>
              <SelectContent>
                {others.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={dossierId} onValueChange={setDossierId}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Dossier lié (optionnel)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Message général</SelectItem>
              {dossiers.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.client_nom} {d.client_prenom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-end gap-2">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={
                others.length === 0
                  ? "Aucun autre utilisateur disponible"
                  : `Message à ${profileMap.get(recipientId) ?? "…"}`
              }
              rows={2}
              maxLength={2000}
              disabled={others.length === 0}
              className="min-h-[60px] resize-none text-sm"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!body.trim() || !recipientId || sendMutation.isPending}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
