/**
 * ¿Hay una versión de los edificios de Overture más nueva que la que usa el mapa? Solo lee y avisa: no cambia nada.
 *
 * La versión que usa el mapa es `sources.overtureRelease` de `data/geographic/config.json` en `main` (lo publicado).
 * Las versiones que existen son las carpetas `release/<versión>/` del bucket público de Overture, que borra las
 * viejas a los dos meses: por eso se avisa también si la fijada ya no está listada (el mapa sigue funcionando
 * desde su snapshot, pero no se podría volver a bajar).
 *
 * El listado es una petición pública sin datos de nadie, hecha desde el servidor (el navegador no sale de su
 * origen: `connect-src 'self'`), y solo la dispara el panel, que está detrás de Access.
 */
import { type EntornoGitHub, leerArchivo } from './github.ts'

const LISTADO = 'https://overturemaps-us-west-2.s3.amazonaws.com/?prefix=release/&delimiter=/'
const VERSION = /^\d{4}-\d{2}-\d{2}\.\d+$/

export type EstadoDelMapa = 'al-dia' | 'hay-nueva' | 'fijada-retirada' | 'desconocido'

export interface VersionDelMapa {
  estado: EstadoDelMapa
  /** La que usa el mapa publicado; `null` si no se pudo leer. */
  fijada: string | null
  /** La más nueva que lista Overture; `null` si no se pudo consultar. */
  ultima: string | null
  /** Qué falló, si `estado` es `desconocido`. */
  motivo?: string
}

/** Las versiones que lista el XML de S3, sin repetir ni aceptar nada que no tenga la forma de una versión. */
export function versionesDelListado(xml: string): string[] {
  const versiones = [...xml.matchAll(/<Prefix>release\/([^/<]+)\/<\/Prefix>/g)]
    .map((coincidencia) => coincidencia[1] ?? '')
    .filter((version) => VERSION.test(version))
  return [...new Set(versiones)].sort(comparar)
}

/** Por fecha y, dentro de la misma fecha, por número: "2026-10-21.10" va después de "2026-10-21.9". */
export function comparar(a: string, b: string): number {
  const [fechaA = '', numA = '0'] = a.split('.')
  const [fechaB = '', numB = '0'] = b.split('.')
  return fechaA === fechaB ? Number(numA) - Number(numB) : fechaA < fechaB ? -1 : 1
}

/** La parte pura: con la fijada y lo que lista Overture, dice en qué situación está el mapa. */
export function situacion(fijada: string, disponibles: string[]): VersionDelMapa {
  const ultima = disponibles.at(-1) ?? null
  if (!ultima)
    return { estado: 'desconocido', fijada, ultima, motivo: 'Overture no listó ninguna versión.' }
  if (!disponibles.includes(fijada)) return { estado: 'fijada-retirada', fijada, ultima }
  return { estado: comparar(ultima, fijada) > 0 ? 'hay-nueva' : 'al-dia', fijada, ultima }
}

const desconocido = (motivo: string, fijada: string | null = null): VersionDelMapa => ({
  estado: 'desconocido',
  fijada,
  ultima: null,
  motivo,
})

/** Lee la versión fijada en `main` y la compara con el listado público. Un fallo de red se dice, no se oculta. */
export async function versionDelMapa(
  entorno: EntornoGitHub,
  pedirListado: typeof fetch = fetch,
): Promise<VersionDelMapa> {
  const texto = await leerArchivo(entorno, 'data/geographic/config.json', 'main')
  let fijada: unknown
  try {
    fijada = texto ? JSON.parse(texto)?.sources?.overtureRelease : undefined
  } catch {
    fijada = undefined
  }
  if (typeof fijada !== 'string' || !VERSION.test(fijada)) {
    return desconocido('No se pudo leer la versión fijada en config.json.')
  }

  try {
    const respuesta = await pedirListado(LISTADO, { signal: AbortSignal.timeout(5000) })
    if (!respuesta.ok) return desconocido(`Overture respondió ${respuesta.status}.`, fijada)
    const xml = await respuesta.text()
    // Con delimitador son pocas carpetas; un listado cortado daría una "última" falsa.
    if (xml.includes('<IsTruncated>true</IsTruncated>')) {
      return desconocido('El listado de Overture llegó incompleto.', fijada)
    }
    return situacion(fijada, versionesDelListado(xml))
  } catch {
    return desconocido('No se pudo consultar el listado de Overture.', fijada)
  }
}
