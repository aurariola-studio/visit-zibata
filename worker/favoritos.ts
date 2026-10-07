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

/**
 * Por debajo de esto no se publica nada, y **no sube con el tamaño de la guía a propósito**.
 *
 * Es un suelo de privacidad, no un filtro de popularidad: con uno o dos, el número delata a quien lo
 * guardó. Esa razón no cambia porque haya cien personas o cien mil, así que atarlo a la población
 * solo conseguiría esconder a los locales pequeños cuando la guía creciera, que es justo a quienes
 * esto quiere servir. Al principio casi nada llega a cinco y casi nada enseña número: es lo correcto.
 */
export const UMBRAL = 5

/**
 * Cuánto tiene que vivir una cuenta antes de que sus corazones cuenten para el público.
 *
 * Un día y no diez minutos. Escala sola, porque mide tiempo y no gente, pero diez minutos no eran
 * nada: quien quisiera inflar un número esperaba un café. Veinticuatro horas obligan a sostener el
 * ataque un día entero, y a una persona no le cuestan nada, porque su corazón ya se ve en su
 * dispositivo desde el primer momento y lo único que llega tarde es el número público.
 */
export const EDAD_MINIMA_MS = 24 * 60 * 60 * 1000

/** Tope por petición: un gesto manda uno, y la subida inicial manda lo que ya había. */
export const MAXIMO_POR_PETICION = 100

/**
 * Tope por cuenta. Nadie guarda más lugares de los que hay, así que esto sigue al catálogo.
 *
 * El Worker no puede contar los lugares (no tiene los datos), así que el número se escribe aquí y lo
 * ata una prueba: `favoritos.test.ts` lee `data/` y falla si el catálogo se le acerca. Así no se
 * queda en un número de otra época sin que nadie se entere, que es lo que le pasó al 500 anterior
 * con 101 locales: no frenó nunca nada.
 */
export const MAXIMO_POR_CUENTA = 150

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
