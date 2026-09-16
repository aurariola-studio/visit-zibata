/**
 * Configuración de UI del mapa: estado inicial de cámara y límites. La extensión geográfica viene
 * del pipeline GIS (data/geographic/extent.json), así que crece con Zibatá sin tocar código.
 */
import type { Polygon } from 'geojson'
import extent from '../../data/geographic/extent.json'

export type Bbox = [number, number, number, number]

export const ZIBATA_EXTENT = {
  bbox: extent.bbox as Bbox,
  areaBbox: extent.areaBbox as Bbox,
  center: extent.center as [number, number],
  boundary: extent.boundary as Polygon,
}

export const MAP_ASSETS = {
  pmtiles: 'map/zibata.pmtiles',
  plazaBuildings: 'map/plaza-buildings.geojson',
}

export interface CameraState {
  center: [number, number]
  zoom: number
  pitch: number
  bearing: number
}

/** Ligeramente inclinada, lo bastante lejos para entender Zibatá y lo bastante cerca para ver volumen. */
export const INITIAL_CAMERA: CameraState = {
  // Ligeramente al este del centroide: ahí se concentran las plazas comerciales.
  center: [ZIBATA_EXTENT.center[0] + 0.0055, ZIBATA_EXTENT.center[1] + 0.0004],
  zoom: 14.65,
  pitch: 55,
  bearing: -10,
}

/**
 * Pantallas verticales: se gira el mapa para que el eje largo de Zibatá (oeste–este, ~96°) quede
 * vertical, con las plazas del oriente más cerca del observador. Así cabe con más detalle.
 */
export const INITIAL_CAMERA_COMPACT: CameraState = {
  ...INITIAL_CAMERA,
  zoom: 13.9,
  pitch: 50,
  bearing: -80,
}

export const MAP_LIMITS = {
  minZoom: 12.6,
  maxZoom: 19,
  maxPitch: 72,
  /** El área de datos con un pequeño margen: no se puede "salir" de Zibatá. */
  maxBounds: [
    ZIBATA_EXTENT.areaBbox[0] - 0.01,
    ZIBATA_EXTENT.areaBbox[1] - 0.01,
    ZIBATA_EXTENT.areaBbox[2] + 0.01,
    ZIBATA_EXTENT.areaBbox[3] + 0.01,
  ] as Bbox,
}

/** Zoom al que la cámara se acerca al seleccionar una plaza. */
export const PLAZA_FOCUS_ZOOM = 16.4
export const PLAZA_FOCUS_PITCH = 58

/**
 * Textos propios de MapLibre (atribución y ayuda de teclado) en español: por defecto llegan en inglés y un
 * lector de pantalla los mezclaría con la interfaz. Las claves son las de `maplibre-gl`.
 */
export const MAP_LOCALE: Record<string, string> = {
  'AttributionControl.ToggleAttribution': 'Mostrar u ocultar la atribución',
  'AttributionControl.MapFeedback': 'Comentarios sobre el mapa',
  'Map.Title': 'Mapa',
  'NavigationControl.ZoomIn': 'Acercar',
  'NavigationControl.ZoomOut': 'Alejar',
  'NavigationControl.ResetBearing': 'Orientar al norte',
  'GeolocateControl.FindMyLocation': 'Mostrar mi ubicación',
  'GeolocateControl.LocationNotAvailable': 'Ubicación no disponible',
}
