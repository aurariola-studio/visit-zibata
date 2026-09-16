import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react'
import type { Catalog } from '../types/domain.ts'
import { loadCatalog } from './catalog.ts'
import type { PlacesRepository } from './PlacesRepository.ts'

export type CatalogState =
  | { status: 'loading' }
  | { status: 'ready'; catalog: Catalog }
  | { status: 'error'; error: Error }

interface CatalogContextValue {
  state: CatalogState
  retry: () => void
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

  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  return <CatalogContext value={{ state, retry }}>{children}</CatalogContext>
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
