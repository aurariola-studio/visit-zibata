/**
 * Construye el estilo completo de MapLibre a partir de los datos propios del proyecto
 * (PMTiles + GeoJSON locales). Sin servidores de mapas externos ni claves.
 */
import instrumentSans500 from '@fontsource/instrument-sans/files/instrument-sans-latin-500-normal.woff2?url'
import instrumentSans600 from '@fontsource/instrument-sans/files/instrument-sans-latin-600-normal.woff2?url'
import instrumentSerifItalic from '@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2?url'
import instrumentSerif400 from '@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2?url'
import type { Feature, FeatureCollection, Polygon } from 'geojson'
import type { StyleSpecification } from 'maplibre-gl'
import type { Bbox } from '../../../config/map.ts'
import type { Plaza } from '../../../types/domain.ts'
import { SOURCE } from './ids.ts'
import { buildingLayers } from './layers/buildings.ts'
import { groundLayers, outsideVeilLayers } from './layers/ground.ts'
import { FONT, labelLayers } from './layers/labels.ts'
import { plazaBuildingLayers, plazaGroundLayers } from './layers/plazas.ts'
import { roadLayers } from './layers/roads.ts'
import { mapTheme } from './theme.ts'

export interface MapStyleOptions {
  pmtilesUrl: string
  plazaBuildingsUrl: string
  plazas: readonly Plaza[]
  boundary: Polygon
  areaBbox: Bbox
  center: [number, number]
}

export const MAP_ATTRIBUTION =
  '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a> · ' +
  '<a href="https://overturemaps.org/" target="_blank" rel="noopener">Overture Maps</a> · ' +
  '<a href="https://maplibre.org/" target="_blank" rel="noopener">MapLibre</a>'

const absolute = (url: string) => new URL(url, window.location.href).href

export function plazaSitesGeoJSON(plazas: readonly Plaza[]): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: plazas.map((plaza) => ({
      type: 'Feature',
      properties: { plazaId: plaza.id, name: plaza.name, active: plaza.active },
      geometry: plaza.geometry,
    })),
  }
}

/** Polígono "mundo con hueco": todo lo que queda fuera del contorno de Zibatá. */
export function outsideMask(boundary: Polygon, [west, south, east, north]: Bbox): Feature {
  const margin = 0.2
  const outer = [
    [west - margin, south - margin],
    [east + margin, south - margin],
    [east + margin, north + margin],
    [west - margin, north + margin],
    [west - margin, south - margin],
  ]
  const hole = [...(boundary.coordinates[0] ?? [])].reverse()
  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'Polygon', coordinates: [outer, hole] },
  }
}

export function buildMapStyle(options: MapStyleOptions): StyleSpecification {
  const activePlazaIds = options.plazas.filter((plaza) => plaza.active).map((plaza) => plaza.id)
  return {
    version: 8,
    name: 'Zibatá — maqueta',
    'font-faces': {
      [FONT.sans]: absolute(instrumentSans500),
      [FONT.sansStrong]: absolute(instrumentSans600),
      [FONT.serif]: absolute(instrumentSerif400),
      [FONT.serifItalic]: absolute(instrumentSerifItalic),
    },
    sources: {
      [SOURCE.base]: {
        type: 'vector',
        url: `pmtiles://${options.pmtilesUrl}`,
        attribution: MAP_ATTRIBUTION,
      },
      [SOURCE.plazaSites]: {
        type: 'geojson',
        data: plazaSitesGeoJSON(options.plazas),
        promoteId: 'plazaId',
      },
      [SOURCE.plazaBuildings]: {
        type: 'geojson',
        data: options.plazaBuildingsUrl,
        promoteId: 'plazaId',
      },
      [SOURCE.mask]: { type: 'geojson', data: outsideMask(options.boundary, options.areaBbox) },
      [SOURCE.areaLabel]: {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: { type: 'Point', coordinates: options.center },
        },
      },
    },
    sky: {
      'sky-color': mapTheme.sky.sky,
      'horizon-color': mapTheme.sky.horizon,
      'fog-color': mapTheme.sky.fog,
      'sky-horizon-blend': 0.7,
      'horizon-fog-blend': 0.6,
      'fog-ground-blend': 0.82,
      'atmosphere-blend': 0,
    },
    light: { anchor: 'map', color: mapTheme.light, intensity: 0.42, position: [1.25, 210, 42] },
    layers: [
      ...groundLayers(),
      ...plazaGroundLayers(),
      ...roadLayers(),
      ...outsideVeilLayers(),
      ...buildingLayers(),
      ...plazaBuildingLayers(activePlazaIds),
      ...labelLayers(),
    ],
  }
}
