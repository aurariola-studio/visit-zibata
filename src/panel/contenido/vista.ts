import { ICONOS } from '../../data/iconos.ts'
import controls from '../../styles/controls.module.css'
import type { Datos, EstadoContenido, FormularioAbierto, ModoContenido, Negocio } from './tipos.ts'
import { numero, POR_PAGINA, texto } from './tipos.ts'

/**
 * El estado compartido del editor de contenido y las consultas que dependen de él.
 *
 * Un solo objeto en vez de variables sueltas por módulo: los módulos de cada entidad (negocios,
 * categorías, fotos) lo leen y lo escriben, y un `let` exportado no se puede reasignar desde fuera.
 */

interface Vista {
  raiz: HTMLElement | null
  dialogo: HTMLDialogElement | null
  avisarEstado: ((estado: EstadoContenido | null) => void) | null
  datos: Datos | null
  modo: ModoContenido
  consulta: string
  pagina: number
  aviso: string | null
  error: string | null
  visible: boolean
  cargando: boolean
  formularioActual: FormularioAbierto | null
  subiendoFoto: boolean
  guardando: boolean
}

export const vista: Vista = {
  raiz: null,
  dialogo: null,
  avisarEstado: null,
  datos: null,
  modo: 'negocios',
  consulta: '',
  pagina: 0,
  aviso: null,
  error: null,
  visible: false,
  cargando: false,
  formularioActual: null,
  subiendoFoto: false,
  guardando: false,
}

export function mapaDeGiros(): Map<string, string> {
  return new Map(
    (vista.datos?.categories ?? []).flatMap((categoria) =>
      categoria.giros.map((giro) => [giro.id, giro.label.es] as const),
    ),
  )
}

export function mapaDePlazas(): Map<string, string> {
  return new Map((vista.datos?.plazas ?? []).map((plaza) => [plaza.id, plaza.name] as const))
}

/** La categoría de cada giro, para enseñarla junto al nombre en el selector. */
export function categoriaDeGiro(id: string): string {
  return (
    vista.datos?.categories.find((categoria) => categoria.giros.some((giro) => giro.id === id))
      ?.label.es ?? ''
  )
}

export function paginacion(total: number, etiqueta: string): string {
  if (total <= POR_PAGINA) return ''
  const desde = vista.pagina * POR_PAGINA + 1
  const hasta = Math.min(total, (vista.pagina + 1) * POR_PAGINA)
  const boton = (destino: string, rotulo: string, activo: boolean) =>
    `<button type="button" class="${controls.base} ${controls.boton} ${controls.secundario}" data-pagina="${destino}"${activo ? '' : ' disabled'}>${rotulo}</button>`
  return `<nav class="paginacion" aria-label="Páginas de ${texto(etiqueta)}">
    ${boton('anterior', 'Anterior', vista.pagina > 0)}
    <p>${numero(desde)} a ${numero(hasta)} de ${numero(total)}</p>
    ${boton('siguiente', 'Siguiente', hasta < total)}
  </nav>`
}

function localesDeGiros(giros: Iterable<string>): Negocio[] {
  const buscados = new Set(giros)
  return (vista.datos?.places ?? []).filter((negocio) =>
    negocio.giros.some((giro) => buscados.has(giro)),
  )
}

const esVisible = (negocio: Negocio): boolean =>
  negocio.active &&
  (vista.datos?.plazas.find((plaza) => plaza.id === negocio.plazaId)?.active ?? false)

/** Los locales que de verdad salen en la guía: activos y en una plaza activa. */
export const localesVisibles = (giros: Iterable<string>): Negocio[] =>
  localesDeGiros(giros).filter(esVisible)

/** Iconos que ya usa un giro no general, para no ofrecer el mismo dibujo dos veces. */
export function iconosUsados(excepto = ''): Set<string> {
  const usados = new Set<string>()
  for (const categoria of vista.datos?.categories ?? []) {
    for (const giro of categoria.giros) {
      if (giro.general || giro.id === excepto) continue
      usados.add(giro.icon)
    }
  }
  return usados
}

export function opcionesDeIconos(seleccionado: string, usados: Set<string>): string {
  return ICONOS.map((icono) => {
    const bloqueado = usados.has(icono) && icono !== seleccionado
    return `<option value="${icono}"${icono === seleccionado ? ' selected' : ''}${bloqueado ? ' disabled' : ''}>${icono}${bloqueado ? ' (en uso)' : ''}</option>`
  }).join('')
}

export function opcionesDeCategorias(seleccionada: string): string {
  return (vista.datos?.categories ?? [])
    .map(
      (categoria) =>
        `<option value="${texto(categoria.id)}"${categoria.id === seleccionada ? ' selected' : ''}>${texto(categoria.label.es)}</option>`,
    )
    .join('')
}
