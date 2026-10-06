/**
 * Los corazones: lo único de la guía que se publica.
 *
 * Se eligió el corazón y no las visitas porque exige intención, va uno por cuenta y a esta escala se
 * lee bien ("12 vecinos lo guardaron" dice algo verdadero). Las visitas miden curiosidad, se inflan
 * recargando y repiten la misma señal con más ruido (ver docs/CUENTAS.md).
 *
 * Dos reglas que viven aquí porque son del servidor y no de la interfaz, para que no se puedan
 * saltar desde el navegador:
 *
 *  - **Umbral.** Por debajo de cinco no se devuelve el número. "1 persona lo guardó" es peor que el
 *    silencio para un local recién abierto, y además delataría a quien lo guardó si solo hay uno.
 *  - **Edad mínima.** Los corazones de una cuenta recién creada no cuentan hasta pasado un rato.
 *    Convierte un ataque instantáneo en uno que hay que sostener, que es toda la defensa que se
 *    puede comprar sin gastar dinero.
 */

/** Por debajo de esto no se publica nada. */
export const UMBRAL = 5

/** Cuánto tiene que vivir una cuenta antes de que sus corazones cuenten para el público. */
export const EDAD_MINIMA_MS = 10 * 60 * 1000

/** Tope por petición: un gesto manda uno, y la subida inicial manda lo que ya había. */
export const MAXIMO_POR_PETICION = 100

/** Tope por cuenta. Nadie guarda 500 lugares de 101; es un freno contra el crecimiento sin fin. */
export const MAXIMO_POR_CUENTA = 500

/** La misma forma que tienen los slugs del catálogo. Lo que no encaje no llega al SQL. */
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export interface Cambio {
  anadir: string[]
  quitar: string[]
}

/**
 * Lee y limpia lo que pide el navegador, o `null` si no tiene sentido.
 *
 * Se filtra en vez de rechazar entero: un identificador raro entre veinte buenos no debe tirar el
 * gesto de nadie. Lo que sí se rechaza es un cuerpo que no es un cambio.
 */
export function cambioDe(cuerpo: unknown): Cambio | null {
  if (typeof cuerpo !== 'object' || cuerpo === null) return null
  const crudo = cuerpo as { anadir?: unknown; quitar?: unknown }
  const limpiar = (valor: unknown): string[] =>
    Array.isArray(valor)
      ? [...new Set(valor.filter((id): id is string => typeof id === 'string' && SLUG.test(id)))]
      : []

  const anadir = limpiar(crudo.anadir)
  const quitar = limpiar(crudo.quitar)
  if (anadir.length + quitar.length === 0) return null
  if (anadir.length + quitar.length > MAXIMO_POR_PETICION) return null
  // Pedir añadir y quitar lo mismo no es un cambio, es un error de quien llama.
  const repetido = anadir.find((id) => quitar.includes(id))
  return repetido ? null : { anadir, quitar }
}

/** `INSERT OR IGNORE`: dar dos veces el mismo corazón no crea dos filas ni falla. */
export const ANADIR =
  'INSERT OR IGNORE INTO favorito (cuenta_id, lugar_id, creado) VALUES (?, ?, ?)'

export const QUITAR = 'DELETE FROM favorito WHERE cuenta_id = ? AND lugar_id = ?'

export const CUANTOS_TIENE = 'SELECT COUNT(*) AS total FROM favorito WHERE cuenta_id = ?'

/** Los favoritos de esta cuenta, para que el dispositivo se ponga al día. */
export const MIOS = 'SELECT lugar_id FROM favorito WHERE cuenta_id = ?'

/**
 * El conteo público. Las dos reglas van en el SQL, no en la interfaz: así no hay forma de pedirle al
 * servidor los números que decidió no publicar.
 */
export const CONTEO = `
SELECT f.lugar_id AS lugar, COUNT(*) AS cuantos
  FROM favorito f
  JOIN cuenta c ON c.id = f.cuenta_id
 WHERE c.creada <= ?
 GROUP BY f.lugar_id
HAVING cuantos >= ?
`.trim()
