import { ICovidResponse, MetricKey } from "../models/models";

export interface MetricDefinition {
  key: MetricKey;
  label: string;
  shortLabel: string;
}

/** Per-million metrics only: raw totals on a choropleth just show which countries are big. */
export const METRICS: MetricDefinition[] = [
  { key: "casesPerOneMillion", label: "Cases per million people", shortLabel: "Cases" },
  { key: "deathsPerOneMillion", label: "Deaths per million people", shortLabel: "Deaths" },
  { key: "testsPerOneMillion", label: "Tests per million people", shortLabel: "Tests" },
];

export function getMetric(key: MetricKey): MetricDefinition {
  return METRICS.find((m) => m.key === key) ?? METRICS[0];
}

/** Single-hue sequential ramp, light (low) to dark (high). */
export const RAMP = [
  "#fee5d9",
  "#fcbba1",
  "#fc9272",
  "#fb6a4a",
  "#ef3b2c",
  "#cb181d",
  "#99000d",
];

export const NO_DATA_COLOR = "#d4d6db";

/** Round to two significant figures so legend labels read cleanly. */
function nice(value: number): number {
  if (value <= 0) return 0;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)) - 1);
  return Math.round(value / magnitude) * magnitude;
}

/**
 * Quantile class breaks for a metric. Returns up to RAMP.length - 1 ascending
 * thresholds; a value v falls in class i where breaks[i - 1] <= v < breaks[i].
 */
export function computeBreaks(records: ICovidResponse[], key: MetricKey): number[] {
  const values = records
    .map((r) => r[key])
    .filter((v) => typeof v === "number" && v > 0)
    .sort((a, b) => a - b);

  if (values.length === 0) return [];

  const breaks: number[] = [];
  for (let i = 1; i < RAMP.length; i++) {
    const q = values[Math.floor((i / RAMP.length) * values.length)];
    const b = nice(q);
    if (b > 0 && (breaks.length === 0 || b > breaks[breaks.length - 1])) {
      breaks.push(b);
    }
  }
  return breaks;
}

/** Colours for `classCount` classes, spread evenly across the ramp. */
export function rampFor(classCount: number): string[] {
  if (classCount >= RAMP.length) return RAMP;
  if (classCount <= 1) return [RAMP[Math.floor(RAMP.length / 2)]];
  return Array.from({ length: classCount }, (_, i) =>
    RAMP[Math.round((i * (RAMP.length - 1)) / (classCount - 1))]
  );
}

/** A metric value of 0 means "not reported", so it is treated as missing. */
export function metricValue(record: ICovidResponse | undefined, key: MetricKey): number | null {
  if (!record) return null;
  const v = record[key];
  return typeof v === "number" && v > 0 ? v : null;
}
