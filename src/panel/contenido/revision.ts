import type { Negocio, PlazaResumen } from './tipos.ts'
import { normalizar } from './tipos.ts'

/**
 * Qué locales conviene revisar, y qué local es el de una sugerencia. Es lógica pura, sin pantalla: la lista de
 * Negocios la usa como filtro y el Resumen la cuenta.
 *
 * **Los umbrales salen de reglas que ya existen**, no de un número cualquiera. La metodología pide para
 * `active` una señal fechada en los últimos 12 meses: un local con más de 12 meses sin verificarse ya no
 * cumple su propio estado. Los 6 meses son un aviso temprano. Y un cierre temporal de meses es un dato falso
 * con otro nombre (ver `cierre` en el esquema), así que se pide revisarlo pasados 90 días.
 *
 * Solo cuentan los locales con `active`: los ocultos no se publican y no hay nada que revisar en ellos. Un
 * horario que falta no se presenta como un error: por la regla "horarios solo con fuente", que falte suele ser
 * lo correcto.
 */

export interface Revision {
  clave: string
  rotulo: string
}

export const REVISIONES: readonly Revision[] = [
  { clave: 'verificacion-12', rotulo: 'Verificación de más de 12 meses' },
  { clave: 'verificacion-6', rotulo: 'Verificación de más de 6 meses (aviso)' },
  { clave: 'cierre-90', rotulo: 'Cierre temporal de más de 90 días' },
  { clave: 'sin-horario', rotulo: 'Sin horario conocido' },
]

const DIA_MS = 24 * 60 * 60 * 1000

/** Días enteros entre dos fechas `AAAA-MM-DD`. Una fecha que no se entiende cuenta como infinitamente vieja. */
export function diasEntre(desde: string, hasta: string): number {
  const a = Date.parse(`${desde}T00:00:00Z`)
  const b = Date.parse(`${hasta}T00:00:00Z`)
  if (Number.isNaN(a) || Number.isNaN(b)) return Number.POSITIVE_INFINITY
  return Math.floor((b - a) / DIA_MS)
}

/** `true` si el negocio pide esa revisión. `hoy` es el día de Zibatá (`AAAA-MM-DD`). */
export function pideRevision(clave: string, negocio: Negocio, hoy: string): boolean {
  if (!negocio.active) return false
  switch (clave) {
    case 'verificacion-12':
      return !negocio.verification || diasEntre(negocio.verification.lastVerifiedAt, hoy) > 365
    case 'verificacion-6':
      return !negocio.verification || diasEntre(negocio.verification.lastVerifiedAt, hoy) > 183
    case 'cierre-90':
      return Boolean(negocio.cierre) && diasEntre(negocio.cierre?.desde ?? '', hoy) > 90
    case 'sin-horario':
      return negocio.hours === null
    default:
      return false
  }
}

export function contarRevisiones(
  negocios: readonly Negocio[],
  hoy: string,
): { clave: string; rotulo: string; total: number }[] {
  return REVISIONES.map(({ clave, rotulo }) => ({
    clave,
    rotulo,
    total: negocios.filter((negocio) => pideRevision(clave, negocio, hoy)).length,
  }))
}

/* ------------------------------------------------------------------ sugerencias */

/** Palabras que no distinguen un local de otro en Zibatá. */
const SIN_PESO = new Set(['del', 'las', 'los', 'una', 'por', 'con', 'zibata', 'plaza', 'local'])
/** Más candidatos que esto es demasiado ambiguo para ofrecer un botón por cada uno. */
export const TOPE_DE_COINCIDENCIAS = 5

export interface Coincidencia {
  negocio: Negocio
  plaza: string
}

const palabras = (texto: string): string[] =>
  normalizar(texto)
    .split(/[^a-z0-9]+/)
    .filter((palabra) => palabra.length >= 3 && !SIN_PESO.has(palabra))

/**
 * Los locales que el texto de una sugerencia puede estar nombrando. `lugar` lo escribió una persona, así que
 * es texto libre: nunca se elige uno por ella. Con una sola coincidencia se ofrece abrirlo; con varias, se
 * listan con su plaza; con demasiadas ("café"), no se ofrece ninguna.
 */
export function coincidencias(
  lugar: string,
  negocios: readonly Negocio[],
  plazas: readonly PlazaResumen[],
): Coincidencia[] {
  const buscadas = palabras(lugar)
  if (buscadas.length === 0) return []
  const completo = normalizar(lugar).trim()
  const nombreDePlaza = (id: string) => plazas.find((plaza) => plaza.id === id)?.name ?? ''
  const encontrados = negocios.filter((negocio) => {
    const nombre = normalizar(negocio.name)
    return nombre.includes(completo) || buscadas.every((palabra) => nombre.includes(palabra))
  })
  // El nombre exacto primero; después, por orden alfabético, para que la lista no cambie de una vez a otra.
  encontrados.sort((a, b) => {
    const exactoA = normalizar(a.name) === completo ? 0 : 1
    const exactoB = normalizar(b.name) === completo ? 0 : 1
    return exactoA - exactoB || a.name.localeCompare(b.name, 'es')
  })
  if (encontrados.length > TOPE_DE_COINCIDENCIAS) return []
  return encontrados.map((negocio) => ({ negocio, plaza: nombreDePlaza(negocio.plazaId) }))
}
