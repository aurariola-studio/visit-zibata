/**
 * Marcadores de puntos de interés: un negocio cada uno, en crema y tinta. Son un enlace a su ficha, como su tarjeta.
 * Ceden siempre ante los marcadores de zona, así que se colocan después de ellos, con sus cajas (ver
 * `colocarPuntos.ts`).
 */
import { type Map as MapLibreMap, Marker } from 'maplibre-gl'
import { type RefObject, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CategoryIcon } from '../../components/icons/CategoryIcon.tsx'
import { t, useLocale } from '../../i18n/index.ts'
import { alPulsarEnlace } from '../../lib/navegacion.ts'
import { rutaDeLugar } from '../../lib/url-state.ts'
import {
  type Caja,
  circuloPisa,
  colocarPuntos,
  type ModoDePunto,
  NOMBRE_DESDE_ZOOM,
} from './colocarPuntos.ts'
import { CAPA_ETIQUETAS, CAPA_TALLOS, COMPACT_BELOW_ZOOM } from './PlazaMarkers.tsx'
import styles from './PuntoMarkers.module.css'

export interface PuntoEnElMapa {
  /** El id del registro del punto en `plazas.json`. */
  id: string
  placeId: string
  slug: string
  name: string
  icon: string
  lng: number
  lat: number
}

/** Lo que el reparto de zonas deja dicho para quien se coloca después. */
export interface SitioDeZonas {
  cajas: Caja[]
  alCambiar: () => void
}

/** Por encima de los tallos y por debajo de cualquier marcador de zona; el elegido, por delante de todos. */
const CAPA_PUNTOS = CAPA_TALLOS + 10_000
const CAPA_CON_RESULTADO = CAPA_ETIQUETAS + 5_000
const CAPA_PUNTO_ELEGIDO = CAPA_ETIQUETAS + 15_000
/** Lo que ocupa la pieza además del texto: borde, ícono, huecos y relleno. */
const ADORNO = 32
const MARGEN_CONTROLES = 64

export function PuntoMarkers({
  map,
  puntos,
  matchCounts,
  selectedPuntoId,
  zonas,
  onSelect,
}: {
  map: MapLibreMap
  puntos: readonly PuntoEnElMapa[]
  matchCounts: ReadonlyMap<string, number> | null
  selectedPuntoId: string | null
  zonas: RefObject<SitioDeZonas>
  onSelect: (placeId: string) => void
}) {
  const [elements, setElements] = useState<Map<string, HTMLElement>>(new Map())
  const [modos, setModos] = useState<ReadonlyMap<string, ModoDePunto>>(new Map())
  const [cerca, setCerca] = useState(false)
  const textos = useRef(new Map<string, HTMLElement>())
  const idioma = useLocale()
  /** El que tiene el foco del teclado pasa por delante: no puede quedar tapado por una zona. */
  const conFoco = useRef<string | null>(null)

  useEffect(() => {
    const creados = new Map<string, HTMLElement>()
    const marcadores = puntos.map((punto) => {
      // Un contenedor sin tamaño sobre el punto: la pieza se coloca a su alrededor según su modo.
      const element = document.createElement('div')
      element.style.zIndex = String(CAPA_PUNTOS)
      creados.set(punto.id, element)
      return new Marker({ element, anchor: 'center', subpixelPositioning: true })
        .setLngLat([punto.lng, punto.lat])
        .addTo(map)
    })
    setElements(creados)
    return () => {
      for (const marcador of marcadores) marcador.remove()
    }
  }, [map, puntos])

  useEffect(() => {
    const colocar = () => {
      const marco = map.getContainer().getBoundingClientRect()
      const { top = 0, bottom = 0 } = map.getPadding()
      const zoom = map.getZoom()
      const en = puntos.map((punto) => {
        const { x, y } = map.project([punto.lng, punto.lat])
        const texto = textos.current.get(punto.id)?.offsetWidth || punto.name.length * 7.2
        return {
          id: punto.id,
          x: marco.left + x,
          y: marco.top + y,
          ancho: texto + ADORNO,
          elegido: punto.id === selectedPuntoId,
        }
      })
      const siguientes = colocarPuntos(
        en,
        zonas.current.cajas,
        zoom,
        {
          left: marco.left + 8,
          right: marco.right - MARGEN_CONTROLES,
          top: marco.top + top,
          bottom: marco.bottom - bottom,
        },
        COMPACT_BELOW_ZOOM,
      )
      // El que está más abajo en pantalla está más cerca: va por encima.
      for (const punto of en) {
        const element = elements.get(punto.id)
        if (!element) continue
        // Con filtros, el que cumple va por delante de las zonas atenuadas. Si una que cumple lo tapa en la vista
        // completa, se queda debajo: manda la zona.
        const cumple = matchCounts?.get(punto.id) && !circuloPisa(punto, zonas.current.cajas)
        const delante = punto.elegido || conFoco.current === punto.id
        const base = delante ? CAPA_PUNTO_ELEGIDO : cumple ? CAPA_CON_RESULTADO : CAPA_PUNTOS
        element.style.zIndex = String(base + Math.round(punto.y))
      }
      setCerca(zoom >= NOMBRE_DESDE_ZOOM)
      setModos((antes) =>
        antes.size === siguientes.size &&
        [...siguientes].every(([id, modo]) => antes.get(id) === modo)
          ? antes
          : siguientes,
      )
    }
    const sitio = zonas.current
    sitio.alCambiar = colocar
    colocar()
    return () => {
      sitio.alCambiar = () => {}
    }
  }, [map, elements, puntos, matchCounts, selectedPuntoId, zonas])

  return puntos.map((punto) => {
    const element = elements.get(punto.id)
    if (!element) return null
    const elegido = punto.id === selectedPuntoId
    const modo = modos.get(punto.id) ?? 'oculto'
    const atenuado = matchCounts !== null && !matchCounts.get(punto.id)
    return createPortal(
      <a
        href={rutaDeLugar(punto.slug, idioma, import.meta.env.BASE_URL)}
        className={styles.punto}
        data-modo={modo}
        data-cerca={cerca || elegido || undefined}
        data-state={elegido ? 'selected' : atenuado ? 'dimmed' : 'idle'}
        // Lo que no se ve tampoco se pulsa, ni recibe el foco, ni se anuncia.
        inert={modo === 'oculto'}
        aria-current={elegido ? 'page' : undefined}
        aria-label={t('place.openDetail', { name: punto.name })}
        onFocus={() => {
          conFoco.current = punto.id
          zonas.current.alCambiar()
        }}
        onBlur={() => {
          conFoco.current = null
          zonas.current.alCambiar()
        }}
        onClick={alPulsarEnlace(() => onSelect(punto.placeId))}
      >
        <span className={styles.caja}>
          <CategoryIcon name={punto.icon} size={cerca || elegido ? 14 : 12} />
          <span className={styles.nombre}>{punto.name}</span>
        </span>
        <svg className={styles.pico} viewBox="0 0 12 8" aria-hidden="true" focusable="false">
          <path className={styles.relleno} d="M1 0H11L6 6Z" />
          <path className={styles.borde} d="M1 1L6 6.5L11 1" />
        </svg>
        {/* Siempre en el documento, sin verse: es lo que dice cuánto ocupa el nombre antes de enseñarlo. */}
        <span
          className={styles.medida}
          ref={(nodo) => {
            if (nodo) textos.current.set(punto.id, nodo)
            else textos.current.delete(punto.id)
          }}
          aria-hidden="true"
        >
          {punto.name}
        </span>
      </a>,
      element,
      punto.id,
    )
  })
}
