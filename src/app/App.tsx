import { CatalogProvider } from '../data/CatalogContext.tsx'
import { StaticPlacesRepository } from '../data/StaticPlacesRepository.ts'
import { AppStateProvider } from './AppStateContext.tsx'
import { Experience } from './Experience.tsx'

/** Punto de composición: aquí se elige la implementación del repositorio de datos. */
const repository = new StaticPlacesRepository()

export function App() {
  return (
    <CatalogProvider repository={repository}>
      <AppStateProvider>
        <Experience />
      </AppStateProvider>
    </CatalogProvider>
  )
}
