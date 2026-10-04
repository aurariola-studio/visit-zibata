/**
 * Señales sociales de un lugar: cuántas personas lo han guardado y su calificación media.
 *
 * Hoy la guía es un sitio estático sin cuentas ni servidor, así que no existen: el proveedor por
 * defecto devuelve `null` y la interfaz no dibuja nada (nunca un "0 corazones" ni estrellas vacías).
 * El día que el proyecto escale a cuentas, basta con registrar un proveedor que las lea de esa
 * fuente; la ficha y las tarjetas ya saben mostrarlas. Los favoritos propios seguirán viviendo en
 * `useFavorites` (este dispositivo), que es lo que se envía al contador cuando haya con qué.
 */
import { useSyncExternalStore } from 'react'
import { interactionsStore } from '../ranking/preferences.ts'
import type { PlaceInteraction } from '../ranking/rankPlaces.ts'
import { ratingsStore } from '../ratings/useRatings.ts'
import { visitsStore } from '../visits/useVisits.ts'
import { favoritesStore } from './useFavorites.ts'

export interface PlaceSocialStats {
  /** Personas que han guardado el lugar. */
  favorites: number
  /** Media (1–5) y número de valoraciones; `null` mientras no haya suficientes para publicarla. */
  rating: { average: number; count: number } | null
}

/**
 * Lo que esta persona lleva marcado en este dispositivo. Es exactamente lo que habría que subir una
 * sola vez el día que existan cuentas, para que no pierda lo que ya había guardado o calificado.
 */
export interface LocalProfile {
  favorites: string[]
  ratings: Record<string, number>
  /** Fichas abiertas (para el orden personal): viajan también para no empezar de cero. */
  interactions: Record<string, PlaceInteraction>
  /** Fechas de las visitas marcadas a mano, lo más parecido a un historial propio. */
  visits: Record<string, readonly string[]>
}

export function localProfileSnapshot(): LocalProfile {
  return {
    favorites: [...favoritesStore.read()],
    ratings: Object.fromEntries(ratingsStore.read()),
    interactions: Object.fromEntries(interactionsStore.read()),
    visits: Object.fromEntries(visitsStore.read()),
  }
}

export interface SocialStatsSource {
  get: (placeId: string) => PlaceSocialStats | null
  /** Avisa de cambios (p. ej. al llegar datos nuevos); devuelve la función para dejar de escuchar. */
  subscribe?: (listener: () => void) => () => void
}

const NONE: SocialStatsSource = { get: () => null }
let source: SocialStatsSource = NONE
/**
 * Última foto de cada lugar. `useSyncExternalStore` compara por identidad: si la fuente construye un
 * objeto nuevo en cada lectura (lo normal), sin esta caché React re-renderizaría sin parar.
 */
const snapshots = new Map<string, PlaceSocialStats | null>()

/** Registra la fuente de señales sociales. Sin llamarla, la guía funciona exactamente igual que hoy. */
export function setSocialStatsSource(next: SocialStatsSource | null): void {
  source = next ?? NONE
  snapshots.clear()
}

const same = (a: PlaceSocialStats | null, b: PlaceSocialStats | null) =>
  a === b ||
  (a !== null &&
    b !== null &&
    a.favorites === b.favorites &&
    a.rating?.average === b.rating?.average &&
    a.rating?.count === b.rating?.count)

function snapshotOf(placeId: string): PlaceSocialStats | null {
  const next = source.get(placeId)
  const previous = snapshots.get(placeId)
  if (previous !== undefined && same(previous, next)) return previous
  snapshots.set(placeId, next)
  return next
}

/** Señales de un lugar sin pasar por React: las usa el orden personal (features/ranking). */
export function placeSocialStats(placeId: string): PlaceSocialStats | null {
  return snapshotOf(placeId)
}

const noSubscription = () => () => {}

export function usePlaceSocialStats(placeId: string): PlaceSocialStats | null {
  return useSyncExternalStore(
    source.subscribe ?? noSubscription,
    () => snapshotOf(placeId),
    () => null,
  )
}
