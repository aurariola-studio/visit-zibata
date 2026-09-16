/** GreenLayer + WaterLayer: suelo, usos de suelo, áreas verdes, agua y velo exterior. */
import type { LayerSpecification } from 'maplibre-gl'
import { SOURCE } from '../ids.ts'
import { mapTheme as t } from '../theme.ts'

export function groundLayers(): LayerSpecification[] {
  return [
    { id: 'background', type: 'background', paint: { 'background-color': t.groundOutside } },
    {
      id: 'zibata-ground',
      type: 'fill',
      source: SOURCE.base,
      'source-layer': 'boundary',
      paint: { 'fill-color': t.groundZibata },
    },
    {
      id: 'landuse-built',
      type: 'fill',
      source: SOURCE.base,
      'source-layer': 'landuse',
      filter: [
        'in',
        ['get', 'class'],
        ['literal', ['residential', 'commercial', 'education', 'farmland']],
      ],
      paint: {
        'fill-color': [
          'match',
          ['get', 'class'],
          'residential',
          t.landuse.residential,
          'commercial',
          t.landuse.commercial,
          'education',
          t.landuse.education,
          t.landuse.farmland,
        ],
      },
    },
    {
      id: 'landuse-green',
      type: 'fill',
      source: SOURCE.base,
      'source-layer': 'landuse',
      filter: ['in', ['get', 'class'], ['literal', ['park', 'grass', 'wood', 'golf']]],
      paint: {
        'fill-color': [
          'match',
          ['get', 'class'],
          'golf',
          t.landuse.golf,
          'wood',
          t.landuse.wood,
          'grass',
          t.landuse.grass,
          t.landuse.park,
        ],
        'fill-opacity': ['interpolate', ['linear'], ['zoom'], 12, 0.8, 15, 1],
      },
    },
    {
      id: 'landuse-pitch',
      type: 'fill',
      source: SOURCE.base,
      'source-layer': 'landuse',
      minzoom: 14.5,
      filter: ['==', ['get', 'class'], 'pitch'],
      paint: { 'fill-color': t.landuse.pitch, 'fill-outline-color': t.landuse.pitchOutline },
    },
    {
      id: 'waterway',
      type: 'line',
      source: SOURCE.base,
      'source-layer': 'waterway',
      paint: {
        'line-color': t.water,
        'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 13, 0.6, 18, 5],
      },
    },
    {
      id: 'water',
      type: 'fill',
      source: SOURCE.base,
      'source-layer': 'water',
      paint: { 'fill-color': t.water },
    },
    {
      id: 'water-outline',
      type: 'line',
      source: SOURCE.base,
      'source-layer': 'water',
      minzoom: 14,
      paint: { 'line-color': t.waterOutline, 'line-width': 1, 'line-opacity': 0.7 },
    },
  ]
}

/** Velo sobre el entorno fuera de Zibatá (va encima de las vialidades y bajo los edificios). */
export function outsideVeilLayers(): LayerSpecification[] {
  return [
    {
      id: 'outside-veil',
      type: 'fill',
      source: SOURCE.mask,
      paint: { 'fill-color': t.outsideVeil, 'fill-opacity': 0.62 },
    },
    {
      id: 'zibata-edge',
      type: 'line',
      source: SOURCE.base,
      'source-layer': 'boundary',
      layout: { 'line-join': 'round' },
      paint: {
        'line-color': t.boundaryEdge,
        'line-width': ['interpolate', ['linear'], ['zoom'], 12, 1, 16, 2.2],
        'line-blur': 1.2,
        'line-opacity': ['interpolate', ['linear'], ['zoom'], 14.5, 0.9, 16.5, 0.35],
      },
    },
  ]
}
