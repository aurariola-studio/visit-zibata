/**
 * El detalle de los locales (descripción, enlaces, teléfono, ruta a la puerta): llega aparte del resumen y
 * puede tardar o fallar sin que eso detenga la guía. Es un almacén pequeño que lee React con
 * `useSyncExternalStore`: la ficha y el buscador lo consultan, y se rehacen cuando llega.
 *
 * Uno por `CatalogProvider`, no global: cada árbol (y cada prueba) tiene el suyo. El estado es un objeto que
 * solo se sustituye al cambiar, y `getSnapshot` devuelve siempre el mismo mientras no cambie, que es lo que
 * `useSyncExternalStore` exige para no entrar en bucle.
 */
import type { PlaceDetailData } from '../types/domain.ts'
import type { PlacesRepository } from './PlacesRepository.ts'

export type DetailsState =
  | { status: 'loading' }
  | { status: 'ready'; byId: ReadonlyMap<string, PlaceDetailData> }
  | { status: 'error' }

export interface DetailsStore {
  getSnapshot(): DetailsState
  subscribe(listener: () => void): () => void
  /** Empieza la descarga si no está hecha ni en marcha; tras un fallo, vuelve a pedirla. */
  load(): void
}

export function createDetailsStore(repository: PlacesRepository): DetailsStore {
  let state: DetailsState = { status: 'loading' }
  let inFlight = false
  const listeners = new Set<() => void>()
  const set = (next: DetailsState) => {
    state = next
    for (const listener of listeners) listener()
  }

  return {
    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    load() {
      if (inFlight || state.status === 'ready') return
      inFlight = true
      if (state.status === 'error') set({ status: 'loading' })
      repository.getPlaceDetails().then(
        (details) => {
          inFlight = false
          set({ status: 'ready', byId: new Map(details.map((detail) => [detail.id, detail])) })
        },
        (error: unknown) => {
          inFlight = false
          // El detalle no es imprescindible: la guía sigue con el resumen y la ficha ofrece reintentar.
          console.error('[datos]', error)
          set({ status: 'error' })
        },
      )
    },
  }
}
