import { createFileRoute, useRouter, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Glasses } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email"));
    const password = String(fd.get("password"));
    const fullName = String(fd.get("full_name"));
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      setLoading(false);
      return toast.error(error.message);
    }

    if (data.session) {
      setLoading(false);
      toast.success("Compte créé avec succès. Vous êtes maintenant connecté.");
      router.navigate({ to: "/", replace: true });
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      if (signInError.message.toLowerCase().includes("email not confirmed")) {
        return toast.error(
          "Compte créé. Vérifiez votre email pour confirmer votre adresse avant de vous connecter.",
        );
      }

      return toast.error(signInError.message);
    }

    toast.success("Compte créé avec succès. Vous êtes maintenant connecté.");
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
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Connexion</TabsTrigger>
              <TabsTrigger value="signup">Créer un compte</TabsTrigger>
            </TabsList>
            <TabsContent value="login" className="mt-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Pas encore de compte ? Utilisez l'onglet <strong>Créer un compte</strong> ci-dessus.
              </p>
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
            </TabsContent>
            <TabsContent value="signup" className="mt-4">
              <form onSubmit={handleSignup} className="space-y-4">
                <Field name="full_name" label="Nom complet" required />
                <Field name="email" label="Email" type="email" required />
                <Field name="password" label="Mot de passe" type="password" required minLength={6} />
                <Button className="w-full" disabled={loading}>
                  {loading ? "Création..." : "Créer le compte"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
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
