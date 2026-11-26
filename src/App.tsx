import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import WorldMap, { FocusRequest } from "./components/Map/Map";
import Legend from "./components/Legend/Legend";
import CountrySearch from "./components/CountrySearch/CountrySearch";
import CountryPanel from "./components/CountryPanel/CountryPanel";
import LandingPage from "./components/LandingPage/LandingPage";
import { useCovidData } from "./hooks/useCovidData";
import { useCountryShapes } from "./hooks/useCountryShapes";
import { useRecentCountries } from "./hooks/useRecentCountries";
import { ICovidResponse, MetricKey, Selection } from "./models/models";
import { METRICS, computeBreaks } from "./lib/metrics";
import { displayName } from "./lib/countries";
import { clearLegacyKeys, readStored, writeStored } from "./lib/storage";
import logo from "./assets/coronavirus.png";
import "./App.scss";

clearLegacyKeys();

function App() {
  const covid = useCovidData();
  const countryShapes = useCountryShapes();
  const recents = useRecentCountries();

  const [showIntro, setShowIntro] = useState(() => !readStored<boolean>("intro-seen", false));
  const [metric, setMetric] = useState<MetricKey>(() => {
    const stored = readStored<string>("metric", METRICS[0].key);
    return METRICS.some((m) => m.key === stored) ? (stored as MetricKey) : METRICS[0].key;
  });
  const [selection, setSelection] = useState<Selection | null>(null);
  const [focus, setFocus] = useState<FocusRequest>();
  const searchRef = useRef<HTMLInputElement>(null);

  const breaks = useMemo(() => computeBreaks(covid.records, metric), [covid.records, metric]);

  const shapeIds = useMemo(
    () => new Set(countryShapes.shapes?.features.map((f) => f.id as number) ?? []),
    [countryShapes.shapes]
  );

  // Resolve the record at render time so a selection made before the data arrived fills in once it does.
  const selectedRecord = useMemo<ICovidResponse | undefined>(() => {
    if (!selection) return undefined;
    if (selection.country) return covid.byName.get(selection.country.toLowerCase());
    if (selection.featureId !== undefined && selection.featureId > 0) {
      return covid.byIsoNumeric.get(selection.featureId);
    }
    return covid.byName.get(selection.name.toLowerCase());
  }, [selection, covid.byName, covid.byIsoNumeric]);

  const { add: addRecent } = recents;
  useEffect(() => {
    if (selectedRecord) addRecent(selectedRecord.country);
  }, [selectedRecord, addRecent]);

  const selectFeature = useCallback((featureId: number, name: string) => {
    setSelection({ featureId, name });
  }, []);

  const selectRecord = useCallback(
    (record: ICovidResponse) => {
      const id = record.countryInfo._id;
      setSelection({
        name: displayName(record),
        country: record.country,
        featureId: id != null && shapeIds.has(id) ? id : undefined,
      });
      setFocus({ lng: record.countryInfo.long, lat: record.countryInfo.lat, key: Date.now() });
    },
    [shapeIds]
  );

  const closePanel = useCallback(() => {
    setSelection(null);
    searchRef.current?.focus();
  }, []);

  // Escape closes the panel (the search box and dialog handle their own Escape first).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented || showIntro) return;
      if (document.activeElement === searchRef.current && searchRef.current?.value) return;
      setSelection(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showIntro]);

  const changeMetric = (next: MetricKey) => {
    setMetric(next);
    writeStored("metric", next);
  };

  const dismissIntro = () => {
    setShowIntro(false);
    writeStored("intro-seen", true);
    requestAnimationFrame(() => searchRef.current?.focus());
  };

  const loadFailed = covid.status === "error" || countryShapes.status === "error";
  const retryAll = () => {
    if (covid.status === "error") covid.retry();
    if (countryShapes.status === "error") countryShapes.retry();
  };

  return (
    <div className="app">
      <WorldMap
        shapes={countryShapes.shapes}
        byIsoNumeric={covid.byIsoNumeric}
        byName={covid.byName}
        metric={metric}
        breaks={breaks}
        selectedFeatureId={selection?.featureId}
        focus={focus}
        panelOpen={!!selection}
        onSelectFeature={selectFeature}
      />

      <header className="topbar card">
        <div className="brand">
          <img src={logo} alt="" width={28} height={28} />
          <span className="brand__name">Covid Mapper</span>
        </div>
        <CountrySearch
          ref={searchRef}
          records={covid.records}
          byName={covid.byName}
          status={covid.status}
          recent={recents.recent}
          onSelect={selectRecord}
          onClearRecent={recents.clear}
        />
      </header>

      {loadFailed && (
        <div className="banner card" role="alert">
          <span>Couldn’t load {covid.status === "error" ? "COVID-19 data" : "country outlines"}. Check your connection and try again.</span>
          <button type="button" className="button button--primary" onClick={retryAll}>
            Try again
          </button>
        </div>
      )}

      <Legend metric={metric} onMetricChange={changeMetric} breaks={breaks} status={covid.status} />

      {selection && (
        <CountryPanel
          name={selectedRecord ? displayName(selectedRecord) : selection.name}
          record={selectedRecord}
          dataStatus={covid.status}
          onRetry={covid.retry}
          onClose={closePanel}
        />
      )}

      {showIntro && <LandingPage onDismiss={dismissIntro} />}
    </div>
  );
}

export default App;
