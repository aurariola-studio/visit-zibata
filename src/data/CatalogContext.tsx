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
}: {
  repository: PlacesRepository
  children: ReactNode
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

  // El detalle se pide a la vez que el resumen y no después: quien entra directo a una ficha lo tiene
  // en cuanto llega, y la guía no espera por él.
  useEffect(() => details.load(), [details])

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

/** El detalle de los locales: `loading` hasta que llega, `error` si no pudo, y `ready` con todos por `id`. */
export function usePlaceDetails(): DetailsState & { retry: () => void } {
  const { details } = useCatalogState()
  const state = useSyncExternalStore(details.subscribe, details.getSnapshot)
  return useMemo(() => ({ ...state, retry: details.load }), [state, details])
}
