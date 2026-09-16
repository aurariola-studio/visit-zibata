/**
 * Marcadores HTML de plazas: botones accesibles (teclado y lector de pantalla) anclados al mapa.
 * Muestran nombre y número de lugares. Nunca se superponen: los de menor prioridad prueban a desplazar
 * la etiqueta a un lado o a elevarla con un tallo más largo, o se reducen a la cifra. Solo si aun así no
 * caben se ocultan, y la plaza visible más cercana anuncia "+N" (al pulsarlo el mapa se acerca).
 * Prioridad: plaza seleccionada y luego más lugares.
 */
import { LngLatBounds, type Map as MapLibreMap, Marker } from 'maplibre-gl'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { t } from '../../i18n/index.ts'
import type { Plaza } from '../../types/domain.ts'
import { prefersReducedMotion } from './mapRuntime.ts'
import styles from './PlazaMarkers.module.css'

interface PlazaMarkersProps {
  map: MapLibreMap
  plazas: readonly Plaza[]
  placeCounts: ReadonlyMap<string, number>
  matchCounts: ReadonlyMap<string, number> | null
  selectedPlazaId: string | null
  hoveredPlazaId: string | null
  onHover: (plazaId: string | null) => void
  onSelect: (plazaId: string) => void
}

type Mode = 'full' | 'left' | 'right' | 'compact' | 'hidden'
/** Niveles de elevación de la etiqueta (0 = junto al punto; cada nivel alarga el tallo). */
type Lift = 0 | 1 | 2
interface Placement {
  mode: Mode
  lift: Lift
}
interface Rect {
  left: number
  right: number
  top: number
  bottom: number
}

/** Por debajo de este zoom todas las plazas muestran solo la cifra. */
const COMPACT_BELOW_ZOOM = 14.3
const MARKER_HEIGHT = 44
const COMPACT_WIDTH = 34
const GAP = 4
/** Lo que sube la etiqueta por nivel de elevación (debe coincidir con PlazaMarkers.module.css). */
const LIFT_STEP = MARKER_HEIGHT + GAP
/** Cuánto sobresale una etiqueta desplazada hacia el lado del tallo (≈1.1rem). */
const SHIFT_OVERHANG = 17.6
const EDGE_RESERVED_RIGHT = 64
/** Insignia "+N" junto a la etiqueta (medidas en PlazaMarkers.module.css). */
const BADGE_SIZE = 24
const BADGE_GAP = 2
const BADGE_TOP = 5
type BadgeSide = 'end' | 'start'
interface Cluster {
  ids: string[]
  side: BadgeSide
}

const overlaps = (a: Rect, b: Rect) =>
  a.left < b.right + GAP &&
  a.right > b.left - GAP &&
  a.top < b.bottom + GAP &&
  a.bottom > b.top - GAP

const GROUP_MAX_ZOOM = 18.5

/**
 * Acerca el mapa a un grupo de plazas cercanas hasta que cada una tenga su marcador. Encuadrar el grupo
 * no siempre basta (en pantallas estrechas las etiquetas no caben con ese zoom): mientras alguna siga
 * oculta tras terminar el movimiento y recolocar marcadores, se acerca un poco más.
 */
function zoomToPlazas(
  map: MapLibreMap,
  ids: readonly string[],
  plazas: readonly Plaza[],
  isHidden: (id: string) => boolean,
) {
  const bounds = new LngLatBounds()
  for (const plaza of plazas) {
    if (ids.includes(plaza.id)) bounds.extend([plaza.coordinates.lng, plaza.coordinates.lat])
  }
  const duration = prefersReducedMotion() ? 0 : 800
  const STEP = 0.75
  // ¿Seguirían todas las plazas del grupo dentro del área libre (sin barra, hoja ni márgenes) tras acercar?
  const fitsAfterStep = () => {
    const { width, height } = map.getContainer().getBoundingClientRect()
    const { top = 0, bottom = 0, left = 0, right = 0 } = map.getPadding()
    const points = ids.flatMap((id) => {
      const plaza = plazas.find((candidate) => candidate.id === id)
      return plaza ? [map.project([plaza.coordinates.lng, plaza.coordinates.lat])] : []
    })
    const spread = (values: number[]) => (Math.max(...values) - Math.min(...values)) * 2 ** STEP
    return (
      spread(points.map((point) => point.x)) <= width - left - right - 2 * MARKER_HEIGHT &&
      spread(points.map((point) => point.y)) <= height - top - bottom - 2 * MARKER_HEIGHT
    )
  }
  const refine = () => {
    // Deja pasar la recolocación de marcadores (un fotograma) y el render que la aplica.
    window.setTimeout(() => {
      if (!ids.some(isHidden) || map.getZoom() >= GROUP_MAX_ZOOM || !fitsAfterStep()) return
      map.once('moveend', refine)
      map.easeTo({
        center: bounds.getCenter(),
        zoom: Math.min(GROUP_MAX_ZOOM, map.getZoom() + STEP),
        duration: duration / 2,
      })
    }, 150)
  }
  map.once('moveend', refine)
  map.fitBounds(bounds, { padding: 96, maxZoom: 17, duration })
}

