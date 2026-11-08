import controls from '../../styles/controls.module.css'
import { cerrarEditor, mostrarProblemas } from './editor.ts'
import { texto } from './tipos.ts'
import { vista } from './vista.ts'

/**
 * Cambiar la dirección web (el slug) de un negocio o de una plaza. Una sola sección para los dos
 * formularios: cambia el endpoint y el prefijo, el paso a paso es el mismo que el de un borrado.
 *
 *  1. "Ver el impacto" pide al Worker qué cambiaría, sin guardar nada.
 *  2. "Cambiar la dirección" lo manda a la PR del panel, con la redirección de la dirección antigua.
 *
 * El campo no lleva `name` y no marca el formulario como sucio: no es parte de "Guardar cambios", que
 * seguiría guardando el resto sin tocar la dirección. Pulsar Intro en él pide el impacto en vez de
 * enviar el formulario entero.
 */

type Tipo = 'negocio' | 'plaza'

const CONFIG = {
  negocio: { ruta: '/api/panel/contenido/negocio/slug', prefijo: '/es/lugar/', modo: 'negocios' },
  plaza: { ruta: '/api/panel/contenido/plaza/slug', prefijo: '/es/zona/', modo: 'plazas' },
} as const

interface ImpactoCambio {
  tipo: 'place' | 'plaza'
  entidad: { id: string; nombre: string }
  antes: string
  despues: string
  redirecciones: { desde: string; hacia: string }[]
  anterioresQueSeguiran: number
  avisos: string[]
}

interface Respuesta {
  ok?: boolean
  pr?: { url: string; numero: number; creada: boolean } | null
  mensaje?: string
  problemas?: string[]
  impacto?: ImpactoCambio
}

/** La sección del formulario. Solo para algo que ya existe: uno nuevo aún no tiene dirección. */
export function seccionDireccion(tipo: Tipo, slug: string): string {
  const { prefijo } = CONFIG[tipo]
  return `<section class="editor-seccion" data-direccion>
      <h3>Dirección en la web</h3>
      <p class="ayuda">Hoy es <code>${texto(prefijo + slug)}</code>. Si la cambias, la antigua pasa a la nueva con una redirección permanente. Solo minúsculas, números y guiones.</p>
      <div class="editor-rejilla">
        <label class="campo-form campo-ancho">
          <span>Dirección nueva</span>
          <input class="${controls.campo}" type="text" data-slug-nuevo value="${texto(slug)}" maxlength="80" autocomplete="off" spellcheck="false" autocapitalize="none" />
        </label>
      </div>
      <div class="acciones">
        <button type="button" class="${controls.base} ${controls.boton} ${controls.secundario}" data-cambiar-direccion>Ver el impacto</button>
      </div>
      <div data-cambio-direccion></div>
    </section>`
}

const tipoDe = (formulario: HTMLFormElement): Tipo | null => {
  const tipo = formulario.dataset.editor
  return tipo === 'negocio' || tipo === 'plaza' ? tipo : null
}

/** Habla con el Worker. Los errores salen en el formulario y devuelven `null`. */
async function llamar(
  formulario: HTMLFormElement,
  tipo: Tipo,
  cuerpo: { id: string; slug: string; confirmar?: boolean },
): Promise<Respuesta | null> {
  try {
    const respuesta = await fetch(CONFIG[tipo].ruta, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(cuerpo),
    })
    const resultado = (await respuesta.json().catch(() => null)) as Respuesta | null
    if (respuesta.status === 403) {
      mostrarProblemas(formulario, ['Sin permiso. Revisa la regla de Access.'])
      return null
    }
    if (respuesta.status === 503) {
      mostrarProblemas(formulario, ['Falta GITHUB_TOKEN en el Worker.'])
      return null
    }
    if (!respuesta.ok || !resultado?.ok) {
      mostrarProblemas(
        formulario,
        resultado?.problemas?.length ? resultado.problemas : ['No se pudo cambiar la dirección.'],
      )
      return null
    }
    return resultado
  } catch {
    mostrarProblemas(formulario, ['No se pudo hablar con el servidor.'])
    return null
  }
}

