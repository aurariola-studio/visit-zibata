/**
 * El panel y su propia PR: ver en qué estado está y deshacer lo último que se mandó.
 *
 * Los cambios del panel se acumulan en una sola PR, un commit por guardado. Hasta ahora el panel no la veía:
 * un cambio que el CI rechazaba (un ajuste de edificio que `map:build` no acepta, un título de más de 60
 * caracteres) solo se descubría abriendo GitHub. Aquí se lee lo que GitHub ya sabe de ella.
 *
 * **Ver** no pide permisos nuevos: `mergeable_state` de la propia PR dice si hay conflictos, si está al día y si
 * el resumen de checks es bueno. El detalle por check (`Checks: lectura` en el token) es un extra: sin él se dice
 * en palabras y el resto sigue funcionando.
 *
 * **Deshacer** tiene dos acciones, las dos en dos pasos y con lo que se pierde a la vista:
 *
 *  - *Retirar el último cambio*: mueve la rama un commit atrás. Solo el último, y solo si lo hizo el panel
 *    (un padre, mensaje "Panel: …") y hay otro por debajo. Un commit del medio no se retira: exigiría un revert
 *    con fusión de tres vías sobre JSON, y se corrige editando otra vez desde el panel. La cabeza que se vio va
 *    en la petición y se compara con la actual: si otra pestaña guardó entre medias, se rechaza.
 *  - *Descartar la PR*: la cierra, sin tocar la rama. El siguiente guardado la reinicia desde `main`; los
 *    commits siguen alcanzables desde la PR cerrada.
 */
import { z } from 'zod'
import {
  type EntornoGitHub,
  faltaToken,
  pedir,
  pedirOpcional,
  prAbierta,
  ramaDe,
  respuestaDe,
} from './github.ts'

export type EstadoDeLaPr =
  | 'verde'
  | 'rojo'
  | 'pendiente'
  | 'conflictos'
  | 'desactualizada'
  | 'calculando'
  | 'sin-clasificar'

export interface CambioDeLaPr {
  sha: string
  mensaje: string
  fecha: string
  /** Lo hizo el panel: un padre y mensaje "Panel: …". Solo esos se pueden retirar. */
  delPanel: boolean
}

export interface VistaDeLaPr {
  numero: number
  url: string
  titulo: string
  estado: EstadoDeLaPr
  /** Lo que dice GitHub tal cual, para quien quiera ir al fondo. */
  estadoDeGithub: string | null
  /** El commit más reciente de la rama. Se manda de vuelta al retirar, para no retirar otro. */
  cabeza: string
  cambios: CambioDeLaPr[]
  /** `null` si el token no puede leer los checks. */
  checks: null | {
    correctos: number
    pendientes: number
    fallidos: { nombre: string; url: string | null }[]
  }
}

export type ResultadoVerPr =
  | { ok: true; seco: boolean; pr: VistaDeLaPr | null }
  | { ok: false; problemas: string[] }

const FALLOS = new Set(['failure', 'timed_out', 'cancelled', 'action_required', 'startup_failure'])

interface PullGitHub {
  title: string
  html_url: string
  mergeable_state?: string | null
  head: { sha: string }
}

interface CommitGitHub {
  sha: string
  parents?: { sha: string }[]
  commit: { message: string; author?: { date?: string } }
}

interface CheckRun {
  name: string
  status: string
  conclusion: string | null
  html_url?: string | null
}

const primeraLinea = (mensaje: string): string => mensaje.split('\n')[0] ?? ''

const esDelPanel = (commit: CommitGitHub): boolean =>
  (commit.parents?.length ?? 0) === 1 && primeraLinea(commit.commit.message).startsWith('Panel:')

/** Junta lo que dicen los checks y `mergeable_state` en una sola palabra. */
export function estadoDe(
  mergeableState: string | null | undefined,
  checks: VistaDeLaPr['checks'],
): EstadoDeLaPr {
  if (mergeableState === 'dirty') return 'conflictos'
  if (checks) {
    if (checks.fallidos.length > 0) return 'rojo'
    if (checks.pendientes > 0) return 'pendiente'
    if (checks.correctos > 0) return 'verde'
  }
  switch (mergeableState) {
    case 'clean':
      return 'verde'
    case 'behind':
      return 'desactualizada'
    case 'unknown':
    case null:
    case undefined:
      return 'calculando'
    default:
      return 'sin-clasificar'
  }
}

