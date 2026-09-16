/**
 * PlazaLayer + PlazaHighlight: sitio de la plaza (suelo) y sus edificios en verde de marca.
 * Hover/selección/atenuado se resuelven con feature-state (sin reconstruir el estilo).
 */
import type { ExpressionSpecification, LayerSpecification } from 'maplibre-gl'
import { LAYER, SOURCE } from '../ids.ts'
import { mapTheme as t } from '../theme.ts'
import { growingHeight } from './buildings.ts'

const state = (key: 'hover' | 'selected' | 'dimmed'): ExpressionSpecification => [
  'boolean',
  ['feature-state', key],
  false,
]

export function plazaGroundLayers(): LayerSpecification[] {
  return [
    {
      id: LAYER.plazaSitesFill,
      type: 'fill',
      source: SOURCE.plazaSites,
      filter: ['get', 'active'],
      paint: {
        'fill-color': [
          'case',
          state('selected'),
          t.plaza.siteSelected,
          state('hover'),
          t.plaza.siteHover,
          t.plaza.site,
        ],
        'fill-opacity': ['case', state('dimmed'), 0.35, 0.95],
      },
    },
    {
      id: LAYER.plazaSitesOutline,
      type: 'line',
      source: SOURCE.plazaSites,
      filter: ['get', 'active'],
      layout: { 'line-join': 'round' },
      paint: {
        'line-color': ['case', state('selected'), t.plaza.siteOutlineSelected, t.plaza.siteOutline],
        'line-width': ['case', state('selected'), 2.4, state('hover'), 2, 1.2],
        'line-opacity': ['case', state('dimmed'), 0.3, 0.9],
      },
    },
  ]
}

export function plazaBuildingLayers(activePlazaIds: readonly string[]): LayerSpecification[] {
  const isActive: ExpressionSpecification = ['in', ['get', 'plazaId'], ['literal', activePlazaIds]]
  return [
    {
      id: LAYER.plazaBuildingsInactive,
      type: 'fill-extrusion',
      source: SOURCE.plazaBuildings,
      filter: ['!', isActive],
      paint: {
        'fill-extrusion-color': t.plaza.inactiveBuilding,
        'fill-extrusion-height': growingHeight(['get', 'height']),
        'fill-extrusion-vertical-gradient': true,
      },
    },
    {
      id: LAYER.plazaBuildings,
      type: 'fill-extrusion',
      source: SOURCE.plazaBuildings,
      filter: isActive,
      layout: { 'fill-extrusion-rounded-corner-distance': 0.8 },
      paint: {
        'fill-extrusion-color': [
          'case',
          state('selected'),
          t.plaza.buildingSelected,
          state('hover'),
          t.plaza.buildingHover,
          state('dimmed'),
          t.plaza.buildingDimmed,
          t.plaza.building,
        ],
        // Al pasar el cursor la plaza se eleva ligeramente.
        'fill-extrusion-height': growingHeight([
          '+',
          ['get', 'height'],
          ['case', state('selected'), 2.5, state('hover'), 1.5, 0],
        ]),
        'fill-extrusion-vertical-gradient': true,
      },
    },
  ]
}
