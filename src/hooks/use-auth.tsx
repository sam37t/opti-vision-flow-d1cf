import { useEffect, useState, useCallback } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "gerante" | "employe";

export interface AuthState {
  user: User | null;
  role: AppRole | null;
  fullName: string | null;
  loading: boolean;
}

export function useAuth(): AuthState & { refresh: () => Promise<void> } {
  const [state, setState] = useState<AuthState>({
    user: null,
    role: null,
    fullName: null,
    loading: true,
  });

  const loadExtras = useCallback(async (user: User | null) => {
    if (!user) {
      setState({ user: null, role: null, fullName: null, loading: false });
      return;
    }
    const [{ data: roleRow }, { data: profile }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle(),
      supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    ]);
    setState({
      user,
      role: (roleRow?.role as AppRole) ?? "employe",
      fullName: profile?.full_name ?? user.email ?? null,
      loading: false,
    });
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      void loadExtras(session?.user ?? null);
    });
    supabase.auth.getSession().then(({ data }) => loadExtras(data.session?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, [loadExtras]);

  return { ...state, refresh: () => loadExtras(state.user) };
}