async function leerChecks(entorno: EntornoGitHub, sha: string): Promise<VistaDeLaPr['checks']> {
  const respuesta = await respuestaDe(entorno, `/commits/${sha}/check-runs?per_page=100`)
  // Sin el permiso "Checks: lectura" GitHub contesta 403 (o 404): no es un fallo, es un dato que falta.
  if (!respuesta.ok) return null
  const datos = (await respuesta.json()) as { check_runs?: CheckRun[] }
  const corridas = datos.check_runs ?? []
  const fallidos = corridas
    .filter((corrida) => corrida.status === 'completed' && FALLOS.has(corrida.conclusion ?? ''))
    .map((corrida) => ({ nombre: corrida.name, url: corrida.html_url ?? null }))
  return {
    correctos: corridas.filter(
      (corrida) => corrida.status === 'completed' && !FALLOS.has(corrida.conclusion ?? ''),
    ).length,
    pendientes: corridas.filter((corrida) => corrida.status !== 'completed').length,
    fallidos,
  }
}

/** Lo que el panel enseña de su PR abierta. Sin token (desarrollo) o sin PR devuelve `pr: null`. */
export async function verPr(entorno: EntornoGitHub): Promise<ResultadoVerPr> {
  if (faltaToken(entorno)) return { ok: true, seco: true, pr: null }
  const abierta = await prAbierta(entorno)
  if (!abierta) return { ok: true, seco: false, pr: null }
  const [pull, commits] = await Promise.all([
    pedir<PullGitHub>(entorno, `/pulls/${abierta.numero}`),
    pedir<CommitGitHub[]>(entorno, `/pulls/${abierta.numero}/commits?per_page=100`),
  ])
  const checks = await leerChecks(entorno, pull.head.sha)
  return {
    ok: true,
    seco: false,
    pr: {
      numero: abierta.numero,
      url: pull.html_url,
      titulo: pull.title,
      estado: estadoDe(pull.mergeable_state, checks),
      estadoDeGithub: pull.mergeable_state ?? null,
      cabeza: pull.head.sha,
      // Del más reciente al más viejo: lo último que se hizo es lo primero que se ve.
      cambios: commits
        .map((commit) => ({
          sha: commit.sha,
          mensaje: primeraLinea(commit.commit.message),
          fecha: commit.commit.author?.date ?? '',
          delPanel: esDelPanel(commit),
        }))
        .reverse(),
      checks,
    },
  }
}

/* ------------------------------------------------------------------ deshacer */

export const EntradaRetirarSchema = z.strictObject({
  /** El commit más reciente que vio quien pide retirarlo. */
  cabeza: z.string().regex(/^[0-9a-f]{40}$/, 'Falta la cabeza de la rama'),
  confirmar: z.boolean().optional().default(false),
})

export const EntradaDescartarSchema = z.strictObject({
  numero: z.number().int().positive(),
  confirmar: z.boolean().optional().default(false),
})

export interface LoQueSePierde {
  mensaje: string
  archivos: string[]
  /** El commit sube una foto: al retirarlo, la foto se va con él. */
  conFoto: boolean
}

export type ResultadoRetirar =
  | { ok: true; confirmado: boolean; mensaje: string; pierde: LoQueSePierde }
  | { ok: false; problemas: string[] }

export type ResultadoDescartar =
  | { ok: true; confirmado: boolean; mensaje: string; cambios: number }
  | { ok: false; problemas: string[] }

const mensajes = (error: z.ZodError): string[] =>
  error.issues.map((problema) => `${problema.path.join('.') || 'datos'}: ${problema.message}`)

const SIN_TOKEN = 'Sin GITHUB_TOKEN no hay una PR que gestionar.'

