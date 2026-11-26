import { useEffect, useRef } from "react";
import { MetricKey } from "../../models/models";
import { METRICS, NO_DATA_COLOR, getMetric, rampFor } from "../../lib/metrics";
import { formatCompact } from "../../lib/format";
import { LoadStatus } from "../../hooks/useCovidData";
import "./Legend.scss";

interface LegendProps {
  metric: MetricKey;
  onMetricChange: (metric: MetricKey) => void;
  breaks: number[];
  status: LoadStatus;
}

function Legend({ metric, onMetricChange, breaks, status }: LegendProps) {
  const colors = rampFor(breaks.length + 1);
  const def = getMetric(metric);
  const ref = useRef<HTMLElement>(null);

  // Publish the legend's height so map controls can sit above it on small screens.
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      document.documentElement.style.setProperty("--legend-clearance", `${el.offsetHeight + 8}px`);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} className="legend card" aria-labelledby="legend-title">
      <div className="legend__header">
        <h2 id="legend-title" className="legend__title">
          {def.label}
        </h2>
      </div>

      <div className="segmented" role="group" aria-label="Colour the map by">
        {METRICS.map((m) => (
          <button
            key={m.key}
            type="button"
            className="segmented__option"
            aria-pressed={m.key === metric}
            onClick={() => onMetricChange(m.key)}
          >
            {m.shortLabel}
          </button>
        ))}
      </div>

      {status === "loading" && (
        <p className="legend__status" role="status">
          <span className="spinner" aria-hidden="true" /> Loading COVID-19 data…
        </p>
      )}

      {status === "ready" && breaks.length > 0 && (
        <div className="legend__scale">
          <div className="legend__ramp" aria-hidden="true">
            {colors.map((c) => (
              <span key={c} style={{ background: c }} />
            ))}
          </div>
          <div className="legend__ticks" aria-hidden="true">
            {breaks.map((b, i) => (
              <span key={b} style={{ left: `${((i + 1) / colors.length) * 100}%` }}>
                {formatCompact(b)}
              </span>
            ))}
          </div>
          <p className="visually-hidden">
            Lightest colour is under {formatCompact(breaks[0])}; darkest is {formatCompact(breaks[breaks.length - 1])} or
            more.
          </p>
          <div className="legend__nodata">
            <span style={{ background: NO_DATA_COLOR }} aria-hidden="true" /> No data
          </div>
        </div>
      )}

      <p className="legend__source">
        Data:{" "}
        <a href="https://disease.sh" target="_blank" rel="noopener noreferrer">
          disease.sh
        </a>{" "}
        (Worldometer). Totals stopped updating on 13 April 2024.
      </p>
    </section>
  );
}

export default Legend;
