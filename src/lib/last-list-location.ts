const KEY = "optic-house:last-list-location";

export type DossierListSearch = {
  status?: string;
  mutuelle?: string;
  from?: string;
  to?: string;
  q?: string;
  probleme?: string;
};

function isDossierListHref(href: string): boolean {
  try {
    const url = new URL(href, window.location.origin);
    return url.pathname === "/dossiers" || url.pathname === "/dossiers/";
  } catch {
    return false;
  }
}

export function rememberListLocation(href: string) {
  if (!isDossierListHref(href)) return;
  try {
    sessionStorage.setItem(KEY, href);
  } catch {
    /* ignore */
  }
}

export function getListLocation(): string {
  try {
    const v = sessionStorage.getItem(KEY);
    if (v && isDossierListHref(v)) return v;
  } catch {
    /* ignore */
  }
  return "/dossiers";
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
    };
  } catch {
    return {};
  }
}
