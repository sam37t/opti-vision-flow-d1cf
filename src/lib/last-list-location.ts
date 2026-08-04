const KEY = "optic-house:last-list-location";

export function rememberListLocation(href: string) {
  try {
    sessionStorage.setItem(KEY, href);
  } catch {
    /* ignore */
  }
}

export function getListLocation(): string {
  try {
    const v = sessionStorage.getItem(KEY);
    if (v && v.startsWith("/dossiers")) return v;
  } catch {
    /* ignore */
  }
  return "/dossiers";
}
