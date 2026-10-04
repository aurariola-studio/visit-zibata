/**
 * Árboles: tronco y copa en fill-extrusion, generados en el pipeline solo donde hay arbolado real
 * (scripts/map/lib/trees.ts). Crecen al acercarse, como los edificios, y no son interactivos. Van
 * traslúcidos y en verdes apagados para que sean entorno, no protagonistas.
 */
import type { LayerSpecification } from 'maplibre-gl'
import { LAYER, SOURCE } from '../ids.ts'
import { mapTheme as t } from '../theme.ts'
import { growingHeight } from './buildings.ts'

export function treeLayers(): LayerSpecification[] {
  return [
    {
      id: LAYER.treeTrunks,
      type: 'fill-extrusion',
      source: SOURCE.base,
      'source-layer': 'trees',
      minzoom: 16,
      filter: ['==', ['get', 'part'], 'trunk'],
      paint: {
        'fill-extrusion-color': t.tree.trunk,
        'fill-extrusion-height': growingHeight(['get', 'height']),
        'fill-extrusion-base': 0,
      },
    },
    {
      id: LAYER.trees,
      type: 'fill-extrusion',
      source: SOURCE.base,
      'source-layer': 'trees',
      minzoom: 13,
      filter: ['!=', ['get', 'part'], 'trunk'],
      layout: { 'fill-extrusion-rounded-corner-distance': 3 },
      paint: {
        'fill-extrusion-color': [
          'interpolate',
          ['linear'],
          ['get', 'height'],
          5,
          t.tree.low,
          8.5,
          t.tree.high,
        ],
        'fill-extrusion-height': growingHeight(['get', 'height']),
        // La copa se apoya en el suelo de lejos y se levanta sobre el tronco al acercarse (z16),
        // que es cuando el tronco entra en la tesela.
        'fill-extrusion-base': ['interpolate', ['linear'], ['zoom'], 15.4, 0, 16, ['get', 'base']],
        'fill-extrusion-opacity': 0.88,
        'fill-extrusion-vertical-gradient': true,
      },
    },
  ]
}