export function PlazaMarkers({
  map,
  plazas,
  placeCounts,
  matchCounts,
  selectedPlazaId,
  hoveredPlazaId,
  onHover,
  onSelect,
}: PlazaMarkersProps) {
  const activePlazas = useMemo(() => plazas.filter((plaza) => plaza.active), [plazas])
  const nameById = useMemo(
    () => new Map(activePlazas.map((plaza) => [plaza.id, plaza.name])),
    [activePlazas],
  )
  const [elements, setElements] = useState<Map<string, HTMLElement>>(new Map())
  const [modes, setModes] = useState<ReadonlyMap<string, Placement>>(new Map())
  const [focusedPlazaId, setFocusedPlazaId] = useState<string | null>(null)
  /** Plazas ocultas por falta de espacio, agrupadas en la plaza visible más cercana. */
  const [clusters, setClusters] = useState<ReadonlyMap<string, Cluster>>(new Map())
  const fullWidths = useRef(new Map<string, number>())
  const relayout = useRef(() => {})

  useEffect(() => {
    const created = new Map<string, HTMLElement>()
    const markers = activePlazas.map((plaza) => {
      const element = document.createElement('div')
      element.className = styles.anchor ?? ''
      created.set(plaza.id, element)
      return new Marker({ element, anchor: 'bottom', subpixelPositioning: true })
        .setLngLat([plaza.coordinates.lng, plaza.coordinates.lat])
        .addTo(map)
    })
    setElements(created)
    return () => {
      for (const marker of markers) marker.remove()
    }
  }, [map, activePlazas])

  // La colocación se recalcula al mover el mapa y también cuando cambian selección o conteos (búsqueda y
  // filtros cambian el ancho de las etiquetas y la prioridad).
  useEffect(() => {
    const count = (id: string) => matchCounts?.get(id) ?? placeCounts.get(id) ?? 0
    const priority = [...activePlazas]
      .sort((a, b) => {
        if (a.id === selectedPlazaId) return -1
        if (b.id === selectedPlazaId) return 1
        return count(b.id) - count(a.id)
      })
      .map((plaza) => plaza.id)
    let frame = 0
    const layout = () => {
      frame = 0
      const allCompact = map.getZoom() < COMPACT_BELOW_ZOOM
      const container = map.getContainer().getBoundingClientRect()
      // Margen derecho reservado a los controles del mapa; superior e inferior, a la barra de búsqueda y
      // filtros y a la hoja (el padding del mapa): una etiqueta tapada no se puede pulsar ni leer. Con el
      // zoom mínimo (móvil en horizontal) no todas las plazas caben entre ambas.
      const { top = 0, bottom = 0 } = map.getPadding()
      const topBar = container.top + top
      const bottomBar = container.bottom - bottom
      const insideView = (rect: Rect) =>
        rect.left >= container.left + 8 &&
        rect.right <= container.right - EDGE_RESERVED_RIGHT &&
        rect.top >= topBar &&
        rect.bottom <= bottomBar
      const placed = new Map<string, Rect>()
      const next = new Map<string, Placement>()
      const collides = (rect: Rect, except?: string) =>
        [...placed].some(([id, other]) => id !== except && overlaps(rect, other))
      const free = ([, rect]: [Placement, Rect]) => insideView(rect) && !collides(rect)

      // Posibles colocaciones de cada marcador, según su punto en pantalla y el ancho de su etiqueta.
      const options = new Map<
        string,
        (kind: 'named' | 'compact', lift: Lift) => [Placement, Rect][]
      >()
      const anchors = new Map<string, { x: number; y: number }>()
      for (const id of priority) {
        const element = elements.get(id)
        const button = element?.firstElementChild as HTMLElement | null | undefined
        if (!element || !button) continue
        // El contenedor (botón + tallo) está anclado por su base al punto de la plaza.
        const box = element.getBoundingClientRect()
        const label = button.firstElementChild as HTMLElement | null
        const currentMode = button.dataset.mode
        if (label && currentMode !== 'compact' && currentMode !== 'hidden') {
          fullWidths.current.set(id, label.offsetWidth)
        }
        const anchorX = box.left + box.width / 2
        const anchorY = box.bottom
        anchors.set(id, { x: anchorX, y: anchorY })
        const name = activePlazas.find((plaza) => plaza.id === id)?.name ?? ''
        const width = fullWidths.current.get(id) ?? name.length * 7.6 + 58
        const rect = (left: number, right: number, lift: Lift): Rect => ({
          left,
          right,
          top: anchorY - MARKER_HEIGHT - lift * LIFT_STEP,
          bottom: anchorY - lift * LIFT_STEP,
        })
        options.set(id, (kind, lift) =>
          kind === 'compact'
            ? [
                [
                  { mode: 'compact', lift },
                  rect(anchorX - COMPACT_WIDTH / 2, anchorX + COMPACT_WIDTH / 2, lift),
                ],
              ]
            : [
                [{ mode: 'full', lift }, rect(anchorX - width / 2, anchorX + width / 2, lift)],
                [
                  { mode: 'left', lift },
                  rect(anchorX - width + SHIFT_OVERHANG, anchorX + SHIFT_OVERHANG, lift),
                ],
                [
                  { mode: 'right', lift },
                  rect(anchorX - SHIFT_OVERHANG, anchorX + width - SHIFT_OVERHANG, lift),
                ],
              ],
        )
      }

      // Pasadas de mayor a menor calidad: que todas las plazas se vean pesa más que mostrar el nombre,
      // y ambas cosas más que mantener la etiqueta junto al punto.
      const passes: ['named' | 'compact', Lift[]][] = [
        ['named', [0]],
        ['compact', [0]],
        ['named', [1]],
        ['compact', [1, 2]],
      ]
      for (const [kind, lifts] of passes) {
        for (const id of priority) {
          const optionsFor = options.get(id)
          if (!optionsFor || next.has(id)) continue
          const selected = id === selectedPlazaId
          // La plaza seleccionada siempre lleva su nombre; las demás, solo con zoom suficiente.
          if (kind === 'named' ? allCompact && !selected : selected) continue
          // Un punto tapado por la hoja no se señala con una etiqueta elevada: se agrupa con una visible.
          const covered = (anchors.get(id)?.y ?? 0) > bottomBar
          const fitting = covered
            ? undefined
            : lifts.flatMap((lift) => optionsFor(kind, lift)).find(free)
          if (fitting) {
            next.set(id, fitting[0])
            placed.set(id, fitting[1])
          } else if (selected) {
            // Va primera: solo no cabe fuera de la vista; se coloca igualmente.
            const [placement, rect] = optionsFor('named', 0)[0] as [Placement, Rect]
            next.set(id, placement)
            placed.set(id, rect)
          }
        }
      }

      // Sin superponer botones (cada uno conserva su área táctil): lo que no cabe se oculta y se agrupa.
      for (const id of priority) {
        if (options.has(id) && !next.has(id)) next.set(id, { mode: 'hidden', lift: 0 })
      }

      // Agrupación solo si hace falta: cada plaza sin sitio se anuncia ("+N") junto a la etiqueta de la
      // plaza visible más cercana, a su derecha o a su izquierda, sin tapar ninguna otra.
      const nearby = new Map<string, Cluster>()
      const badgeFor = (host: Rect, side: BadgeSide): Rect => {
        const left = side === 'end' ? host.right + BADGE_GAP : host.left - BADGE_GAP - BADGE_SIZE
        const top = host.top + BADGE_TOP
        return { left, right: left + BADGE_SIZE, top, bottom: top + BADGE_SIZE }
      }
      const sides: BadgeSide[] = ['end', 'start']
      for (const [id, placement] of next) {
        const anchor = anchors.get(id)
        if (placement.mode !== 'hidden' || !anchor) continue
        const hosts = [...next]
          .flatMap(([hostId, hostPlacement]) => {
            const rect = placed.get(hostId)
            const hostAnchor = anchors.get(hostId)
            if (hostPlacement.mode === 'hidden' || !rect || !hostAnchor) return []
            return [
              {
                hostId,
                rect,
                distance: Math.hypot(anchor.x - hostAnchor.x, anchor.y - hostAnchor.y),
              },
            ]
          })
          .sort((a, b) => a.distance - b.distance)
        // La más cercana que ya tenga insignia o deje hueco para ella; si ninguna, la más cercana.
        let chosen: { hostId: string; side: BadgeSide } | undefined
        for (const { hostId, rect } of hosts) {
          const existing = nearby.get(hostId)
          if (existing) {
            chosen = { hostId, side: existing.side }
            break
          }
          const side = sides.find((candidate) => {
            const badge = badgeFor(rect, candidate)
            return insideView(badge) && !collides(badge, hostId)
          })
          if (side) {
            chosen = { hostId, side }
            break
          }
        }
        const fallback = hosts[0]
        chosen ??= fallback ? { hostId: fallback.hostId, side: 'end' } : undefined
        if (!chosen) continue
        const cluster = nearby.get(chosen.hostId)
        if (cluster) {
          cluster.ids.push(id)
        } else {
          const hostRect = placed.get(chosen.hostId)
          if (hostRect) placed.set(`${chosen.hostId}:+`, badgeFor(hostRect, chosen.side))
          nearby.set(chosen.hostId, { ids: [id], side: chosen.side })
        }
      }

      setModes((previous) =>
        previous.size === next.size &&
        [...next].every(([id, placement]) => {
          const before = previous.get(id)
          return before?.mode === placement.mode && before.lift === placement.lift
        })
          ? previous
          : next,
      )
      setClusters((previous) =>
        previous.size === nearby.size &&
        [...nearby].every(([id, cluster]) => {
          const before = previous.get(id)
          return before?.side === cluster.side && before.ids.join() === cluster.ids.join()
        })
          ? previous
          : nearby,
      )
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(layout)
    }
    schedule()
    relayout.current = schedule
    map.on('move', schedule)
    map.on('resize', schedule)
    return () => {
      relayout.current = () => {}
      map.off('move', schedule)
      map.off('resize', schedule)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [map, elements, selectedPlazaId, activePlazas, matchCounts, placeCounts])

  // Tras un render que cambia modos, las etiquetas con nombre ya se pueden medir: otra pasada sustituye los
  // anchos estimados por los reales. Sin ella, si la cámara no se mueve (movimiento reducido), la estimación
  // se queda. Converge: solo cambian los modos mientras aparecen anchos nuevos.
  // biome-ignore lint/correctness/useExhaustiveDependencies: se reacciona a cada cambio de modos.
  useEffect(() => {
    relayout.current()
  }, [modes])

  return (
    <>
      {activePlazas.map((plaza) => {
        const element = elements.get(plaza.id)
        if (!element) return null
        const total = placeCounts.get(plaza.id) ?? 0
        const count = matchCounts?.get(plaza.id) ?? (matchCounts ? 0 : total)
        const dimmed = matchCounts !== null && count === 0
        const selected = plaza.id === selectedPlazaId
        const state = selected
          ? 'selected'
          : plaza.id === hoveredPlazaId
            ? 'hover'
            : dimmed
              ? 'dimmed'
              : 'idle'
        const placement = modes.get(plaza.id)
        const layoutMode = placement?.mode
        // El marcador con foco de teclado nunca se oculta: lo perdería (p. ej. al devolverlo tras cerrar el
        // panel mientras la cámara se mueve) y el lector de pantalla quedaría sin contexto.
        const mode: Mode =
          selected && (layoutMode === 'compact' || layoutMode === 'hidden' || !layoutMode)
            ? 'full'
            : layoutMode === 'hidden' && plaza.id === focusedPlazaId
              ? 'compact'
              : (layoutMode ?? 'compact')
        const lift = mode === 'hidden' ? 0 : (placement?.lift ?? 0)
        const cluster = mode === 'hidden' ? undefined : clusters.get(plaza.id)
        const grouped = cluster?.ids
        return createPortal(
          <>
            <button
              type="button"
              className={styles.marker}
              data-state={state}
              data-mode={mode}
              data-lift={lift}
              tabIndex={mode === 'hidden' ? -1 : 0}
              aria-hidden={mode === 'hidden' ? true : undefined}
              aria-pressed={selected}
              aria-label={t('plaza.select', {
                name: plaza.name,
                places: t('places.count', { count }),
              })}
              onMouseEnter={() => onHover(plaza.id)}
              onMouseLeave={() => onHover(null)}
              onFocus={() => {
                setFocusedPlazaId(plaza.id)
                onHover(plaza.id)
              }}
              onBlur={() => {
                setFocusedPlazaId(null)
                onHover(null)
              }}
              onClick={() => onSelect(plaza.id)}
            >
              <span className={styles.label}>
                <span className={styles.name}>{plaza.name}</span>
                <span className={styles.count}>{count}</span>
              </span>
            </button>
            {/* El tallo va fuera del botón: el área pulsable es solo la etiqueta. */}
            <span className={styles.stem} data-state={state} data-lift={lift} aria-hidden="true" />
            {grouped && (
              <button
                type="button"
                className={styles.nearby}
                data-host-mode={mode}
                data-side={cluster?.side}
                aria-label={t('plaza.nearby', {
                  count: grouped.length,
                  names: grouped.map((id) => nameById.get(id) ?? id).join(', '),
                })}
                onClick={() =>
                  zoomToPlazas(
                    map,
                    [plaza.id, ...grouped],
                    activePlazas,
                    (id) =>
                      elements.get(id)?.firstElementChild?.getAttribute('data-mode') === 'hidden',
                  )
                }
              >
                +{grouped.length}
              </button>
            )}
          </>,
          element,
          plaza.id,
        )
      })}
    </>
  )
}
