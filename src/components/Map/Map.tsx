import { useEffect, useRef, useState } from "react";
import maplibregl, {
  ExpressionSpecification,
  GeoJSONSource,
  LayerSpecification,
  MapLayerMouseEvent,
  StyleSpecification,
} from "maplibre-gl";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
import { CountryShapes } from "../../hooks/useCountryShapes";
import { ICovidResponse, MetricKey } from "../../models/models";
import { METRICS, NO_DATA_COLOR, getMetric, metricValue, rampFor } from "../../lib/metrics";
import { displayName } from "../../lib/countries";
import { formatNumber } from "../../lib/format";
import "./Map.scss";

export interface FocusRequest {
  lng: number;
  lat: number;
  /** Changes on every request so the same country can be focused twice. */
  key: number;
}

interface WorldMapProps {
  shapes: CountryShapes | null;
  byIsoNumeric: Map<number, ICovidResponse>;
  byName: Map<string, ICovidResponse>;
  metric: MetricKey;
  breaks: number[];
  selectedFeatureId?: number;
  focus?: FocusRequest;
  panelOpen: boolean;
  onSelectFeature: (featureId: number, name: string) => void;
}

const SOURCE = "countries";
const FILL_LAYER = "countries-fill";

/** Free vector base map: no API key, no usage limits (https://openfreemap.org). */
const BASE_STYLE_URL = "https://tiles.openfreemap.org/styles/positron";

const ATTRIBUTION =
  '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> © <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';

/** Used if the base map can't be reached: the countries still draw, on a plain background. */
const FALLBACK_STYLE: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: "background", type: "background", paint: { "background-color": "#dde3e9" } }],
};

const BASE_STYLE_TIMEOUT_MS = 8000;

/**
 * Add the country layers to whatever base style is loaded, below its first label layer
 * so place names stay readable on top of the colours.
 */
function addCountryLayers(map: maplibregl.Map) {
  if (map.getSource(SOURCE)) return;
  map.addSource(SOURCE, { type: "geojson", data: { type: "FeatureCollection", features: [] } });

  const beforeId = map.getStyle().layers.find((l) => l.type === "symbol")?.id;
  const layers: LayerSpecification[] = [
    {
      id: FILL_LAYER,
      type: "fill",
      source: SOURCE,
      paint: {
        "fill-color": NO_DATA_COLOR,
        "fill-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 0.95, 0.8],
      },
    },
    {
      id: "countries-border",
      type: "line",
      source: SOURCE,
      paint: { "line-color": "#ffffff", "line-width": 0.6 },
    },
    {
      id: "countries-hover",
      type: "line",
      source: SOURCE,
      paint: {
        "line-color": "#1f2933",
        "line-width": ["case", ["boolean", ["feature-state", "hover"], false], 1.5, 0],
      },
    },
    {
      id: "countries-selected",
      type: "line",
      source: SOURCE,
      filter: ["==", ["id"], -9999],
      paint: { "line-color": "#111827", "line-width": 2.5 },
    },
  ];
  layers.forEach((layer) => map.addLayer(layer, beforeId));
}

function fillColorExpression(metric: MetricKey, breaks: number[]): ExpressionSpecification | string {
  // No breaks yet (data still loading): a step expression needs at least one stop.
  if (breaks.length === 0) return NO_DATA_COLOR;
  const colors = rampFor(breaks.length + 1);
  const step: unknown[] = ["step", ["get", metric], colors[0]];
  breaks.forEach((b, i) => step.push(b, colors[i + 1]));
  return ["case", ["has", metric], step as ExpressionSpecification, NO_DATA_COLOR];
}

