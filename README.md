# Covid Mapper

An interactive world map of COVID-19 statistics. Countries are shaded by cases, deaths or tests per million people; click a country or search by name to see its full figures.

Live site: http://mvishnurana1.github.io/covid-mapper

## Features

- **Choropleth map** of every country, coloured by cases, deaths or tests per million, with a legend.
- **Hover tooltips** with the country name and value; **click** a country to open its details.
- **Country search** (keyboard accessible) with a list of recently viewed countries.
- **Details panel** with totals and per-million figures, compact or exact number formats, and clear "not reported" labels. On phones it becomes a bottom sheet.
- **Loading, error and no-data states**, with retry.
- **Light and dark** colour schemes that follow the system setting.
- A short **welcome card** on the first visit only.

## Data

- COVID-19 figures: [disease.sh](https://disease.sh), which serves Worldometer's data. Worldometer stopped updating its COVID-19 counts on 13 April 2024, so the figures are cumulative totals up to that date.
- Country outlines: [Natural Earth](https://www.naturalearthdata.com/) via [world-atlas](https://github.com/topojson/world-atlas) (1:50m).
- Base map: [OpenFreeMap](https://openfreemap.org) "Positron" style (free, no API key), © [OpenMapTiles](https://www.openmaptiles.org/), data © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors. If the base map can't be reached, the countries are still drawn on a plain background.

## Getting started

Requires Node.js 18 or later.

```bash
npm install
npm run dev
```

Other scripts:

| Command | What it does |
| --- | --- |
| `npm run build` | Type-checks and builds to `build/` |
| `npm run lint` | Runs ESLint |
| `npm run preview` | Serves the production build locally |
| `npm run deploy` | Builds and publishes `build/` to GitHub Pages |

## Project structure

```
src/
  App.tsx                 Layout and app state (selection, metric, intro)
  components/
    Map/                  MapLibre map: choropleth, hover, selection
    Legend/               Metric picker and colour scale
    CountrySearch/        Search combobox and recent countries
    CountryPanel/         Country details panel / bottom sheet
    LandingPage/          First-visit welcome dialog
    ErrorBoundary/, ErrorPage/
  hooks/                  Data loading (disease.sh, country shapes) and recents
  lib/                    Formatting, metrics and colour breaks, country names, storage
```
