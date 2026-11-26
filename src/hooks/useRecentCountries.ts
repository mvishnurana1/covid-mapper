import { useCallback, useState } from "react";
import { readStored, writeStored } from "../lib/storage";

const KEY = "recent";
const MAX = 5;

/** Most-recent-first list of disease.sh country names, without duplicates. */
export function useRecentCountries() {
  const [recent, setRecent] = useState<string[]>(() => {
    const stored = readStored<unknown>(KEY, []);
    return Array.isArray(stored) ? stored.filter((s) => typeof s === "string").slice(0, MAX) : [];
  });

  const add = useCallback((country: string) => {
    setRecent((prev) => {
      const next = [country, ...prev.filter((c) => c !== country)].slice(0, MAX);
      writeStored(KEY, next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setRecent([]);
    writeStored(KEY, []);
  }, []);

  return { recent, add, clear };
}
