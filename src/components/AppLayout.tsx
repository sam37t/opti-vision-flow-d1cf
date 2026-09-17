import { Link, useRouter } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { LayoutDashboard, FolderKanban, LogOut, Plus, Settings, Receipt, Archive, KeyRound, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoAsset from "@/assets/optic-house-logo.jpg.asset.json";
import { MessagesPanel } from "@/components/MessagesPanel";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { fullName, role } = useAuth();

  const signOut = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 sm:px-6">
          <Link to="/" className="flex min-w-0 items-center gap-2.5 font-semibold text-foreground" aria-label="Optic House">
            <img src={logoAsset.url} alt="Optic House" className="h-10 w-10 shrink-0 rounded-md object-cover ring-1 ring-accent/50" />
            <span className="truncate text-base font-semibold tracking-wide">OPTIC HOUSE</span>
          </Link>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Link to="/dossiers/new">
              <Button size="sm" className="gap-1.5 whitespace-nowrap px-2.5 sm:px-3">
                <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Nouveau dossier</span>
              </Button>
            </Link>
            <div className="hidden text-right text-sm leading-tight sm:block">
              <div className="font-medium text-foreground">{fullName}</div>
              <div className="text-xs capitalize text-muted-foreground">{role}</div>
            </div>
            <MessagesPanel />
            <Button variant="ghost" size="icon" onClick={signOut} title="Déconnexion">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto border-t px-3 py-2 sm:px-6">
          <NavLink to="/" icon={<LayoutDashboard className="h-4 w-4" />}>Accueil</NavLink>
          <NavLink to="/dossiers" icon={<FolderKanban className="h-4 w-4" />}>Dossiers</NavLink>
          <NavLink to="/dossiers" search={{ appeler: "1" }} icon={<PhoneCall className="h-4 w-4" />}>Appeler Mutuelle</NavLink>
          <NavLink to="/factures" icon={<Receipt className="h-4 w-4" />}>Factures</NavLink>
          <NavLink to="/dossiers/archives" icon={<Archive className="h-4 w-4" />}>Archives</NavLink>
          <NavLink to="/connexions" icon={<KeyRound className="h-4 w-4" />}>Connexion</NavLink>
          <NavLink to="/parametres" icon={<Settings className="h-4 w-4" />}>Paramètres</NavLink>
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}

function NavLink({ to, search, icon, children }: { to: string; search?: Record<string, string | undefined>; icon: ReactNode; children: ReactNode }) {
  return (
    <Link
      to={to}
      search={search}
      activeOptions={{ exact: to === "/" }}
      className="flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground sm:px-3 [&.active]:bg-accent [&.active]:text-accent-foreground"
    >
      <span className="shrink-0">{icon}</span>
      <span className="whitespace-nowrap">{children}</span>
    </Link>
  );
}
