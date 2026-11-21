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
  /** Empieza la descarga si no está hecha ni en marcha; tras un fallo, vuelve a pedirla. Es el reintento. */
  load(): void
  /**
   * La pide solo si nunca se pidió. Para lo que la necesita sin que nadie haya decidido reintentar (abrir una
   * ficha, el reposo, entrar por una ficha): tras un fallo no vuelve a pedirla, así el aviso de error no
   * desaparece por sí solo según el orden en que lleguen los trozos.
   */
  ensure(): void
  /**
   * Lo pide cuando el navegador esté libre, para no competir con lo que pinta la guía (el mapa y sus teselas).
   * Con el ahorro de datos activado no pide nada: el detalle llegará cuando alguien lo necesite (una ficha, el
   * buscador). Devuelve la función que cancela la espera.
   */
  loadWhenIdle(): () => void
}

/** El navegador avisa de que la persona quiere gastar poco: Chrome y Android lo exponen, Safari no. */
const ahorraDatos = (): boolean =>
  (navigator as { connection?: { saveData?: boolean } }).connection?.saveData === true

/** Safari no tiene `requestIdleCallback`: se espera un rato fijo, que ya es después del primer pintado. */
const ESPERA_SIN_REPOSO = 1500
/** Aunque el navegador no encuentre un respiro, el detalle se pide pasado este tiempo. */
const ESPERA_MAXIMA = 4000

export function createDetailsStore(repository: PlacesRepository): DetailsStore {
  let state: DetailsState = { status: 'loading' }
  let inFlight = false
  let pedido = false
  const listeners = new Set<() => void>()
  const set = (next: DetailsState) => {
    state = next
    for (const listener of listeners) listener()
  }

  const store: DetailsStore = {
    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    load() {
      if (inFlight || state.status === 'ready') return
      inFlight = true
      pedido = true
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
    ensure() {
      if (!pedido) store.load()
    },
    loadWhenIdle() {
      if (ahorraDatos()) return () => {}
      const pedir = () => store.ensure()
      if (typeof window.requestIdleCallback === 'function') {
        const id = window.requestIdleCallback(pedir, { timeout: ESPERA_MAXIMA })
        return () => window.cancelIdleCallback(id)
      }
      const id = window.setTimeout(pedir, ESPERA_SIN_REPOSO)
      return () => window.clearTimeout(id)
    },
  }
  return store
}
