import * as Sentry from "@sentry/react";

let initialized = false;

export function initSentry() {
  if (initialized || typeof window === "undefined") return;
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
  });
  initialized = true;

  window.addEventListener("unhandledrejection", (e) => {
    captureError(e.reason, { source: "unhandledrejection" });
  });
  window.addEventListener("error", (e) => {
    captureError(e.error ?? e.message, { source: "window.onerror" });
  });

  // Identify the current user for Sentry (Supabase auth)
  void import("@/integrations/supabase/client").then(({ supabase }) => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser({ id: data.user.id, email: data.user.email });
    });
    supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email } : null);
    });
  }).catch(() => {});
}

export function reportSupabaseError(
  where: string,
  error: { message?: string; code?: string; details?: string } | null | undefined,
  extra: Record<string, unknown> = {},
) {
  if (!error) return;
  captureError(new Error(`[supabase:${where}] ${error.message ?? "unknown error"}`), {
    where,
    code: error.code,
    details: error.details,
    ...extra,
  });
}

export function captureError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  // Sentry
  try {
    Sentry.captureException(error, { extra: context });
  } catch {
    /* ignore */
  }
  // Lovable's built-in reporter (already used elsewhere)
  try {
    window.__lovableEvents?.captureException?.(
      error,
      { route: window.location.pathname, ...context },
      { mechanism: "react_error_boundary", handled: false, severity: "error" },
    );
  } catch {
    /* ignore */
  }
  // Console for local dev
  console.error("[captureError]", error, context);
}

export function setUser(user: { id: string; email?: string | null } | null) {
  if (!initialized) return;
  if (user) Sentry.setUser({ id: user.id, email: user.email ?? undefined });
  else Sentry.setUser(null);
}