export async function retirarUltimo(
  entorno: EntornoGitHub,
  cuerpo: unknown,
): Promise<ResultadoRetirar> {
  const entrada = EntradaRetirarSchema.safeParse(cuerpo)
  if (!entrada.success) return { ok: false, problemas: mensajes(entrada.error) }
  if (faltaToken(entorno)) return { ok: false, problemas: [SIN_TOKEN] }
  if (!(await prAbierta(entorno))) {
    return { ok: false, problemas: ['No hay una PR abierta del panel.'] }
  }

  const rama = ramaDe(entorno)
  const cabeza = await pedirOpcional<{ object: { sha: string } }>(entorno, `/git/ref/heads/${rama}`)
  if (!cabeza) return { ok: false, problemas: ['La rama del panel ya no existe.'] }
  // La rama se movió desde que se vio (otra pestaña, una foto): "el último cambio" ya es otro.
  if (cabeza.object.sha !== entrada.data.cabeza) {
    return {
      ok: false,
      problemas: [
        'La rama cambió desde que la viste. Recarga el panel y vuelve a mirar qué retirar.',
      ],
    }
  }

  const ultimo = await pedir<CommitGitHub & { files?: { filename: string }[] }>(
    entorno,
    `/commits/${cabeza.object.sha}`,
  )
  if (!esDelPanel(ultimo)) {
    return {
      ok: false,
      problemas: [
        'El último commit no lo hizo el panel (o es una fusión): no se retira desde aquí. Hazlo desde GitHub.',
      ],
    }
  }
  const comparacion = await pedir<{ ahead_by: number }>(
    entorno,
    `/compare/main...${cabeza.object.sha}`,
  )
  if (comparacion.ahead_by <= 1) {
    return {
      ok: false,
      problemas: [
        'Es el único cambio de la PR: retirarlo la deja vacía. Usa "Descartar la PR", que la cierra.',
      ],
    }
  }

  const padre = ultimo.parents?.[0]?.sha
  const archivos = (ultimo.files ?? []).map((archivo) => archivo.filename)
  const pierde: LoQueSePierde = {
    mensaje: primeraLinea(ultimo.commit.message),
    archivos,
    conFoto: archivos.some((ruta) => ruta.startsWith('public/images/')),
  }
  if (!entrada.data.confirmar || !padre) {
    return {
      ok: true,
      confirmado: false,
      mensaje: 'Esto es lo que se retiraría. No se ha tocado nada.',
      pierde,
    }
  }

  // Mover una rama hacia atrás es un `force`; la rama es la propia del panel y `ramaDe` nunca es `main`.
  await pedir(entorno, `/git/refs/heads/${rama}`, {
    method: 'PATCH',
    body: JSON.stringify({ sha: padre, force: true }),
  })
  return { ok: true, confirmado: true, mensaje: 'Cambio retirado de la PR.', pierde }
}

export async function descartarPr(
  entorno: EntornoGitHub,
  cuerpo: unknown,
): Promise<ResultadoDescartar> {
  const entrada = EntradaDescartarSchema.safeParse(cuerpo)
  if (!entrada.success) return { ok: false, problemas: mensajes(entrada.error) }
  if (faltaToken(entorno)) return { ok: false, problemas: [SIN_TOKEN] }
  const abierta = await prAbierta(entorno)
  if (!abierta) return { ok: false, problemas: ['No hay una PR abierta del panel.'] }
  if (abierta.numero !== entrada.data.numero) {
    return {
      ok: false,
      problemas: ['La PR abierta ya no es la que viste. Recarga el panel y vuelve a mirar.'],
    }
  }
  const commits = await pedir<CommitGitHub[]>(
    entorno,
    `/pulls/${abierta.numero}/commits?per_page=100`,
  )
  if (!entrada.data.confirmar) {
    return {
      ok: true,
      confirmado: false,
      mensaje: 'Esto es lo que se descartaría. No se ha tocado nada.',
      cambios: commits.length,
    }
  }
  await pedir(entorno, `/pulls/${abierta.numero}`, {
    method: 'PATCH',
    body: JSON.stringify({ state: 'closed' }),
  })
  return { ok: true, confirmado: true, mensaje: 'PR cerrada.', cambios: commits.length }
}
