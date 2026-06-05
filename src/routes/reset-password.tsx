import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Glasses } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Réinitialiser le mot de passe — Optique Suivi" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase auto-traite le token dans l'URL (hash) et crée une session de recovery
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password"));
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Mot de passe mis à jour. Vous êtes connecté.");
    router.navigate({ to: "/", replace: true });
  };

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-background via-accent/30 to-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <Glasses className="h-7 w-7" />
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">Nouveau mot de passe</h1>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          {!ready ? (
            <p className="text-sm text-muted-foreground">
              Lien invalide ou expiré. Demandez un nouveau lien depuis la page de connexion.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nouveau mot de passe</Label>
                <Input id="password" name="password" type="password" required minLength={6} />
              </div>
              <Button className="w-full" disabled={loading}>
                {loading ? "Mise à jour..." : "Mettre à jour"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
