import controls from '../../styles/controls.module.css'
import type { Verificacion } from './tipos.ts'
import { texto } from './tipos.ts'

/**
 * La sección "Procedencia" de los formularios de local y de plaza: de dónde sale que existe.
 *
 * Es la contraparte de `worker/verificacion.ts`. Aquí solo se pide lo que la persona declara; el servidor
 * decide qué cambió. El bloque viaja siempre y, si no se tocó, el servidor deja `verification` como estaba.
 */

const CONFIANZAS: [string, string][] = [
  ['high', 'Alta'],
  ['medium', 'Media'],
  ['low', 'Baja'],
]

/** Los estados de la metodología (research/methodology.md), con lo que cada uno quiere decir. */
const ESTADOS: [string, string][] = [
  ['active', 'Activa: confirmada'],
  ['likely_active', 'Probablemente activa'],
  ['uncertain', 'Incierta'],
  ['coming_soon', 'Próximamente'],
  ['closed', 'Cerrada'],
  ['removed', 'Quitada'],
  ['duplicate', 'Duplicada'],
  ['rejected', 'Rechazada'],
]

const esMarcaDeCampo = (fuente: string): boolean => /^campo:\d{4}-\d{2}-\d{2}$/.test(fuente)

export const rotuloDeEstado = (estado: string): string =>
  ESTADOS.find(([clave]) => clave === estado)?.[1] ?? estado

interface Opciones {
  /** Lo que ya está guardado. Ausente en un local nuevo. */
  verificacion?: Verificacion
  /** Un local nuevo no puede guardarse sin declarar de dónde sale. */
  obligatoria: boolean
  /** Las plazas pueden cambiar su estado de investigación; un local lo deduce. */
  conEstado: boolean
}

export function seccionProcedencia({ verificacion, obligatoria, conEstado }: Opciones): string {
  const urls = (verificacion?.sources ?? []).filter((fuente) => !esMarcaDeCampo(fuente))
  const marcas = (verificacion?.sources ?? []).filter(esMarcaDeCampo)
  const confianza = verificacion?.confidence ?? 'medium'
  const estado = verificacion?.status ?? 'uncertain'
  const opciones = (lista: [string, string][], elegida: string): string =>
    lista
      .map(
        ([clave, rotulo]) =>
          `<option value="${clave}"${clave === elegida ? ' selected' : ''}>${texto(rotulo)}</option>`,
      )
      .join('')

  const historia = verificacion
    ? `<p class="ayuda" data-procedencia-historia>Estado actual: <strong>${texto(rotuloDeEstado(verificacion.status))}</strong>. Última verificación: ${texto(verificacion.lastVerifiedAt)}.${
        marcas.length > 0
          ? ` Verificaciones en el lugar: ${marcas.map((marca) => `<code>${texto(marca)}</code>`).join(', ')}.`
          : ''
      }</p>`
    : ''

  return `<section class="editor-seccion" data-procedencia>
    <h3>Procedencia <span class="nota">de dónde sale que existe</span></h3>
    <p class="ayuda">${
      obligatoria
        ? 'Sin fuente no se añade. Marca la casilla si fuiste a verlo, o aporta una fuente.'
        : 'Guardar una errata no toca la procedencia: solo cambia si marcas la casilla o añades una fuente.'
    }</p>
    ${historia}
    <div class="editor-rejilla">
      <div class="campo-form campo-ancho">
        <label class="casilla"><input type="checkbox" name="comprobadoPorMi" /><span>Lo comprobé yo en el lugar</span></label>
        <span class="ayuda">Anota <code>campo:</code> con la fecha de hoy y deja el local como activo. Es una afirmación tuya: no la marques si no fuiste.</span>
      </div>
      <label class="campo-form campo-ancho">
        <span>Fuentes <span class="ayuda">una URL por línea</span></span>
        <textarea class="${controls.campo} ${controls.areaTexto}" name="fuentes" rows="3" placeholder="https://…">${texto(urls.join('\n'))}</textarea>
        <span class="ayuda">Sitio, redes o ficha del propio negocio. Solo OpenStreetMap o una app de reparto no basta para publicar. Hasta 8 contando las verificaciones en el lugar.</span>
      </label>
      <label class="campo-form">
        <span>Confianza</span>
        <select class="${controls.campo}" name="confianza">${opciones(CONFIANZAS, confianza)}</select>
      </label>
      ${
        conEstado
          ? `<label class="campo-form">
        <span>Estado de investigación</span>
        <select class="${controls.campo}" name="estado">${opciones(ESTADOS, estado)}</select>
        <span class="ayuda">Pasar de un estado que no se publica a uno que sí pide evidencia en este mismo guardado: la casilla o una fuente oficial nueva.</span>
      </label>`
          : ''
      }
    </div>
  </section>`
}

/** Lo que el servidor espera en `verificacion`. */
export function leerProcedencia(
  formulario: HTMLFormElement,
  conEstado: boolean,
): Record<string, unknown> {
  const valor = (nombre: string): string =>
    (
      formulario.elements.namedItem(nombre) as
        | HTMLInputElement
        | HTMLTextAreaElement
        | HTMLSelectElement
        | null
    )?.value ?? ''
  return {
    comprobadoPorMi:
      formulario.querySelector<HTMLInputElement>('input[name="comprobadoPorMi"]')?.checked ?? false,
    fuentes: valor('fuentes')
      .split('\n')
      .map((linea) => linea.trim())
      .filter(Boolean),
    confianza: valor('confianza') || 'medium',
    ...(conEstado ? { estado: valor('estado') } : {}),
  }
}

/** Lo que se puede decir sin ir al servidor; el resto (metodología, tope) lo dice el Worker. */
export function validarProcedencia(formulario: HTMLFormElement, obligatoria: boolean): string[] {
  const { comprobadoPorMi, fuentes } = leerProcedencia(formulario, false) as {
    comprobadoPorMi: boolean
    fuentes: string[]
  }
  const problemas: string[] = []
  const mala = fuentes.find((fuente) => !/^https?:\/\/\S+$/i.test(fuente))
  if (mala)
    problemas.push(`fuentes: "${mala}" no es una URL. Escribe la dirección completa, con https://.`)
  if (obligatoria && !comprobadoPorMi && fuentes.length === 0) {
    problemas.push(
      'fuentes: Marca "Lo comprobé yo" si fuiste a verlo, o aporta al menos una fuente.',
    )
  }
  return problemas
}
