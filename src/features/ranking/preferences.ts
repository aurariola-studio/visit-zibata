/**
 * De dónde salen las señales para el orden personal. Hoy, de este dispositivo: favoritos,
 * calificaciones, visitas marcadas a mano y las fichas que la persona abre (localStorage). Nada sale
 * del navegador ni se usa para nada más que ordenar sus listas.
 *
 * El día que haya cuentas y base de datos, basta con registrar otra fuente (`setPreferenceSource`) que
 * lea y escriba en el servidor; `rankPlaces` y la interfaz no cambian. Lo guardado aquí viaja una vez
 * con `localProfileSnapshot` (features/favorites/socialStats.ts) para no perder el historial.
 */
import { createLocalStore } from '../../lib/localStore.ts'
import { favoritesStore } from '../favorites/useFavorites.ts'
import { ratingsStore } from '../ratings/useRatings.ts'
import { visitsStore } from '../visits/useVisits.ts'
import type { PlaceInteraction, PreferenceSignals } from './rankPlaces.ts'

export interface PreferenceSource {
  read: () => PreferenceSignals
  recordOpen: (placeId: string) => void
}

/** Tope de lugares recordados: lo más antiguo se olvida primero. */
const MAX_REMEMBERED = 300

const EMPTY: ReadonlyMap<string, PlaceInteraction> = new Map()

const isInteraction = (value: unknown): value is PlaceInteraction =>
  typeof value === 'object' &&
  value !== null &&
  Number.isInteger((value as PlaceInteraction).opens) &&
  (value as PlaceInteraction).opens > 0 &&
  Number.isFinite((value as PlaceInteraction).lastOpenedAt)

export const interactionsStore = createLocalStore<ReadonlyMap<string, PlaceInteraction>>(
  'zibata:interacciones',
  (raw) =>
    new Map(
      Object.entries((raw ?? {}) as Record<string, unknown>).filter(
        (entry): entry is [string, PlaceInteraction] => isInteraction(entry[1]),
      ),
    ),
  (value) => Object.fromEntries(value),
  EMPTY,
)

export function recordOpenLocally(placeId: string, now = Date.now()): void {
  const next = new Map(interactionsStore.read())
  const previous = next.get(placeId)
  next.delete(placeId)
  next.set(placeId, { opens: (previous?.opens ?? 0) + 1, lastOpenedAt: now })
  // Map conserva el orden de inserción: el primero es el que hace más tiempo que no se abre.
  while (next.size > MAX_REMEMBERED) next.delete(next.keys().next().value as string)
  interactionsStore.write(next)
}

const LOCAL: PreferenceSource = {
  read: () => ({
    favorites: favoritesStore.read(),
    ratings: ratingsStore.read(),
    interactions: interactionsStore.read(),
    visits: visitsStore.read(),
  }),
  recordOpen: (placeId) => recordOpenLocally(placeId),
}

let source: PreferenceSource = LOCAL

export const preferences = {
  read: () => source.read(),
  recordOpen: (placeId: string) => source.recordOpen(placeId),
}

/** Cambia la fuente de señales (p. ej. una API con cuentas). `null` vuelve a la local. */
export function setPreferenceSource(next: PreferenceSource | null): void {
  source = next ?? LOCAL
}
