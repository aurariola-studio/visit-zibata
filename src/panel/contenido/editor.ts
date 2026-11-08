import controls from '../../styles/controls.module.css'
import { texto } from './tipos.ts'
import { vista } from './vista.ts'

export function abrirEditor(antetitulo: string, titulo: string, html: string): void {
  if (!vista.dialogo) return
  const campoAntetitulo = vista.dialogo.querySelector<HTMLElement>('[data-editor-antetitulo]')
  const campoTitulo = vista.dialogo.querySelector<HTMLElement>('[data-editor-titulo]')
  const cuerpo = vista.dialogo.querySelector<HTMLElement>('[data-editor-cuerpo]')
  if (!cuerpo) return
  if (campoAntetitulo) campoAntetitulo.textContent = antetitulo
  if (campoTitulo) campoTitulo.textContent = titulo
  cuerpo.innerHTML = html
  montarIndice(cuerpo)
  vista.aviso = null
  if (!vista.dialogo.open) vista.dialogo.showModal()
  cuerpo.querySelector<HTMLElement>('input, select, textarea')?.focus()
}

/** Con menos secciones que esto un formulario cabe en la vista y un índice sobra. */
const SECCIONES_PARA_INDICE = 4

/** Lo que se deja entre el índice fijo y el título de la sección a la que se salta. */
const HOLGURA_DEL_INDICE = 8

/**
 * Un índice fijo arriba del formulario: un negocio tiene nueve secciones y en un teléfono hay que bajar
 * mucho para llegar a "Dirección". Son enlaces a anclas (la familia "Navegar" del catálogo) y mover el
 * foco al título de la sección es lo que hace que un lector de pantalla también llegue.
 */
