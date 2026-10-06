import { CatalogProvider } from '../data/CatalogContext.tsx'
import { StaticPlacesRepository } from '../data/StaticPlacesRepository.ts'
import { cargarCorazones, registrarCorazones } from '../features/favorites/corazones.ts'
import { AppStateProvider } from './AppStateContext.tsx'
import { Experience } from './Experience.tsx'

/** Punto de composición: aquí se elige la implementación del repositorio de datos. */
const repository = new StaticPlacesRepository()

/*
 * Los corazones de la comunidad, fuera del render y sin esperar a nadie.
 *
 * Se registra la fuente de inmediato (para que la ficha sepa a quién preguntar) y se pide el conteo
 * en paralelo. Mientras no llegue, `SocialStats` no dibuja nada, que es exactamente como se
 * comportaba la guía antes de que existiera: ningún hueco, ningún esqueleto, ningún "0 corazones".
 */
registrarCorazones()
void cargarCorazones()

export function App() {
  return (
    <CatalogProvider repository={repository}>
      <AppStateProvider>
        <Experience />
      </AppStateProvider>
    </CatalogProvider>
  )
}
