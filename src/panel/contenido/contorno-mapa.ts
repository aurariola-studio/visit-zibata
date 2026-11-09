import 'maplibre-gl/dist/maplibre-gl.css'
import type { Feature, FeatureCollection, Point, Polygon } from 'geojson'
import { type GeoJSONSource, Map as MapLibreMap, type PointLike } from 'maplibre-gl'
import { MAP_ASSETS, MAP_LIMITS, ZIBATA_EXTENT } from '../../config/map.ts'
import { ensureMapRuntime } from '../../features/map/mapRuntime.ts'
import { buildMapStyle } from '../../features/map/style/buildMapStyle.ts'
import { absoluteAssetUrl } from '../../lib/assets.ts'
import type { Plaza } from '../../types/domain.ts'

/**
 * El lienzo con el mapa del contorno de una plaza. **Se carga bajo demanda** (`import()` desde
 * `contorno.ts`): MapLibre pesa mucho y solo hace falta cuando alguien pulsa "Dibujar sobre el mapa".
 *
 * Usa el mismo estilo y las mismas teselas que la guía (`buildMapStyle`), sin las capas de realismo.
 *
 * **No guarda nada ni decide nada.** La lista de vértices de `contorno.ts` es la única fuente de verdad:
 * arrastrar un vértice, o pulsar un punto entre dos, solo avisa a quien lo abrió (`alMover`, `alAnadir`),
 * que cambia la lista y vuelve a dibujar el mapa con `actualizar`. Quitar un vértice se hace en la lista.
 *
 * Los tiradores (vértices y puntos medios) son capas del mapa, no elementos de la página: no se pueden
 * enfocar con el teclado, y para eso está la lista. Su área de acierto mide 24 × 24 px, el mínimo de
 * WCAG 2.5.8, aunque el círculo que se ve sea más pequeño.
 */

export interface OpcionesMapa {
  contenedor: HTMLElement
  /** Las demás plazas, tal como las dibuja la guía. La que se edita no entra: se dibuja su borrador. */
  plazas: readonly unknown[]
  marcador: { lat: number; lng: number }
  /** El contorno actual, cerrado, o `null` si ahora mismo no se puede leer. */
  anillo: number[][] | null
  alMover: (i: number, lng: number, lat: number) => void
  alAnadir: (despuesDe: number, lng: number, lat: number) => void
}

export interface MapaDelContorno {
  actualizar: (anillo: number[][] | null) => void
  destruir: () => void
}

const FUENTE = {
  poligono: 'borrador-poligono',
  vertices: 'borrador-vertices',
  medios: 'borrador-medios',
}
const CAPA = {
  relleno: 'borrador-relleno',
  linea: 'borrador-linea',
  medios: 'borrador-medios',
  vertices: 'borrador-vertices',
  marcador: 'borrador-marcador',
}
/** Medio lado del área de acierto de un tirador: 12 px → 24 × 24 px. */
const ACIERTO = 12
const VACIO: FeatureCollection = { type: 'FeatureCollection', features: [] }

const OLIVO = '#566f2d'

function datos(anillo: number[][] | null): {
  poligono: FeatureCollection
  vertices: FeatureCollection
  medios: FeatureCollection
} {
  if (!anillo || anillo.length < 4) return { poligono: VACIO, vertices: VACIO, medios: VACIO }
  const abierto = anillo.slice(0, -1)
  const poligono: Feature<Polygon> = {
    type: 'Feature',
    properties: {},
    geometry: { type: 'Polygon', coordinates: [anillo] },
  }
  const vertices: Feature<Point>[] = abierto.map((p, i) => ({
    type: 'Feature',
    properties: { i },
    geometry: { type: 'Point', coordinates: p },
  }))
  const medios: Feature<Point>[] = abierto.map((p, i) => {
    const q = abierto[(i + 1) % abierto.length] ?? p
    return {
      type: 'Feature',
      properties: { despues: i },
      geometry: {
        type: 'Point',
        coordinates: [((p[0] ?? 0) + (q[0] ?? 0)) / 2, ((p[1] ?? 0) + (q[1] ?? 0)) / 2],
      },
    }
  })
  return {
    poligono: { type: 'FeatureCollection', features: [poligono] },
    vertices: { type: 'FeatureCollection', features: vertices },
    medios: { type: 'FeatureCollection', features: medios },
  }
}

