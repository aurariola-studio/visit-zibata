/** BuildingLayer: todos los edificios con volumen (fill-extrusion), no interactivos. */
import type { ExpressionSpecification, LayerSpecification } from 'maplibre-gl'
import { LAYER, SOURCE } from '../ids.ts'
import { mapTheme as t } from '../theme.ts'

/** Los volumens "crecen" al acercarse: microanimación natural sin coste extra. */
export const growingHeight = (
  property: ExpressionSpecification,
  factor = 1,
): ExpressionSpecification => [
  'interpolate',
  ['linear'],
  ['zoom'],
  13,
  0,
  14.2,
  ['*', property, factor],
]

export function buildingLayers(): LayerSpecification[] {
  return [
    {
      id: LAYER.buildingsOutside,
      type: 'fill-extrusion',
      source: SOURCE.base,
      'source-layer': 'buildings',
      minzoom: 13,
      filter: ['!', ['get', 'inside']],
      paint: {
        'fill-extrusion-color': t.building.outside,
        'fill-extrusion-height': growingHeight(['get', 'height'], 0.8),
        'fill-extrusion-base': ['coalesce', ['get', 'minHeight'], 0],
        'fill-extrusion-vertical-gradient': true,
      },
    },
    {
      id: LAYER.buildings,
      type: 'fill-extrusion',
      source: SOURCE.base,
      'source-layer': 'buildings',
      minzoom: 13,
      filter: ['get', 'inside'],
      layout: { 'fill-extrusion-rounded-corner-distance': 0.6 },
      paint: {
        'fill-extrusion-color': [
          'match',
          ['get', 'type'],
          'commercial',
          t.building.commercial,
          'education',
          t.building.education,
          'other',
          t.building.other,
          t.building.residential,
        ],
        'fill-extrusion-height': growingHeight(['get', 'height']),
        'fill-extrusion-base': ['coalesce', ['get', 'minHeight'], 0],
        'fill-extrusion-vertical-gradient': true,
      },
    },
  ]
}