function prefersReducedMotion(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

function panelPadding(panelOpen: boolean): maplibregl.PaddingOptions {
  const none = { top: 0, right: 0, bottom: 0, left: 0 };
  if (!panelOpen) return none;
  if (window.innerWidth >= 720) return { ...none, right: 380 };
  return { ...none, bottom: Math.round(window.innerHeight * 0.45) };
}

function WorldMap({
  shapes,
  byIsoNumeric,
  byName,
  metric,
  breaks,
  selectedFeatureId,
  focus,
  panelOpen,
  onSelectFeature,
}: WorldMapProps) {
  const container = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  // Bumped each time a style finishes loading (0 = not yet), so data and paint are re-applied
  // if the map falls back to the plain style.
  const [styleVersion, setStyleVersion] = useState(0);
  const loaded = styleVersion > 0;

  // Event handlers are bound once, so they read the latest props through refs.
  const metricRef = useRef(metric);
  const onSelectRef = useRef(onSelectFeature);
  metricRef.current = metric;
  onSelectRef.current = onSelectFeature;

  useEffect(() => {
    if (!container.current) return;

    const map = new maplibregl.Map({
      container: container.current,
      style: BASE_STYLE_URL,
      bounds: [
        [-150, -50],
        [170, 72],
      ],
      fitBoundsOptions: { padding: 16 },
      minZoom: 0.5,
      maxZoom: 7,
      renderWorldCopies: false,
      dragRotate: false,
      pitchWithRotate: false,
      attributionControl: { compact: true, customAttribution: ATTRIBUTION },
    });
    mapRef.current = map;
    map.touchZoomRotate.disableRotation();
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    map
      .getCanvas()
      .setAttribute("aria-label", "World map of COVID-19 statistics. Use the search box to choose a country with the keyboard.");

    const tooltip = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      className: "map-tooltip",
      offset: 12,
      maxWidth: "240px",
    });
    let hoveredId: number | string | undefined;

    const clearHover = () => {
      if (hoveredId !== undefined) map.setFeatureState({ source: SOURCE, id: hoveredId }, { hover: false });
      hoveredId = undefined;
      map.getCanvas().style.cursor = "";
      tooltip.remove();
    };

    map.on("mousemove", FILL_LAYER, (e: MapLayerMouseEvent) => {
      const f = e.features?.[0];
      if (!f || f.id === undefined) return;
      if (hoveredId !== f.id) {
        if (hoveredId !== undefined) map.setFeatureState({ source: SOURCE, id: hoveredId }, { hover: false });
        hoveredId = f.id;
        map.setFeatureState({ source: SOURCE, id: hoveredId }, { hover: true });
      }
      map.getCanvas().style.cursor = "pointer";

      const def = getMetric(metricRef.current);
      const value = f.properties?.[def.key];
      const content = document.createElement("div");
      content.className = "map-tooltip__body";
      const title = document.createElement("strong");
      title.textContent = String(f.properties?.name ?? "");
      const detail = document.createElement("span");
      detail.textContent =
        typeof value === "number" ? `${formatNumber(value)} ${def.shortLabel.toLowerCase()} per million` : "No data";
      content.append(title, detail);
      tooltip.setLngLat(e.lngLat).setDOMContent(content).addTo(map);
    });

    map.on("mouseleave", FILL_LAYER, clearHover);

    map.on("click", FILL_LAYER, (e: MapLayerMouseEvent) => {
      const f = e.features?.[0];
      if (!f || typeof f.id !== "number") return;
      tooltip.remove();
      onSelectRef.current(f.id, String(f.properties?.name ?? "Unknown"));
    });

    // "style.load" rather than "load": "load" waits for every base-map tile, so one failed
    // tile would stop the countries from ever being coloured.
    let styleReady = false;
    let usingFallback = false;
    const switchToFallback = () => {
      if (styleReady || usingFallback) return;
      usingFallback = true;
      console.warn("Base map unavailable; showing countries without it.");
      map.setStyle(FALLBACK_STYLE);
    };
    const fallbackTimer = window.setTimeout(switchToFallback, BASE_STYLE_TIMEOUT_MS);

    map.on("style.load", () => {
      styleReady = true;
      window.clearTimeout(fallbackTimer);
      hoveredId = undefined;
      addCountryLayers(map);
      setStyleVersion((v) => v + 1);
    });

    // An error before any style has loaded (rather than a single failed tile) means the
    // base style itself couldn't be fetched.
    map.on("error", (e: { error: Error; sourceId?: string }) => {
      if (!styleReady && !e.sourceId) switchToFallback();
    });

    return () => {
      window.clearTimeout(fallbackTimer);
      map.remove();
      mapRef.current = null;
      setStyleVersion(0);
    };
  }, []);

  // Join COVID values onto the country shapes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded || !shapes) return;

    const features: Feature<Geometry, Record<string, unknown>>[] = shapes.features.map((f) => {
      const id = f.id as number;
      const record = id > 0 ? byIsoNumeric.get(id) : byName.get(f.properties.name.toLowerCase());
      const properties: Record<string, unknown> = {
        name: record ? displayName(record) : f.properties.name,
      };
      METRICS.forEach(({ key }) => {
        const v = metricValue(record, key);
        if (v !== null) properties[key] = v;
      });
      return { ...f, properties };
    });

    const collection: FeatureCollection = { type: "FeatureCollection", features };
    (map.getSource(SOURCE) as GeoJSONSource).setData(collection);
  }, [loaded, styleVersion, shapes, byIsoNumeric, byName]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    map.setPaintProperty(FILL_LAYER, "fill-color", fillColorExpression(metric, breaks));
  }, [loaded, styleVersion, metric, breaks]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    map.setFilter("countries-selected", ["==", ["id"], selectedFeatureId ?? -9999]);
  }, [loaded, styleVersion, selectedFeatureId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focus) return;
    const options = {
      center: [focus.lng, focus.lat] as [number, number],
      zoom: Math.max(map.getZoom(), 3),
      padding: panelPadding(true),
    };
    if (prefersReducedMotion()) map.jumpTo(options);
    else map.flyTo({ ...options, essential: true, duration: 1200 });
  }, [focus]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded || panelOpen) return;
    map.easeTo({ padding: panelPadding(false), duration: prefersReducedMotion() ? 0 : 300 });
  }, [loaded, panelOpen]);

  return <div ref={container} className="map" />;
}

export default WorldMap;
