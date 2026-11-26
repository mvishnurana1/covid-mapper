import { useCallback, useEffect, useState } from "react";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { FeatureCollection, Geometry, Position } from "geojson";
import countriesUrl from "world-atlas/countries-50m.json?url";
import { LoadStatus } from "./useCovidData";

export interface CountryProperties {
  name: string;
}

export type CountryShapes = FeatureCollection<Geometry, CountryProperties>;

/** No COVID data and it dominates the bottom of a flat map. */
const ANTARCTICA = "010";

/**
 * world-atlas is built for spherical renderers, so rings that cross ±180° (Russia, Fiji, the
 * Aleutians) jump from 180 to -180 and MapLibre draws a band across the whole map. Shifting
 * points by 360° keeps each ring continuous.
 */
function unwrapRing(ring: Position[]) {
  for (let i = 1; i < ring.length; i++) {
    const prev = ring[i - 1][0];
    let lng = ring[i][0];
    while (lng - prev > 180) lng -= 360;
    while (lng - prev < -180) lng += 360;
    ring[i][0] = lng;
  }
}

function unwrapAntimeridian(geometry: Geometry) {
  if (geometry.type === "Polygon") geometry.coordinates.forEach(unwrapRing);
  else if (geometry.type === "MultiPolygon") geometry.coordinates.forEach((poly) => poly.forEach(unwrapRing));
}

/**
 * Natural Earth 1:50m country outlines (served as a cached static asset).
 * Feature ids are ISO 3166-1 numeric codes; the few shapes without one
 * (e.g. Kosovo) get negative ids so they can still be hovered and selected.
 */
export function useCountryShapes() {
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [shapes, setShapes] = useState<CountryShapes | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");

    fetch(countriesUrl, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Country shapes responded ${res.status}`);
        return res.json() as Promise<Topology<{ countries: GeometryCollection<CountryProperties> }>>;
      })
      .then((topology) => {
        const collection = feature(topology, topology.objects.countries) as CountryShapes;
        let syntheticId = -1;
        collection.features = collection.features.filter((f) => f.id !== ANTARCTICA);
        collection.features.forEach((f) => {
          const numeric = f.id != null ? parseInt(String(f.id), 10) : NaN;
          f.id = Number.isNaN(numeric) ? syntheticId-- : numeric;
          unwrapAntimeridian(f.geometry);
        });
        setShapes(collection);
        setStatus("ready");
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        console.error("Failed to load country shapes", err);
        setStatus("error");
      });

    return () => controller.abort();
  }, [attempt]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  return { status, shapes, retry };
}
