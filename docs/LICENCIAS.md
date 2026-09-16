# Licencias y atribuciones

## Datos cartográficos

| Fuente | Uso en el proyecto | Licencia | Atribución requerida |
| --- | --- | --- | --- |
| [OpenStreetMap](https://www.openstreetmap.org/copyright) | Vialidades, usos de suelo, áreas verdes, agua, nombres de lugares (vía Overpass API, extracción 14-sep-2026) | [ODbL 1.0](https://opendatacommons.org/licenses/odbl/) | «© OpenStreetMap contributors» |
| [Overture Maps Foundation](https://docs.overturemaps.org/attribution/) — buildings (release 2026-08-19.0) | Huellas de edificios (incluye OpenStreetMap, Microsoft ML Buildings y Google Open Buildings) | ODbL 1.0 | «© OpenStreetMap contributors, Overture Maps Foundation» |
| Overture Maps — places | Solo como referencia para **ubicar** plazas (no se publican sus datos) | CDLA Permissive 2.0 | — |
| Plano del cliente (terraink.app, derivado de OSM) | Referencia visual y verificación de fidelidad (solo en modo depuración) | Material del cliente; datos base © OpenStreetMap contributors | «© OpenStreetMap contributors» |

La atribución del mapa es visible en la esquina inferior izquierda
(«© OpenStreetMap · Overture Maps · MapLibre»). Las fechas, métodos y huellas de cada extracción están en
`data/geographic/manifest.json`.

**ODbL:** las capas derivadas (`public/map/zibata.pmtiles`, `plaza-buildings.geojson`) son una base de datos
derivada y se distribuyen bajo ODbL 1.0 con la atribución indicada.

## Datos comerciales

Nombres de plazas y locales, rubros y estado aportados por el propietario del proyecto
(«Restaurantes en Zibatá.xlsx»). Referencias públicas consultadas para ubicar plazas: Atlas Desarrollos
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
| [Instrument Sans](https://github.com/Instrument/instrument-sans), [Instrument Serif](https://github.com/Instrument/instrument-serif) (vía Fontsource) | SIL Open Font License 1.1 |
| sharp, Papa Parse | Apache-2.0 / MIT |
| Vite, Vitest, Playwright, Testing Library, axe-core, Biome | MIT / Apache-2.0 / MPL-2.0 (axe-core) |

Los logotipos de Instagram, Facebook, TikTok y WhatsApp son marcas de sus titulares; se usan solo para
identificar enlaces a esos servicios.
