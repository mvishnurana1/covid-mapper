import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faXmark } from "@fortawesome/free-solid-svg-icons";
import { ICovidResponse, NumberMode } from "../../models/models";
import { LoadStatus } from "../../hooks/useCovidData";
import { formatDate, formatNumber } from "../../lib/format";
import { readStored, writeStored } from "../../lib/storage";
import "./CountryPanel.scss";

interface CountryPanelProps {
  name: string;
  record?: ICovidResponse;
  dataStatus: LoadStatus;
  onRetry: () => void;
  onClose: () => void;
}

interface Stat {
  label: string;
  value: number | null;
  today?: number;
  /** Per-million figures are always shown in full; abbreviating 1,234 to 1.2K hides detail. */
  alwaysExact?: boolean;
}

function totals(r: ICovidResponse): Stat[] {
  // A recovered count of 0 alongside deaths means the country stopped reporting recoveries,
  // which also makes "active" (cases − deaths − recovered) meaningless.
  const recoveredReported = r.recovered > 0 || r.deaths === 0;
  return [
    { label: "Cases", value: r.cases, today: r.todayCases },
    { label: "Deaths", value: r.deaths, today: r.todayDeaths },
    { label: "Recovered", value: recoveredReported ? r.recovered : null, today: r.todayRecovered },
    { label: "Active", value: recoveredReported ? r.active : null },
    { label: "Critical", value: r.critical },
    { label: "Tests", value: r.tests > 0 ? r.tests : null },
    { label: "Population", value: r.population > 0 ? r.population : null },
  ];
}

function perMillion(r: ICovidResponse): Stat[] {
  return [
    { label: "Cases", value: r.casesPerOneMillion, alwaysExact: true },
    { label: "Deaths", value: r.deathsPerOneMillion, alwaysExact: true },
    { label: "Tests", value: r.testsPerOneMillion > 0 ? r.testsPerOneMillion : null, alwaysExact: true },
  ];
}

function StatList({ stats, mode }: { stats: Stat[]; mode: NumberMode }) {
  return (
    <dl className="stats">
      {stats.map((s) => (
        <div key={s.label} className="stats__row">
          <dt>{s.label}</dt>
          <dd>
            {s.value === null ? (
              <span className="stats__missing">Not reported</span>
            ) : (
              formatNumber(s.value, s.alwaysExact ? "exact" : mode)
            )}
            {!!s.today && s.today > 0 && <span className="stats__today">+{formatNumber(s.today)} today</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function CountryPanel({ name, record, dataStatus, onRetry, onClose }: CountryPanelProps) {
  const [mode, setMode] = useState<NumberMode>(() => readStored<NumberMode>("number-mode", "compact"));
  const [collapsed, setCollapsed] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Move focus to the new country so keyboard and screen-reader users land on the result.
  useEffect(() => {
    setCollapsed(false);
    headingRef.current?.focus({ preventScroll: true });
  }, [name]);

  const changeMode = (next: NumberMode) => {
    setMode(next);
    writeStored("number-mode", next);
  };

  return (
    <aside className={`panel card${collapsed ? " panel--collapsed" : ""}`} aria-labelledby="panel-title">
      <header className="panel__header">
        {record?.countryInfo.flag && (
          <img
            key={record.countryInfo.flag}
            className="panel__flag"
            src={record.countryInfo.flag}
            alt={`Flag of ${name}`}
            width={40}
            height={28}
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
        )}
        <div className="panel__heading">
          <h2 id="panel-title" ref={headingRef} tabIndex={-1}>
            {name}
          </h2>
          {record?.continent && <p className="panel__subtitle">{record.continent}</p>}
        </div>
        <div className="panel__actions">
          <button
            type="button"
            className="icon-button panel__collapse"
            aria-expanded={!collapsed}
            aria-controls="panel-body"
            aria-label={collapsed ? "Show details" : "Hide details"}
            title={collapsed ? "Show details" : "Hide details"}
            onClick={() => setCollapsed((c) => !c)}
          >
            <FontAwesomeIcon icon={faChevronDown} />
          </button>
          <button type="button" className="icon-button" aria-label="Close" title="Close" onClick={onClose}>
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
      </header>

      <div id="panel-body" className="panel__body" hidden={collapsed}>
        {record ? (
          <>
            <div className="panel__toolbar">
              <div className="segmented segmented--small" role="group" aria-label="Number format">
                <button
                  type="button"
                  className="segmented__option"
                  aria-pressed={mode === "compact"}
                  onClick={() => changeMode("compact")}
                >
                  Compact
                </button>
                <button
                  type="button"
                  className="segmented__option"
                  aria-pressed={mode === "exact"}
                  onClick={() => changeMode("exact")}
                >
                  Exact
                </button>
              </div>
            </div>

            <section aria-labelledby="totals-title">
              <h3 id="totals-title" className="panel__section-title">
                Totals
              </h3>
              <StatList stats={totals(record)} mode={mode} />
            </section>

            <section aria-labelledby="per-million-title">
              <h3 id="per-million-title" className="panel__section-title">
                Per million people
              </h3>
              <StatList stats={perMillion(record)} mode={mode} />
            </section>

            <p className="panel__footnote">
              Cumulative figures from Worldometer, which stopped updating on 13 April 2024. Retrieved from disease.sh on{" "}
              {formatDate(record.updated)}.
            </p>
          </>
        ) : dataStatus === "loading" ? (
          <p className="panel__empty" role="status">
            <span className="spinner" aria-hidden="true" /> Loading figures…
          </p>
        ) : dataStatus === "error" ? (
          <div className="panel__empty">
            <p>Couldn’t load COVID-19 figures.</p>
            <button type="button" className="button" onClick={onRetry}>
              Try again
            </button>
          </div>
        ) : (
          <p className="panel__empty">No COVID-19 data is available for {name}.</p>
        )}
      </div>
    </aside>
  );
}

export default CountryPanel;
