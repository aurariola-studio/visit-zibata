/**
 * Los corazones, de ida y de vuelta.
 *
 * **De vuelta**: cuántas personas han guardado cada lugar. Lo sirve `/api/corazones`, sin identidad
 * y cacheable, y es lo único de la guía que se publica. El servidor ya aplica el umbral y la edad
 * mínima, así que aquí no hay reglas que repetir: lo que llega es lo que se puede enseñar.
 *
 * **De ida**: lo que esta persona guarda se manda a su cuenta. Nunca bloquea el gesto, que sigue
 * siendo instantáneo contra el almacenamiento local; si el envío falla, el corazón sigue puesto en
 * este dispositivo y lo único que se pierde es que cuente para el número público.
 *
 * La guía tiene que funcionar igual sin nada de esto: sin red, sin cuenta o con el servidor caído,
 * los favoritos son los de siempre y el número sencillamente no aparece.
 */
import { cabecerasDeCuenta, hayCuenta } from '../../lib/cuenta.ts'
import { setSocialStatsSource } from './socialStats.ts'
import { favoritesStore } from './useFavorites.ts'

type Conteo = Record<string, number>

let conteo: Conteo = {}
const oyentes = new Set<() => void>()
const avisar = () => {
  for (const oyente of oyentes) oyente()
}

/**
 * Trae el conteo y lo publica. Se llama una vez al arrancar: el número cambia despacio y la
 * respuesta se cachea cinco minutos, así que no hay nada que refrescar en caliente.
 */
export async function cargarCorazones(): Promise<void> {
  try {
    const respuesta = await fetch('/api/corazones')
    if (!respuesta.ok) return
    const datos: unknown = await respuesta.json()
    if (typeof datos !== 'object' || datos === null) return
    conteo = Object.fromEntries(
      Object.entries(datos as Record<string, unknown>).filter(
        (entrada): entrada is [string, number] =>
          typeof entrada[1] === 'number' && Number.isFinite(entrada[1]) && entrada[1] > 0,
      ),
    )
    avisar()
  } catch {
    // Sin conteo, la ficha no dibuja nada. Es exactamente como se comportaba antes de que existiera.
  }
}

/**
 * Registra la fuente que lee la ficha. `rating` va siempre a `null` **a propósito**: las estrellas
 * alimentan el orden pero no se muestran, y la forma más segura de no mostrarlas es que la interfaz
 * nunca las reciba (ver docs/CUENTAS.md).
 */
export function registrarCorazones(): void {
  setSocialStatsSource({
    get: (placeId) => {
      const favorites = conteo[placeId]
      return favorites === undefined ? null : { favorites, rating: null }
    },
    subscribe: (oyente) => {
      oyentes.add(oyente)
      return () => oyentes.delete(oyente)
    },
  })
}

/** Una sola subida en vuelo por gesto; los errores no se reintentan ni se anuncian. */
function enviar(cambio: { anadir?: string[]; quitar?: string[] }): void {
  void (async () => {
    try {
      const cabeceras = await cabecerasDeCuenta()
      if (!cabeceras) return
      await fetch('/api/favoritos', {
        method: 'POST',
        headers: { ...cabeceras, 'content-type': 'application/json' },
        body: JSON.stringify(cambio),
      })
    } catch {
      // El corazón ya está puesto en este dispositivo. Lo único que se pierde es el conteo público.
    }
  })()
}

/**
 * Sube lo que ya había guardado antes de que existieran las cuentas.
 *
 * Solo la primera vez: en cuanto hay cuenta, cada gesto viaja solo. Sin esto, quien llevaba meses
 * guardando lugares empezaría de cero en el número público, que es justo lo que no debe pasar.
 */
export function subirLoQueYaHabia(): void {
  if (hayCuenta()) return
  const guardados = [...favoritesStore.read()]
  if (guardados.length === 0) return
  enviar({ anadir: guardados })
}

/** Avisa al servidor de un corazón puesto o quitado. */
export function sincronizarCorazon(placeId: string, puesto: boolean): void {
  enviar(puesto ? { anadir: [placeId] } : { quitar: [placeId] })
}
