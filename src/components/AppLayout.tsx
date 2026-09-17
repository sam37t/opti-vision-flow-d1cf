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
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5 font-semibold text-foreground" aria-label="Optic House">
            <img src={logoAsset.url} alt="Optic House" className="h-11 w-11 rounded-md object-cover ring-1 ring-accent/50" />
            <span className="hidden text-base font-semibold tracking-wide sm:inline">OPTIC HOUSE</span>
          </Link>



          <nav className="hidden min-w-0 items-center gap-1 2xl:flex">
            <NavLink to="/" icon={<LayoutDashboard className="h-4 w-4" />}>Accueil</NavLink>
            <NavLink to="/dossiers" icon={<FolderKanban className="h-4 w-4" />}>Dossiers</NavLink>
            <NavLink to="/dossiers" search={{ appeler: "1" }} icon={<PhoneCall className="h-4 w-4" />}>Appeler Mutuelle</NavLink>
            <NavLink to="/factures" icon={<Receipt className="h-4 w-4" />}>Factures</NavLink>
            <NavLink to="/dossiers/archives" icon={<Archive className="h-4 w-4" />}>Archives</NavLink>
            <NavLink to="/connexions" icon={<KeyRound className="h-4 w-4" />}>Connexion</NavLink>
            <NavLink to="/parametres" icon={<Settings className="h-4 w-4" />}>Paramètres</NavLink>
          </nav>
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Link to="/dossiers/new">
              <Button size="sm" className="gap-1.5 whitespace-nowrap">
                <Plus className="h-4 w-4" /> Nouveau dossier
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
        <nav className="flex gap-1 overflow-x-auto border-t px-4 py-2 2xl:hidden">
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
      className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground [&.active]:bg-accent [&.active]:text-accent-foreground"
    >
      {icon}
      {children}
    </Link>
  );
}
