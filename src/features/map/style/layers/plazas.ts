/**
 * PlazaLayer + PlazaHighlight: sitio de la plaza (suelo) y sus edificios en verde de marca.
 * Hover/selección/atenuado se resuelven con feature-state (sin reconstruir el estilo).
 */
import type { ExpressionSpecification, LayerSpecification } from 'maplibre-gl'
import { DEFAULT_PLAZA_TONE, type PlazaTone, shade } from '../../../../config/palette.ts'
import { LAYER, SOURCE } from '../ids.ts'
import { mapTheme as t } from '../theme.ts'
import { growingHeight } from './buildings.ts'

const state = (key: 'hover' | 'selected' | 'dimmed'): ExpressionSpecification => [
  'boolean',
  ['feature-state', key],
  false,
]

/**
 * Color propio de cada plaza (identidad en el mapa). Se resuelve con `match` sobre plazaId: una sola
 * expresión para todas, sin capas repetidas ni feature-state extra.
 */
function toneOf(
  tones: ReadonlyMap<string, PlazaTone>,
  key: keyof PlazaTone,
  amount = 0,
): ExpressionSpecification | string {
  const value = (tone: PlazaTone) => (amount === 0 ? tone[key] : shade(tone[key], amount))
  const entries = [...tones]
  const first = entries[0]
  if (!first) return value(DEFAULT_PLAZA_TONE)
  return [
    'match',
    ['get', 'plazaId'],
    first[0],
    value(first[1]),
    ...entries.slice(1).flatMap(([id, tone]) => [id, value(tone)]),
    value(DEFAULT_PLAZA_TONE),
  ] as ExpressionSpecification
}

export function plazaGroundLayers(tones: ReadonlyMap<string, PlazaTone>): LayerSpecification[] {
  return [
    {
      // Plaza confirmada y en obra: contorno punteado, sin color de identidad (todavía no es suya).
      id: LAYER.plazaSitesSoon,
      type: 'line',
      source: SOURCE.plazaSites,
      filter: ['get', 'comingSoon'],
      layout: { 'line-join': 'round' },
      paint: {
        'line-color': t.label.district,
        'line-width': 1.6,
        'line-dasharray': [2, 2],
        'line-opacity': 0.9,
      },
    },
    {
      id: LAYER.plazaSitesFill,
      type: 'fill',
      source: SOURCE.plazaSites,
      filter: ['get', 'active'],
      paint: {
        'fill-color': [
          'case',
          state('selected'),
          toneOf(tones, 'site', -0.16),
          state('hover'),
          toneOf(tones, 'site', -0.08),
          toneOf(tones, 'site'),
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
        'line-color': [
          'case',
          state('selected'),
          toneOf(tones, 'siteOutline', -0.35),
          toneOf(tones, 'siteOutline'),
        ],
        'line-width': ['case', state('selected'), 2.4, state('hover'), 2, 1.2],
        'line-opacity': ['case', state('dimmed'), 0.3, 0.9],
      },
    },
  ]
}

export function plazaBuildingLayers(tones: ReadonlyMap<string, PlazaTone>): LayerSpecification[] {
  const isActive: ExpressionSpecification = [
    'in',
    ['get', 'plazaId'],
    ['literal', [...tones.keys()]],
  ]
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
          toneOf(tones, 'building', -0.28),
          state('hover'),
          toneOf(tones, 'building', -0.14),
          state('dimmed'),
          t.plaza.buildingDimmed,
          toneOf(tones, 'building'),
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
