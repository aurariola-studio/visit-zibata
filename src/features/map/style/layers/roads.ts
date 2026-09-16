/** RoadLayer: jerarquía visual de vialidades (casing + relleno) sin interacción. */
import type { ExpressionSpecification, LayerSpecification } from 'maplibre-gl'
import { SOURCE } from '../ids.ts'
import { mapTheme as t } from '../theme.ts'

type Stops = [number, number][]

const width = (stops: Stops): ExpressionSpecification =>
  ['interpolate', ['exponential', 1.6], ['zoom'], ...stops.flat()] as ExpressionSpecification

const scaled = (stops: Stops, factor: number, extra = 0): Stops =>
  stops.map(([zoom, value]) => [zoom, value * factor + extra])

interface RoadClassStyle {
  id: string
  classes: string[]
  minzoom: number
  widths: Stops
  fill: string
  casing: string
}

const CLASSES: RoadClassStyle[] = [
  {
    id: 'service',
    classes: ['service'],
    minzoom: 15,
    widths: [
      [15, 0.6],
      [17, 3],
      [19, 9],
    ],
    fill: t.road.service,
    casing: t.road.streetCasing,
  },
  {
    id: 'street',
    classes: ['street'],
    minzoom: 12.5,
    widths: [
      [12.5, 0.35],
      [15, 1.6],
      [17, 6],
      [19, 18],
    ],
    fill: t.road.street,
    casing: t.road.streetCasing,
  },
  {
    id: 'tertiary',
    classes: ['tertiary'],
    minzoom: 12,
    widths: [
      [12, 0.7],
      [15, 3.2],
      [17, 10],
      [19, 28],
    ],
    fill: t.road.major,
    casing: t.road.majorCasing,
  },
  {
    id: 'primary',
    classes: ['primary'],
    minzoom: 12,
    widths: [
      [12, 0.9],
      [15, 4],
      [17, 12],
      [19, 32],
    ],
    fill: t.road.major,
    casing: t.road.majorCasing,
  },
  {
    id: 'highway',
    classes: ['highway'],
    minzoom: 12,
    widths: [
      [12, 1.3],
      [15, 5],
      [17, 15],
      [19, 40],
    ],
    fill: t.road.highway,
    casing: t.road.highwayCasing,
  },
]

export function roadLayers(): LayerSpecification[] {
  const layers: LayerSpecification[] = [
    {
      id: 'road-path',
      type: 'line',
      source: SOURCE.base,
      'source-layer': 'roads',
      minzoom: 16,
      filter: ['==', ['get', 'class'], 'path'],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': t.road.path,
        'line-width': width([
          [16, 0.8],
          [19, 2.5],
        ]),
        'line-dasharray': [1.5, 1.5],
      },
    },
  ]

  for (const style of CLASSES) {
    const filter = ['in', ['get', 'class'], ['literal', style.classes]] as ExpressionSpecification
    layers.push({
      id: `road-${style.id}-casing`,
      type: 'line',
      source: SOURCE.base,
      'source-layer': 'roads',
      minzoom: Math.max(style.minzoom, 13.5),
      filter,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': style.casing,
        'line-width': width(scaled(style.widths, 1, 1.4)),
        'line-opacity': ['interpolate', ['linear'], ['zoom'], 13.5, 0, 14.5, 1],
      },
    })
  }
  for (const style of CLASSES) {
    layers.push({
      id: `road-${style.id}`,
      type: 'line',
      source: SOURCE.base,
      'source-layer': 'roads',
      minzoom: style.minzoom,
      filter: ['in', ['get', 'class'], ['literal', style.classes]],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        // A zoom bajo las calles se leen como trazos cálidos (como en el plano); al acercarse, blancas.
        'line-color': ['interpolate', ['linear'], ['zoom'], 13.5, style.casing, 14.5, style.fill],
        'line-width': width(style.widths),
      },
    })
  }
  return layers
}
