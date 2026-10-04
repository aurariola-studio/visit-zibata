# Licencias y atribuciones

## Datos cartográficos

| Fuente | Uso en el proyecto | Licencia | Atribución requerida |
| --- | --- | --- | --- |
| [OpenStreetMap](https://www.openstreetmap.org/copyright) | Vialidades, usos de suelo, áreas verdes, agua, nombres de lugares (vía Overpass API, extracción 14-sep-2026) | [ODbL 1.0](https://opendatacommons.org/licenses/odbl/) | "© OpenStreetMap contributors" |
| [Overture Maps Foundation](https://docs.overturemaps.org/attribution/): buildings (release 2026-08-19.0) | Huellas de edificios (incluye OpenStreetMap, Microsoft ML Buildings y Google Open Buildings) | ODbL 1.0 | "© OpenStreetMap contributors, Overture Maps Foundation" |
| Overture Maps: base/land_cover (`forest`), derivado de [ESA WorldCover](https://esa-worldcover.org/) 10 m | Dónde hay árboles (capa `trees` del mapa) | CC BY 4.0 | "© ESA WorldCover, Overture Maps Foundation" |
| Overture Maps ( places | Solo como referencia para **ubicar** plazas (no se publican sus datos) | CDLA Permissive 2.0 | ) |
| Plano del cliente (terraink.app, derivado de OSM) | Referencia visual y verificación de fidelidad (solo en modo depuración) | Material del cliente; datos base © OpenStreetMap contributors | "© OpenStreetMap contributors" |

La atribución del mapa vive en la esquina inferior izquierda, en el control compacto de MapLibre: a la
vista queda la ⓘ y el texto completo ("© OpenStreetMap · Overture Maps · ESA WorldCover · MapLibre")
aparece al pulsarla, con sus enlaces. Es el propio control de atribución de la librería, el mismo
recurso que usan los mapas comerciales para cumplir la ODbL sin tapar el mapa. Las fechas, métodos y
huellas de cada extracción están en `data/geographic/manifest.json`.

**ODbL:** las capas derivadas (`public/map/zibata.pmtiles`, `plaza-buildings.geojson`) son una base de datos
derivada y se distribuyen bajo ODbL 1.0 con la atribución indicada.

## Datos comerciales

Nombres de plazas y locales, rubros y estado aportados por el propietario del proyecto
("Restaurantes en Zibatá.xlsx"). Referencias públicas consultadas para ubicar plazas: Atlas Desarrollos
(MOL Pitahaya), Cafele (sucursal Zibatá), Pick Spot, Walmart Express Zibatá y We Build (Distrito Nandú).
Solo se tomaron ubicaciones y direcciones, no contenidos.

## Fotografías

El repositorio no incluye fotografías de negocios. Las que se añadan deben ser propias, aportadas por el
negocio o con licencia que permita su publicación; el crédito se registra en el campo `credit`.
Las ilustraciones de categoría son propias del proyecto.

## Software y recursos

| Componente | Licencia |
| --- | --- |
| [MapLibre GL JS](https://github.com/maplibre/maplibre-gl-js) | BSD-3-Clause |
| [PMTiles](https://github.com/protomaps/PMTiles) (lector) | BSD-3-Clause |
| [@maplibre/geojson-vt](https://github.com/maplibre/geojson-vt), [@maplibre/vt-pbf](https://github.com/maplibre/vt-pbf) | ISC / MIT |
| [Turf.js](https://turfjs.org/) | MIT |
| [DuckDB](https://duckdb.org/) (`@duckdb/node-api`) | MIT |
| React, React DOM | MIT |
| [Fuse.js](https://fusejs.io/) | Apache-2.0 |
| [Zod](https://zod.dev/) | MIT |
| [Lucide](https://lucide.dev/) (iconos) | ISC |
| [Simple Icons](https://simpleicons.org/) (logotipos de redes) | CC0 1.0 |
| Logotipos de Rappi, Uber Eats y DiDi (iconos de aplicación en `public/brands`), vectores de [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Rappi_logo.svg) | Dominio público (marcas de sus titulares) |
| [circle-flags](https://github.com/HatScripts/circle-flags) (banderas del selector de idioma) | MIT |
| [Instrument Sans](https://github.com/Instrument/instrument-sans) y [Fraunces](https://github.com/undercasetype/Fraunces) (vía Fontsource); [Instrument Serif](https://github.com/Instrument/instrument-serif) en los rótulos del mapa | SIL Open Font License 1.1 |
| sharp, Papa Parse | Apache-2.0 / MIT |
| Vite, Vitest, Playwright, Testing Library, axe-core, Biome | MIT / Apache-2.0 / MPL-2.0 (axe-core) |

Los logotipos de Instagram, Facebook, TikTok, WhatsApp, Rappi, Uber Eats y DiDi Food son marcas de sus titulares
y se usan solo para identificar enlaces a esos servicios. Los dos de reparto se componen con los
vectores publicados en Wikimedia Commons como dominio público (por debajo del umbral de originalidad)
sobre el fondo de color de cada aplicación, para que se reconozcan como en el teléfono. No implica
relación ni respaldo de esas empresas, y cualquiera de las dos puede pedir que se retire su marca.
