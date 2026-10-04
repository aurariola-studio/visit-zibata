import { LngLatBounds, type Map as MapLibreMap, type PaddingOptions } from 'maplibre-gl'
import {
  type CameraState,
  INITIAL_CAMERA,
  INITIAL_CAMERA_COMPACT,
  PLAZA_FOCUS_PITCH,
  PLAZA_FOCUS_ZOOM,
  ZIBATA_EXTENT,
} from '../../config/map.ts'
import type { LatLng, Plaza } from '../../types/domain.ts'
import { prefersReducedMotion } from './mapRuntime.ts'

export const initialCamera = (compact: boolean): CameraState =>
  compact ? INITIAL_CAMERA_COMPACT : INITIAL_CAMERA

/**
 * Margen alrededor de las plazas, además del padding del mapa (barra, panel y controles, que MapLibre
 * ya descuenta). Es pequeño a propósito: cada píxel de margen aquí obliga a alejar la cámara, y en
 * pantallas bajas eso dejaba Zibatá diminuto. La separación con los bordes la resuelve la colocación
 * de marcadores, que reserva esas zonas.
 */
const OVERVIEW_MARGIN = { vertical: 16, horizontal: 12 }
const OVERVIEW_MAX_ZOOM = 15.2

/**
 * Solo el margen: MapLibre ya suma el padding del mapa (paneles y hoja), así que repetirlo lo contaría dos
 * veces. En pantallas bajas (móvil en horizontal) el margen se reduce con el espacio libre para que el
 * encuadre siempre quepa.
 *
 * El margen inferior es mayor: `fitBounds` encuadra sobre el plano, sin la inclinación de la cámara, y
 * con ella los puntos cercanos (los de abajo) caen más bajo de lo calculado. Sin ese extra, las plazas
 * del sur quedaban bajo la hoja en la vista inicial.
 */
const NEAR_EDGE_FACTOR = 1.6

export function overviewMargin(
  width: number,
  height: number,
  padding: Pick<PaddingOptions, 'top' | 'bottom' | 'left' | 'right'>,
): PaddingOptions {
  const freeHeight = Math.max(0, height - (padding.top ?? 0) - (padding.bottom ?? 0))
  const freeWidth = Math.max(0, width - (padding.left ?? 0) - (padding.right ?? 0))
  const vertical = Math.round(Math.min(OVERVIEW_MARGIN.vertical, freeHeight * 0.05))
  const horizontal = Math.round(Math.min(OVERVIEW_MARGIN.horizontal, freeWidth * 0.05))
  return {
    top: vertical,
    bottom: Math.round(Math.min(vertical * NEAR_EDGE_FACTOR, freeHeight * 0.08)),
    left: horizontal,
    right: horizontal,
  }
}

/** Encuadre de las zonas comerciales: se adapta a cualquier tamaño de pantalla y panel. */
export function overviewBounds(plazas: readonly Plaza[]): LngLatBounds {
  const active = plazas.filter((plaza) => plaza.active)
  if (active.length === 0) {
    const [west, south, east, north] = ZIBATA_EXTENT.bbox
    return new LngLatBounds([west, south], [east, north])
  }
  const bounds = new LngLatBounds()
  for (const plaza of active) bounds.extend([plaza.coordinates.lng, plaza.coordinates.lat])
  return bounds
}

/**
 * El rumbo girado (eje largo de Zibatá en vertical) solo conviene si el área libre es más alta que ancha;
 * un teléfono en horizontal, aunque sea "compacto", tiene el área libre apaisada como un escritorio.
 */
export function overviewBearing(compact: boolean, freeWidth: number, freeHeight: number): number {
  return compact && freeHeight > freeWidth ? INITIAL_CAMERA_COMPACT.bearing : INITIAL_CAMERA.bearing
}

export function overviewOptions(
  compact: boolean,
  margin: PaddingOptions,
  free: { width: number; height: number } = { width: 0, height: 1 },
) {
  const camera = initialCamera(compact)
  return {
    padding: margin,
    pitch: camera.pitch,
    bearing: overviewBearing(compact, free.width, free.height),
    maxZoom: OVERVIEW_MAX_ZOOM,
  }
}

/** Transición corta y suave hacia la plaza; salto directo si el usuario prefiere menos movimiento. */
export function focusPlaza(map: MapLibreMap, coordinates: LatLng, padding: PaddingOptions): void {
  const target = {
    center: [coordinates.lng, coordinates.lat] as [number, number],
    zoom: Math.max(map.getZoom(), PLAZA_FOCUS_ZOOM),
    pitch: Math.max(map.getPitch(), PLAZA_FOCUS_PITCH),
    padding,
  }
  if (prefersReducedMotion()) map.jumpTo(target)
  else map.easeTo({ ...target, duration: 900, essential: false })
}

/**
 * Vista general de Zibatá dentro del padding actual del mapa.
 *
 * El encuadre se calcula con la cámara sin inclinar y después se aplica la inclinación: una cámara
 * inclinada necesita alejarse mucho más para meter el mismo terreno, y en pantallas bajas eso dejaba
 * Zibatá diminuto en medio del lienzo. Al inclinar solo se ve más terreno, nunca menos.
 */
export function resetCamera(
  map: Pick<MapLibreMap, 'cameraForBounds' | 'easeTo' | 'getContainer' | 'getPadding'>,
  plazas: readonly Plaza[],
  compact: boolean,
  duration = prefersReducedMotion() ? 0 : 1000,
): void {
  const { clientWidth, clientHeight } = map.getContainer()
  const padding = map.getPadding()
  const margin = overviewMargin(clientWidth, clientHeight, padding)
  const free = {
    width: clientWidth - (padding.left ?? 0) - (padding.right ?? 0),
    height: clientHeight - (padding.top ?? 0) - (padding.bottom ?? 0),
  }
  const options = overviewOptions(compact, margin, free)
  const flat = map.cameraForBounds(overviewBounds(plazas), { ...options, pitch: 0 })
  if (!flat) return
  map.easeTo({
    center: flat.center,
    zoom: Math.min(flat.zoom ?? OVERVIEW_MAX_ZOOM, OVERVIEW_MAX_ZOOM),
    bearing: options.bearing,
    pitch: options.pitch,
    padding: margin,
    duration,
  })
}

export function updatePadding(map: MapLibreMap, padding: PaddingOptions): void {
  if (prefersReducedMotion()) map.jumpTo({ padding })
  else map.easeTo({ padding, duration: 350 })
}