/** Primer paso: enseña qué cambiaría, sin guardar nada. */
async function pedirImpacto(formulario: HTMLFormElement, tipo: Tipo): Promise<void> {
  const id = formulario.dataset.id
  const entrada = formulario.querySelector<HTMLInputElement>('[data-slug-nuevo]')
  const zona = formulario.querySelector<HTMLElement>('[data-cambio-direccion]')
  if (!id || !entrada || !zona || vista.guardando) return
  mostrarProblemas(formulario, [])
  // El cambio guarda solo la dirección: lo demás que se haya escrito se perdería al cerrar el diálogo.
  if (vista.formularioActual?.sucio) {
    mostrarProblemas(formulario, [
      'Hay cambios sin guardar. Guárdalos (o ciérralos) antes de cambiar la dirección: este cambio solo guarda la dirección.',
    ])
    return
  }
  const resultado = await llamar(formulario, tipo, { id, slug: entrada.value })
  if (!resultado?.impacto) return
  const { impacto } = resultado

  const direcciones = impacto.redirecciones
    .map(
      (fila) =>
        `<li><code>${texto(fila.desde)}</code> pasa a <code>${texto(fila.hacia)}</code> (redirección permanente)</li>`,
    )
    .join('')
  zona.innerHTML = `<section class="editor-seccion impacto-borrado" aria-labelledby="titulo-direccion" tabindex="-1" data-slug="${texto(impacto.despues)}">
      <h3 id="titulo-direccion">Si cambias la dirección de ${texto(impacto.entidad.nombre)}</h3>
      <ul class="impacto-lista">${direcciones}</ul>
      <ul class="impacto-lista">${impacto.avisos.map((aviso) => `<li>${texto(aviso)}</li>`).join('')}</ul>
      <div class="acciones">
        <button type="button" class="${controls.base} ${controls.boton} ${controls.principal}" data-confirmar-direccion>Cambiar la dirección</button>
        <button type="button" class="${controls.base} ${controls.boton} ${controls.secundario}" data-cancelar-direccion>Mejor no</button>
      </div>
    </section>`
  zona.querySelector<HTMLElement>('section')?.focus()
}

/** Segundo paso: el cambio va a la PR del panel. */
async function confirmar(
  formulario: HTMLFormElement,
  tipo: Tipo,
  recargar: () => Promise<void>,
): Promise<void> {
  const id = formulario.dataset.id
  // Lo que se confirma es lo que se vio: la dirección del paso de impacto, no lo que haya en el campo.
  const slug = formulario.querySelector<HTMLElement>('[data-cambio-direccion] [data-slug]')?.dataset
    .slug
  if (!id || !slug || vista.guardando) return
  mostrarProblemas(formulario, [])
  const botones = formulario.querySelectorAll<HTMLButtonElement>('[data-cambio-direccion] button')
  for (const boton of botones) boton.disabled = true
  vista.guardando = true
  try {
    const resultado = await llamar(formulario, tipo, { id, slug, confirmar: true })
    if (!resultado) return
    vista.aviso = resultado.pr
      ? `${resultado.mensaje ?? 'Dirección cambiada.'} ${resultado.pr.creada ? 'PR abierta' : 'Añadido a la PR'} #${resultado.pr.numero}.`
      : (resultado.mensaje ?? 'Validado en desarrollo. No se commitea.')
    vista.modo = CONFIG[tipo].modo
    cerrarEditor(true)
    await recargar()
  } finally {
    vista.guardando = false
    for (const boton of botones) boton.disabled = false
  }
}

/** Los botones de la sección. Devuelve si lo atendió. */
export function alPulsarDireccion(objetivo: HTMLElement, recargar: () => Promise<void>): boolean {
  const formulario = objetivo.closest<HTMLFormElement>('form[data-editor]')
  const tipo = formulario && tipoDe(formulario)
  if (!formulario || !tipo) return false
  if (objetivo.closest('[data-cambiar-direccion]')) {
    void pedirImpacto(formulario, tipo)
    return true
  }
  if (objetivo.closest('[data-confirmar-direccion]')) {
    void confirmar(formulario, tipo, recargar)
    return true
  }
  if (objetivo.closest('[data-cancelar-direccion]')) {
    const zona = formulario.querySelector<HTMLElement>('[data-cambio-direccion]')
    if (zona) zona.innerHTML = ''
    formulario.querySelector<HTMLElement>('[data-slug-nuevo]')?.focus()
    return true
  }
  return false
}

/** Escribir en el campo descarta un impacto ya enseñado (describe otra dirección) y no ensucia el formulario. */
export function alEscribirDireccion(objetivo: HTMLElement): boolean {
  if (!objetivo.matches('[data-slug-nuevo]')) return false
  const zona = objetivo.closest('form')?.querySelector<HTMLElement>('[data-cambio-direccion]')
  if (zona) zona.innerHTML = ''
  return true
}

/**
 * Salir del campo dispara `change`, y el formulario de plaza lo toma por una edición: sin esto, pulsar
 * "Ver el impacto" ensuciaría el formulario y el propio paso se negaría a seguir.
 */
export const alCambiarDireccion = (objetivo: HTMLElement): boolean =>
  objetivo.matches('[data-slug-nuevo]')

/** Intro en el campo pide el impacto; sin esto enviaría el formulario entero. */
export function alTeclearDireccion(evento: KeyboardEvent): void {
  const objetivo = evento.target as HTMLElement | null
  if (evento.key !== 'Enter' || !objetivo?.matches('[data-slug-nuevo]')) return
  evento.preventDefault()
  const formulario = objetivo.closest<HTMLFormElement>('form[data-editor]')
  const tipo = formulario && tipoDe(formulario)
  if (formulario && tipo) void pedirImpacto(formulario, tipo)
}
