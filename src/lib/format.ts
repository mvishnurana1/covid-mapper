import { NumberMode } from "../models/models";

const compact = new Intl.NumberFormat(undefined, {
  notation: "compact",
  maximumFractionDigits: 1,
});

const exact = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 0,
});

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

export function formatNumber(value: number, mode: NumberMode = "exact"): string {
  return mode === "compact" ? compact.format(value) : exact.format(value);
}

export function formatCompact(value: number): string {
  return compact.format(value);
}

export function formatDate(timestamp: number): string {
  return dateFormat.format(new Date(timestamp));
}
