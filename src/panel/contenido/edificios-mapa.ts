import 'maplibre-gl/dist/maplibre-gl.css'
import type { Feature, FeatureCollection, Point } from 'geojson'
import { type GeoJSONSource, Map as MapLibreMap, type MapMouseEvent } from 'maplibre-gl'
import { MAP_ASSETS, MAP_LIMITS, ZIBATA_EXTENT } from '../../config/map.ts'
import { puntoEnContorno, puntoInterior } from '../../data/geometria.ts'
import { ensureMapRuntime } from '../../features/map/mapRuntime.ts'
import { buildMapStyle } from '../../features/map/style/buildMapStyle.ts'
import { LAYER } from '../../features/map/style/ids.ts'
import { absoluteAssetUrl } from '../../lib/assets.ts'
import type { Plaza } from '../../types/domain.ts'

/**
 * El mapa para elegir un edificio y ajustarlo. **Se carga bajo demanda** (`import()` desde `edificios.ts`), como el
 * del contorno: MapLibre pesa mucho y solo hace falta al pulsar "Elegir en el mapa".
 *
 * No guarda nada ni decide nada: avisa de qué edificio se pulsó (`alElegir`) o por qué no se puede ajustar
 * (`alRechazar`). Lo que se hace con él lo decide el formulario, y lo que se manda al Worker es **un punto dentro
 * de la huella**, que `map:build` resuelve contra el crudo de Overture y exige que caiga en exactamente una.
 *
 * Por eso no se ofrece cualquier cosa que se pueda pulsar. Se rechaza, con su motivo:
 *
 *  - un volumen sintético (`src: synthetic`): `build-map` lo pone en lugar de las huellas reales de esa plaza, y
 *    un ajuste sobre él no cambiaría nada (el build lo da por error);
 *  - más de un edificio en el punto pulsado;
 *  - un edificio que ya tiene un ajuste (dos sobre la misma huella son un error del build): se quita desde la lista;
 *  - un edificio sin un punto interior a más de 1 m del borde: la geometría de las teselas se recorta y se
 *    simplifica, y un punto al filo puede caer fuera de la huella original.
 *
 * El mapa no es operable con el teclado: para eso están las coordenadas que se pueden escribir.
 */

export interface EdificioElegido {
  punto: { lat: number; lng: number }
  /** El número que `build-map` le dio en esta construcción del mapa: solo para mostrar, no es estable. */
  id: number
  /** La altura estimada que trae el mapa, en metros, si la trae. */
  alturaM: number | null
  /** De dónde sale la huella (`osm`, `google`, `microsoft`). */
  fuente: string
  /** A cuántos metros del borde queda el punto. */
  margenM: number
}

export interface OpcionesMapaEdificios {
  contenedor: HTMLElement
  plazas: readonly unknown[]
  /** Los ajustes que ya existen, para marcarlos y para no ajustar dos veces el mismo edificio. */
  ajustes: readonly { punto: { lat: number; lng: number } }[]
  /** Dónde abrir el mapa; sin él, el centro de Zibatá. */
  centro?: { lat: number; lng: number }
  alElegir: (edificio: EdificioElegido) => void
  alRechazar: (motivo: string) => void
}

export interface MapaDeEdificios {
  centrarEn: (punto: { lat: number; lng: number }) => void
  destruir: () => void
}

/** Menos que esto al borde y el punto puede caer fuera de la huella original. */
const MARGEN_MINIMO_M = 1
const VACIO: FeatureCollection = { type: 'FeatureCollection', features: [] }
const OLIVO = '#566f2d'
const ROJO = '#b3261e'

const FUENTE = { elegido: 'edificio-elegido', ajustes: 'edificio-ajustes' }
const CAPA = {
  elegidoRelleno: 'edificio-elegido-relleno',
  elegidoLinea: 'edificio-elegido-linea',
  ajustes: 'edificio-ajustes',
}