function montarIndice(cuerpo: HTMLElement): void {
  const formulario = cuerpo.querySelector<HTMLFormElement>('form[data-editor]')
  if (!formulario) return
  const secciones = [...formulario.querySelectorAll<HTMLElement>(':scope > section.editor-seccion')]
  if (secciones.length < SECCIONES_PARA_INDICE) return
  const enlaces: string[] = []
  secciones.forEach((seccion, posicion) => {
    const titulo = seccion.querySelector<HTMLElement>(':scope > h3')
    // Solo el texto del título: `<span class="nota">` es una aclaración, no parte del nombre.
    const nombre = [...(titulo?.childNodes ?? [])]
      .filter((nodo) => nodo.nodeType === Node.TEXT_NODE)
      .map((nodo) => nodo.textContent ?? '')
      .join('')
      .trim()
    if (!titulo || !nombre) return
    const id = `seccion-${posicion}`
    seccion.id = id
    titulo.tabIndex = -1
    enlaces.push(`<a class="${controls.enlace}" href="#${id}">${texto(nombre)}</a>`)
  })
  if (enlaces.length < SECCIONES_PARA_INDICE) return
  const indice = document.createElement('nav')
  indice.className = 'editor-indice'
  indice.setAttribute('aria-label', 'Ir a una sección del formulario')
  indice.innerHTML = enlaces.join('')
  indice.addEventListener('click', (evento) => {
    const enlace = (evento.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#seccion-"]')
    if (!enlace) return
    evento.preventDefault()
    const seccion = formulario.querySelector<HTMLElement>(enlace.getAttribute('href') ?? '')
    if (!seccion) return
    // Se desplaza solo el cuerpo del formulario. `scrollIntoView` movía también la caja del diálogo (un
    // contenedor con `overflow: hidden` se puede desplazar por código) y lo sacaba de la pantalla.
    const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const distancia =
      seccion.getBoundingClientRect().top -
      cuerpo.getBoundingClientRect().top +
      cuerpo.scrollTop -
      indice.offsetHeight -
      HOLGURA_DEL_INDICE
    cuerpo.scrollTo({ top: Math.max(0, distancia), behavior: sinMovimiento ? 'auto' : 'smooth' })
    seccion.querySelector<HTMLElement>(':scope > h3')?.focus({ preventScroll: true })
  })
  formulario.prepend(indice)
}

/** Cierra el diálogo. Con cambios sin guardar pide confirmación salvo que se fuerce. */
export function cerrarEditor(forzar = false): void {
  if (!vista.dialogo?.open) return
  if (!forzar && vista.formularioActual?.sucio) {
    if (!confirm('Hay cambios sin guardar. ¿Cerrar de todas formas?')) return
  }
  vista.dialogo.close()
}

export function puedeCerrar(): boolean {
  return (
    !vista.formularioActual?.sucio || confirm('Hay cambios sin guardar. ¿Cerrar de todas formas?')
  )
}

function limpiarProblemas(formEl: HTMLFormElement): void {
  for (const marcado of formEl.querySelectorAll('[aria-invalid]')) {
    marcado.removeAttribute('aria-invalid')
  }
  for (const descrito of formEl.querySelectorAll('[aria-describedby^="error-"]')) {
    descrito.removeAttribute('aria-describedby')
  }
  for (const mensaje of formEl.querySelectorAll('.campo-error.dinamico')) mensaje.remove()
}

export function limpiarErrorDe(control: Element): void {
  const id = control.getAttribute('aria-describedby')
  if (id?.startsWith('error-')) {
    document.getElementById(id)?.remove()
    control.removeAttribute('aria-describedby')
  }
  control.removeAttribute('aria-invalid')
}

function marcarError(formEl: HTMLFormElement, ruta: string, mensaje: string): boolean {
  const [campo, indice] = ruta.split('.')
  if (!campo) return false
  let contenedor: Element | null = null
  let foco: HTMLElement | null = null

  if (campo === 'fotos' && indice !== undefined) {
    foco = formEl.querySelector<HTMLElement>(`[data-alt-foto="${indice}"]`)
    contenedor = foco?.closest('.campo-form') ?? null
  } else if (campo === 'fotos' || campo === 'giros' || campo === 'horario' || campo === 'cierre') {
    contenedor = formEl.querySelector(`[data-grupo="${campo}"]`)
    foco =
      contenedor?.querySelector<HTMLElement>('input, select, textarea, button') ??
      (contenedor as HTMLElement | null)
  } else {
    foco =
      formEl.querySelector<HTMLElement>(`[name="${campo}"]`) ??
      formEl.querySelector<HTMLElement>(`[data-campo="${campo}"]`)
    contenedor = foco?.closest('.campo-form') ?? foco
  }
  if (!contenedor) return false

  const id = `vista.error-${campo}-${indice ?? 'uno'}`
  const parrafo = document.createElement('p')
  parrafo.className = 'campo-error dinamico'
  parrafo.id = id
  parrafo.textContent = mensaje
  if (campo === 'giros') contenedor.prepend(parrafo)
  else contenedor.append(parrafo)
  if (foco) {
    foco.setAttribute('aria-invalid', 'true')
    foco.setAttribute('aria-describedby', id)
  }
  return true
}

export function mostrarProblemas(formEl: HTMLFormElement, problemas: string[]): void {
  limpiarProblemas(formEl)
  const generales: string[] = []
  for (const problema of problemas) {
    const separador = problema.indexOf(':')
    const ruta = separador > 0 ? problema.slice(0, separador).trim() : ''
    const mensaje = separador > 0 ? problema.slice(separador + 1).trim() : problema
    if (ruta && marcarError(formEl, ruta, mensaje)) continue
    generales.push(problema)
  }
  const caja = formEl.querySelector<HTMLElement>('[data-problemas]')
  if (caja) caja.innerHTML = generales.map((problema) => `<p>${texto(problema)}</p>`).join('')
  const primero = formEl.querySelector<HTMLElement>('[aria-invalid="true"]')
  if (primero) {
    primero.focus()
    primero.scrollIntoView({ block: 'nearest' })
  }
}