/** Abre el mapa. Rechaza si no se puede crear (sin WebGL, por ejemplo): la lista sigue sirviendo. */
export async function abrirMapaDelContorno(opciones: OpcionesMapa): Promise<MapaDelContorno> {
  ensureMapRuntime()
  const { contenedor } = opciones
  const mapa = new MapLibreMap({
    container: contenedor,
    style: buildMapStyle({
      tilesUrl: absoluteAssetUrl(MAP_ASSETS.tiles),
      plazaBuildingsUrl: absoluteAssetUrl(MAP_ASSETS.plazaBuildings),
      // `buildMapStyle` solo lee de cada plaza su id, nombre, estado y contorno, que el panel ya tiene.
      plazas: opciones.plazas as Plaza[],
      boundary: ZIBATA_EXTENT.boundary,
      areaBbox: ZIBATA_EXTENT.areaBbox,
      center: ZIBATA_EXTENT.center,
    }),
    center: [opciones.marcador.lng, opciones.marcador.lat],
    zoom: 17,
    minZoom: MAP_LIMITS.minZoom,
    maxZoom: MAP_LIMITS.maxZoom,
    maxBounds: [
      [ZIBATA_EXTENT.areaBbox[0], ZIBATA_EXTENT.areaBbox[1]],
      [ZIBATA_EXTENT.areaBbox[2], ZIBATA_EXTENT.areaBbox[3]],
    ],
    // Dibujar un contorno es plano: sin giro ni inclinación.
    dragRotate: false,
    pitchWithRotate: false,
    touchPitch: false,
    attributionControl: { compact: true },
    renderWorldCopies: false,
  })
  mapa.touchZoomRotate.disableRotation()

  let anillo = opciones.anillo
  let arrastrando: number | null = null
  let vivo = true

  /** Dónde cae cada tirador en la página: lo lee la prueba E2E para arrastrar de verdad con el ratón. */
  const publicarPosiciones = () => {
    if (!vivo || !anillo) return
    const px = (p: number[]) => {
      const { x, y } = mapa.project([p[0] ?? 0, p[1] ?? 0])
      return [Math.round(x), Math.round(y)]
    }
    const abierto = anillo.slice(0, -1)
    contenedor.dataset.vertices = JSON.stringify(abierto.map(px))
    contenedor.dataset.medios = JSON.stringify(
      abierto.map((p, i) => {
        const q = abierto[(i + 1) % abierto.length] ?? p
        return px([((p[0] ?? 0) + (q[0] ?? 0)) / 2, ((p[1] ?? 0) + (q[1] ?? 0)) / 2])
      }),
    )
  }

  const pintar = () => {
    const d = datos(anillo)
    ;(mapa.getSource(FUENTE.poligono) as GeoJSONSource | undefined)?.setData(d.poligono)
    ;(mapa.getSource(FUENTE.vertices) as GeoJSONSource | undefined)?.setData(d.vertices)
    ;(mapa.getSource(FUENTE.medios) as GeoJSONSource | undefined)?.setData(d.medios)
    publicarPosiciones()
  }

  const buscar = (punto: PointLike, capa: string) => {
    const [x, y] = Array.isArray(punto) ? punto : [punto.x, punto.y]
    return mapa.queryRenderedFeatures(
      [
        [(x ?? 0) - ACIERTO, (y ?? 0) - ACIERTO],
        [(x ?? 0) + ACIERTO, (y ?? 0) + ACIERTO],
      ],
      { layers: [capa] },
    )
  }

  mapa.once('load', () => {
    mapa.addSource(FUENTE.poligono, { type: 'geojson', data: VACIO })
    mapa.addSource(FUENTE.vertices, { type: 'geojson', data: VACIO })
    mapa.addSource(FUENTE.medios, { type: 'geojson', data: VACIO })
    mapa.addLayer({
      id: CAPA.relleno,
      type: 'fill',
      source: FUENTE.poligono,
      paint: { 'fill-color': OLIVO, 'fill-opacity': 0.2 },
    })
    mapa.addLayer({
      id: CAPA.linea,
      type: 'line',
      source: FUENTE.poligono,
      paint: { 'line-color': OLIVO, 'line-width': 2.5 },
    })
    mapa.addLayer({
      id: CAPA.medios,
      type: 'circle',
      source: FUENTE.medios,
      paint: {
        'circle-radius': 5,
        'circle-color': '#ffffff',
        'circle-stroke-color': OLIVO,
        'circle-stroke-width': 1.5,
        'circle-opacity': 0.9,
      },
    })
    mapa.addLayer({
      id: CAPA.vertices,
      type: 'circle',
      source: FUENTE.vertices,
      paint: {
        'circle-radius': 8,
        'circle-color': '#ffffff',
        'circle-stroke-color': OLIVO,
        'circle-stroke-width': 3,
      },
    })
    pintar()
    if (anillo && anillo.length >= 4) {
      const lng = anillo.map((p) => p[0] ?? 0)
      const lat = anillo.map((p) => p[1] ?? 0)
      mapa.fitBounds(
        [
          [Math.min(...lng), Math.min(...lat)],
          [Math.max(...lng), Math.max(...lat)],
        ],
        // Más margen abajo: la atribución (obligatoria) ocupa esa franja y taparía los vértices de abajo.
        { padding: { top: 50, left: 50, right: 50, bottom: 100 }, maxZoom: 18.5, duration: 0 },
      )
    }
    contenedor.dataset.listo = 'si'
    publicarPosiciones()
  })
  mapa.on('moveend', publicarPosiciones)
  mapa.on('resize', publicarPosiciones)

  // Arrastrar un vértice: mientras dura, el mapa no se desplaza.
  const empezar = (punto: PointLike): boolean => {
    const vertice = buscar(punto, CAPA.vertices)[0]
    if (!vertice) return false
    arrastrando = Number(vertice.properties?.i)
    mapa.dragPan.disable()
    mapa.getCanvas().style.cursor = 'grabbing'
    return true
  }
  const mover = (lng: number, lat: number) => {
    if (arrastrando !== null) opciones.alMover(arrastrando, lng, lat)
  }
  const terminar = () => {
    if (arrastrando === null) return
    arrastrando = null
    mapa.dragPan.enable()
    mapa.getCanvas().style.cursor = ''
  }
  mapa.on('mousedown', (e) => {
    if (empezar(e.point)) e.preventDefault()
  })
  mapa.on('touchstart', (e) => {
    if (e.points.length === 1 && empezar(e.point)) e.preventDefault()
  })
  mapa.on('mousemove', (e) => {
    if (arrastrando !== null) mover(e.lngLat.lng, e.lngLat.lat)
    else {
      const sobre = buscar(e.point, CAPA.vertices).length > 0
      const sobreMedio = !sobre && buscar(e.point, CAPA.medios).length > 0
      mapa.getCanvas().style.cursor = sobre ? 'grab' : sobreMedio ? 'copy' : ''
    }
  })
  mapa.on('touchmove', (e) => {
    if (arrastrando !== null) mover(e.lngLat.lng, e.lngLat.lat)
  })
  mapa.on('mouseup', terminar)
  mapa.on('touchend', terminar)
  mapa.on('touchcancel', terminar)

  // Un punto blanco entre dos vértices añade uno ahí.
  mapa.on('click', (e) => {
    if (buscar(e.point, CAPA.vertices).length > 0) return
    const medio = buscar(e.point, CAPA.medios)[0]
    const geometria = medio?.geometry
    if (geometria?.type !== 'Point') return
    const [lng = 0, lat = 0] = geometria.coordinates
    opciones.alAnadir(Number(medio?.properties?.despues), lng, lat)
  })

  return {
    actualizar(siguiente) {
      anillo = siguiente
      if (mapa.isStyleLoaded() || mapa.getSource(FUENTE.poligono)) pintar()
    },
    destruir() {
      vivo = false
      mapa.remove()
      delete contenedor.dataset.listo
      delete contenedor.dataset.vertices
      delete contenedor.dataset.medios
    },
  }
}