/** Las capas del estilo que dibujan edificios: las que se pueden pulsar. */
const CAPAS_DE_EDIFICIOS = [
  LAYER.plazaBuildings,
  LAYER.plazaBuildingsInactive,
  LAYER.buildings,
  LAYER.buildingsOutside,
] as const

type Anillo = number[][]

const poligonosDe = (geometria: GeoJSON.Geometry): Anillo[][] =>
  geometria.type === 'Polygon'
    ? [geometria.coordinates as Anillo[]]
    : geometria.type === 'MultiPolygon'
      ? (geometria.coordinates as Anillo[][])
      : []

export async function abrirMapaDeEdificios(
  opciones: OpcionesMapaEdificios,
): Promise<MapaDeEdificios> {
  ensureMapRuntime()
  const { contenedor } = opciones
  const mapa = new MapLibreMap({
    container: contenedor,
    style: buildMapStyle({
      tilesUrl: absoluteAssetUrl(MAP_ASSETS.tiles),
      plazaBuildingsUrl: absoluteAssetUrl(MAP_ASSETS.plazaBuildings),
      plazas: opciones.plazas as Plaza[],
      boundary: ZIBATA_EXTENT.boundary,
      areaBbox: ZIBATA_EXTENT.areaBbox,
      center: ZIBATA_EXTENT.center,
    }),
    center: opciones.centro ? [opciones.centro.lng, opciones.centro.lat] : ZIBATA_EXTENT.center,
    zoom: 17,
    minZoom: MAP_LIMITS.minZoom,
    maxZoom: MAP_LIMITS.maxZoom,
    maxBounds: [
      [ZIBATA_EXTENT.areaBbox[0], ZIBATA_EXTENT.areaBbox[1]],
      [ZIBATA_EXTENT.areaBbox[2], ZIBATA_EXTENT.areaBbox[3]],
    ],
    // Elegir un edificio es plano: sin giro ni inclinación, para que lo que se pulsa sea lo que se ve.
    dragRotate: false,
    pitch: 0,
    pitchWithRotate: false,
    touchPitch: false,
    attributionControl: { compact: true },
    renderWorldCopies: false,
  })
  mapa.touchZoomRotate.disableRotation()
  let vivo = true

  const marcarElegido = (poligonos: Anillo[][] | null) => {
    const datos: FeatureCollection = poligonos
      ? {
          type: 'FeatureCollection',
          features: poligonos.map((coordinates) => ({
            type: 'Feature',
            properties: {},
            geometry: { type: 'Polygon', coordinates },
          })),
        }
      : VACIO
    ;(mapa.getSource(FUENTE.elegido) as GeoJSONSource | undefined)?.setData(datos)
  }

  const marcarAjustes = () => {
    const puntos: Feature<Point>[] = opciones.ajustes.map(({ punto }) => ({
      type: 'Feature',
      properties: {},
      geometry: { type: 'Point', coordinates: [punto.lng, punto.lat] },
    }))
    ;(mapa.getSource(FUENTE.ajustes) as GeoJSONSource | undefined)?.setData({
      type: 'FeatureCollection',
      features: puntos,
    })
  }

  mapa.once('load', () => {
    mapa.addSource(FUENTE.elegido, { type: 'geojson', data: VACIO })
    mapa.addSource(FUENTE.ajustes, { type: 'geojson', data: VACIO })
    mapa.addLayer({
      id: CAPA.elegidoRelleno,
      type: 'fill',
      source: FUENTE.elegido,
      paint: { 'fill-color': OLIVO, 'fill-opacity': 0.35 },
    })
    mapa.addLayer({
      id: CAPA.elegidoLinea,
      type: 'line',
      source: FUENTE.elegido,
      paint: { 'line-color': OLIVO, 'line-width': 3 },
    })
    mapa.addLayer({
      id: CAPA.ajustes,
      type: 'circle',
      source: FUENTE.ajustes,
      paint: {
        'circle-radius': 6,
        'circle-color': '#ffffff',
        'circle-stroke-color': ROJO,
        'circle-stroke-width': 3,
      },
    })
    marcarAjustes()
    contenedor.dataset.listo = 'si'
  })

  const capasPresentes = () => CAPAS_DE_EDIFICIOS.filter((capa) => mapa.getLayer(capa))

  mapa.on('click', (e: MapMouseEvent) => {
    if (!vivo) return
    const encontrados = mapa.queryRenderedFeatures(e.point, { layers: capasPresentes() })
    if (encontrados.length === 0) {
      marcarElegido(null)
      delete contenedor.dataset.seleccion
      opciones.alRechazar('Ahí no hay ningún edificio. Pulsa sobre uno.')
      return
    }
    // El mismo edificio sale en más de una capa (la de teselas y la de la plaza) y en trozos por tesela:
    // se cuenta por su número, no por cuántas veces aparece.
    const ids = new Set(encontrados.map((f) => String(f.properties?.id)))
    if (ids.size > 1) {
      opciones.alRechazar('Hay más de un edificio en ese punto. Acerca el mapa y pulsa otra vez.')
      return
    }
    if (encontrados.some((f) => f.properties?.src === 'synthetic')) {
      marcarElegido(null)
      opciones.alRechazar(
        'Ese es un volumen generado, no una huella real: esa plaza sustituye sus huellas por él, y ajustarlo no cambiaría nada.',
      )
      return
    }

    const clic = { lat: e.lngLat.lat, lng: e.lngLat.lng }
    // El trozo que contiene el clic; un edificio cortado por una tesela se devuelve en varios.
    const trozos = encontrados.flatMap((f) => poligonosDe(f.geometry))
    const poligono = trozos.find((anillos) => puntoEnContorno(clic, anillos[0] ?? []))
    if (!poligono) {
      opciones.alRechazar(
        'No se pudo leer la forma de ese edificio. Acerca el mapa y pulsa otra vez.',
      )
      return
    }
    const interior = puntoInterior(poligono)
    if (!interior || interior.margenM < MARGEN_MINIMO_M) {
      marcarElegido(null)
      opciones.alRechazar(
        `Ese edificio es demasiado estrecho para fijarlo con seguridad (su punto más interior queda a ${(interior?.margenM ?? 0).toFixed(1)} m del borde). Acerca el mapa o elige otro.`,
      )
      return
    }
    // Un edificio que ya tiene un ajuste no se ajusta otra vez: dos sobre la misma huella son un error del build.
    const yaAjustado = opciones.ajustes.some(({ punto }) =>
      trozos.some((anillos) => puntoEnContorno(punto, anillos[0] ?? [])),
    )
    if (yaAjustado) {
      marcarElegido(poligono ? [poligono] : null)
      opciones.alRechazar(
        'Ese edificio ya tiene un ajuste. Quítalo desde la lista de ajustes si quieres cambiarlo.',
      )
      return
    }

    const propiedades = encontrados[0]?.properties ?? {}
    marcarElegido([poligono])
    const elegido: EdificioElegido = {
      punto: { lat: Number(interior.lat.toFixed(6)), lng: Number(interior.lng.toFixed(6)) },
      id: Number(propiedades.id),
      alturaM: typeof propiedades.height === 'number' ? propiedades.height : null,
      fuente: String(propiedades.src ?? ''),
      margenM: interior.margenM,
    }
    // Lo lee la prueba E2E, y es lo mismo que recibe el formulario.
    contenedor.dataset.seleccion = JSON.stringify(elegido)
    opciones.alElegir(elegido)
  })

  mapa.on('mousemove', (e) => {
    mapa.getCanvas().style.cursor =
      mapa.queryRenderedFeatures(e.point, { layers: capasPresentes() }).length > 0 ? 'pointer' : ''
  })

  return {
    centrarEn(punto) {
      mapa.jumpTo({ center: [punto.lng, punto.lat], zoom: 18 })
    },
    destruir() {
      vivo = false
      mapa.remove()
      delete contenedor.dataset.listo
      delete contenedor.dataset.seleccion
    },
  }
}
