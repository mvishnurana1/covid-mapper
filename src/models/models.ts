export interface ICountryInfo {
  /** ISO 3166-1 numeric code. Null for entries that aren't countries (e.g. cruise ships). */
  _id: number | null;
  iso2: string | null;
  iso3: string | null;
  lat: number;
  long: number;
  flag: string;
}

export interface ICovidResponse {
  updated: number;
  country: string;
  countryInfo: ICountryInfo;
  cases: number;
  todayCases: number;
  deaths: number;
  todayDeaths: number;
  recovered: number;
  todayRecovered: number;
  active: number;
  critical: number;
  casesPerOneMillion: number;
  deathsPerOneMillion: number;
  tests: number;
  testsPerOneMillion: number;
  population: number;
  continent: string;
  oneCasePerPeople: number;
  oneDeathPerPeople: number;
  oneTestPerPeople: number;
  activePerOneMillion: number;
  recoveredPerOneMillion: number;
  criticalPerOneMillion: number;
}

export type NumberMode = "compact" | "exact";

export type MetricKey =
  | "casesPerOneMillion"
  | "deathsPerOneMillion"
  | "testsPerOneMillion";

/** What the user currently has selected on the map. The COVID record is looked up at render time. */
export interface Selection {
  /** Name to show until the COVID record is available. */
  name: string;
  /** disease.sh country name, when chosen from search or recents. */
  country?: string;
  /** Id of the country shape on the map, if there is one. */
  featureId?: number;
}
