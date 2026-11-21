import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react'
import type { Catalog } from '../types/domain.ts'
import { loadCatalog } from './catalog.ts'
import type { PlacesRepository } from './PlacesRepository.ts'
import { createDetailsStore, type DetailsState, type DetailsStore } from './placeDetails.ts'

export type CatalogState =
  | { status: 'loading' }
  | { status: 'ready'; catalog: Catalog }
  | { status: 'error'; error: Error }

interface CatalogContextValue {
  state: CatalogState
  retry: () => void
  /** El detalle de los locales, que llega aparte del catálogo (ver `placeDetails.ts`). */
  details: DetailsStore
}

const CatalogContext = createContext<CatalogContextValue | null>(null)

export function CatalogProvider({
  repository,
  children,
  detalle = 'ya',
}: {
  repository: PlacesRepository
  children: ReactNode
  /**
   * Cuándo se pide el detalle de los locales. `ya` lo pide a la vez que el resumen (las pruebas, y quien entra
   * por una ficha, que lo necesita enseguida); `en-reposo` espera a que la guía esté pintada y el navegador libre.
   * En los dos casos se pide al instante cuando algo lo necesita: una ficha o el buscador.
   */
  detalle?: 'ya' | 'en-reposo'
}) {
  const [state, setState] = useState<CatalogState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const details = useMemo(() => createDetailsStore(repository), [repository])

  // biome-ignore lint/correctness/useExhaustiveDependencies: `attempt` fuerza una nueva carga al reintentar.
  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })
    loadCatalog(repository).then(
      (catalog) => !cancelled && setState({ status: 'ready', catalog }),
      (error: unknown) => {
        console.error('[datos]', error)
        if (!cancelled)
          setState({
            status: 'error',
            error: error instanceof Error ? error : new Error(String(error)),
          })
      },
    )
    return () => {
      cancelled = true
    }
  }, [repository, attempt])

  // `ya`: a la vez que el resumen, no después. La guía no espera por él, pero quien entra directo a una ficha
  // lo tiene en cuanto llega.
  useEffect(() => {
    if (detalle === 'ya') details.ensure()
  }, [details, detalle])
  // `en-reposo`: cuando el catálogo ya se pintó y el navegador está libre, para no competir con el mapa.
  const catalogoListo = state.status === 'ready'
  useEffect(() => {
    if (detalle === 'en-reposo' && catalogoListo) return details.loadWhenIdle()
  }, [details, detalle, catalogoListo])

  const retry = useCallback(() => {
    details.load()
    setAttempt((n) => n + 1)
  }, [details])
  const value = useMemo(() => ({ state, retry, details }), [state, retry, details])
  return <CatalogContext value={value}>{children}</CatalogContext>
}

export function useCatalogState(): CatalogContextValue {
  const value = useContext(CatalogContext)
  if (!value) throw new Error('useCatalogState debe usarse dentro de <CatalogProvider>')
  return value
}

/** Catálogo listo (solo en componentes que se renderizan tras la carga). */
export function useCatalog(): Catalog {
  const { state } = useCatalogState()
  if (state.status !== 'ready') throw new Error('El catálogo aún no está disponible')
  return state.catalog
}

/**
 * El detalle de los locales: `loading` hasta que llega, `error` si no pudo, y `ready` con todos por `id`. `ensure` lo
 * pide si nunca se pidió; `load` lo pide y, tras un fallo, vuelve a pedirlo: es el reintento.
 */
export function usePlaceDetails(): DetailsState & { load: () => void; ensure: () => void } {
  const { details } = useCatalogState()
  const state = useSyncExternalStore(details.subscribe, details.getSnapshot)
  return useMemo(() => ({ ...state, load: details.load, ensure: details.ensure }), [state, details])
}

const NADA = () => {}

/**
 * Pide el detalle ya, y si falló antes lo reintenta. Para el buscador al enfocarse, que lo necesita antes de que
 * llegue el reposo y puede vivir sin catálogo, como en una prueba suelta: sin proveedor no hace nada.
 */
export function useCargarDetalle(): () => void {
  const valor = useContext(CatalogContext)
  return valor ? valor.details.load : NADA
}
