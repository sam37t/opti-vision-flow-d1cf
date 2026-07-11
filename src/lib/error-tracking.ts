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
