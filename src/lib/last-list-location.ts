const KEY = "optic-house:last-list-location";

export type DossierListSearch = {
  status?: string;
  mutuelle?: string;
  from?: string;
  to?: string;
  q?: string;
  probleme?: string;
  appeler?: string;
};

function pathOf(href: string): string | null {
  try {
    return new URL(href, window.location.origin).pathname;
  } catch {
    return null;
  }
}

function isListHref(href: string): boolean {
  const p = pathOf(href);
  return p === "/dossiers" || p === "/dossiers/" || p === "/";
}

export function rememberListLocation(href: string) {
  if (!isListHref(href)) return;
  try {
    sessionStorage.setItem(KEY, href);
  } catch {
    /* ignore */
  }
}

export function forgetListLocation() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function getListLocation(): string {
  try {
    const v = sessionStorage.getItem(KEY);
    if (v && isListHref(v)) return v;
  } catch {
    /* ignore */
  }
  return "/dossiers";
}

/** true si la dernière liste consultée est la recherche de l'Accueil */
export function isHomeListLocation(): boolean {
  return pathOf(getListLocation()) === "/";
}

export function getListSearch(): DossierListSearch {
  const href = getListLocation();
  try {
    const params = new URL(href, window.location.origin).searchParams;
    const value = (key: keyof DossierListSearch) => params.get(key) || undefined;
    return {
      status: value("status"),
      mutuelle: value("mutuelle"),
      from: value("from"),
      to: value("to"),
      q: value("q"),
      probleme: value("probleme"),
      appeler: value("appeler")?.replace(/["']/g, ""),
    };
  } catch {
    return {};
  }
}
