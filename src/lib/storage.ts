/** localStorage can throw (private mode, blocked storage), so every access is guarded. */

const PREFIX = "covid-mapper:";

export function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writeStored(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage unavailable: the app still works, it just won't remember.
  }
}

/** Remove keys written by earlier versions of the app (unbounded bookmark/history lists). */
export function clearLegacyKeys(): void {
  try {
    ["bookmarks", "countries", "started"].forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}
