import { useCallback, useEffect, useMemo, useState } from "react";
import { ICovidResponse } from "../models/models";

const ENDPOINT = "https://disease.sh/v3/covid-19/countries";

export type LoadStatus = "loading" | "ready" | "error";

export interface CovidData {
  status: LoadStatus;
  records: ICovidResponse[];
  /** Lookup by ISO 3166-1 numeric code (matches the map's country shapes). */
  byIsoNumeric: Map<number, ICovidResponse>;
  byName: Map<string, ICovidResponse>;
  retry: () => void;
}

/** Loads every country in one request, so clicking a country needs no network round trip. */
export function useCovidData(): CovidData {
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [records, setRecords] = useState<ICovidResponse[]>([]);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");

    fetch(ENDPOINT, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`disease.sh responded ${res.status}`);
        return res.json() as Promise<ICovidResponse[]>;
      })
      .then((data) => {
        if (!Array.isArray(data)) throw new Error("Unexpected response from disease.sh");
        setRecords(data);
        setStatus("ready");
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        console.error("Failed to load COVID-19 data", err);
        setStatus("error");
      });

    return () => controller.abort();
  }, [attempt]);

  const byIsoNumeric = useMemo(() => {
    const map = new Map<number, ICovidResponse>();
    records.forEach((r) => {
      if (r.countryInfo?._id != null) map.set(r.countryInfo._id, r);
    });
    return map;
  }, [records]);

  const byName = useMemo(() => {
    const map = new Map<string, ICovidResponse>();
    records.forEach((r) => map.set(r.country.toLowerCase(), r));
    return map;
  }, [records]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  return { status, records, byIsoNumeric, byName, retry };
}
