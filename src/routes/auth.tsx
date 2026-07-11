import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Glasses } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Connexion — Optique Suivi" }] }),
  component: AuthPage,
});

function AuthPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.navigate({ to: "/", replace: true });
    }).catch((error) => {
      console.error("Failed to check user:", error);
    });
  }, [router]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(fd.get("email")),
      password: String(fd.get("password")),
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Connecté");
    router.navigate({ to: "/", replace: true });
  };

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-background via-accent/30 to-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <Glasses className="h-7 w-7" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Optique Suivi</h1>
            <p className="text-sm text-muted-foreground">
              Gestion des dossiers clients de votre magasin
            </p>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Connexion</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <Field name="email" label="Email" type="email" required />
            <Field name="password" label="Mot de passe" type="password" required />
            <Button className="w-full" disabled={loading}>
              {loading ? "Connexion..." : "Se connecter"}
            </Button>
            <div className="text-center">
              <a
                href="/reset-password"
                className="text-sm text-muted-foreground hover:text-foreground hover:underline"
              >
                Mot de passe oublié ?
              </a>
            </div>
          </form>
          <p className="mt-6 border-t pt-4 text-xs text-muted-foreground">
            L'accès est réservé au personnel autorisé. Les comptes sont créés par la gérante.
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({
  name, label, type = "text", required, minLength,
}: { name: string; label: string; type?: string; required?: boolean; minLength?: number }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} required={required} minLength={minLength} />
    </div>
  );
}
