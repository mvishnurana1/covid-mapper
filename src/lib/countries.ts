import { ICovidResponse } from "../models/models";

/** disease.sh uses short names for some countries; show and search the full names too. */
const FULL_NAMES: Record<string, string> = {
  USA: "United States",
  UK: "United Kingdom",
  UAE: "United Arab Emirates",
  "S. Korea": "South Korea",
  DRC: "Democratic Republic of the Congo",
  CAR: "Central African Republic",
  "Lao People's Democratic Republic": "Laos",
  "Libyan Arab Jamahiriya": "Libya",
  "Syrian Arab Republic": "Syria",
  "Saint Vincent and the Grenadines": "St. Vincent and the Grenadines",
};

export function displayName(record: ICovidResponse): string {
  return FULL_NAMES[record.country] ?? record.country;
}

function normalise(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** Search by name, short name or ISO code. Names that start with the query rank first. */
export function searchCountries(records: ICovidResponse[], query: string, limit = 8): ICovidResponse[] {
  const q = normalise(query);
  if (!q) return [];

  const scored: { record: ICovidResponse; score: number }[] = [];
  for (const record of records) {
    const names = [displayName(record), record.country].map(normalise);
    const codes = [record.countryInfo.iso2, record.countryInfo.iso3]
      .filter(Boolean)
      .map((c) => normalise(c as string));

    let score = -1;
    if (codes.includes(q)) score = 0;
    else if (names.some((n) => n.startsWith(q))) score = 1;
    else if (names.some((n) => n.split(/[\s.-]+/).some((w) => w.startsWith(q)))) score = 2;
    else if (names.some((n) => n.includes(q))) score = 3;

    if (score >= 0) scored.push({ record, score });
  }

  return scored
    .sort((a, b) => a.score - b.score || displayName(a.record).localeCompare(displayName(b.record)))
    .slice(0, limit)
    .map((s) => s.record);
}
