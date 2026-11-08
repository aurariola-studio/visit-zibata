import controls from '../../styles/controls.module.css'
import { hayCambiosSinGuardar } from './direccion.ts'
import { cerrarEditor, mostrarProblemas } from './editor.ts'
import { numero, texto } from './tipos.ts'
import { vista } from './vista.ts'

/**
 * Borrar un giro suelto desde el formulario de su categoría. Va en dos pasos como los demás borrados
 * (`POST /api/panel/contenido/giro/borrar`): primero el impacto, sin guardar nada, y luego la
 * confirmación. Solo se ofrece para un giro que ningún local usa, de cualquier estado, y que no es el
 * general de su categoría; en los demás casos se dice por qué no.
 */

interface ImpactoBorradoGiro {
  giro: { id: string; nombre: string }
  categoria: { id: string; nombre: string }
  gustosDeLocalesBorrados: number
  avisos: string[]
}

interface Respuesta {
  ok?: boolean
  pr?: { url: string; numero: number; creada: boolean } | null
  mensaje?: string
  problemas?: string[]
  impacto?: ImpactoBorradoGiro
}

/** Lo que va al pie de la ficha de un giro ya guardado: el botón, o la razón de que no haya. */
export function accionesDeGiro(giro: { id: string; general?: boolean }): string {
  if (!giro.id) return ''
  if (giro.general) {
    return '<p class="ayuda">Es el giro general: un local sin giro más concreto cae en él. No se borra.</p>'
  }
  const usados = (vista.datos?.places ?? []).filter((negocio) => negocio.giros.includes(giro.id))
  if (usados.length > 0) {
    return `<p class="ayuda">Para borrarlo, primero cambia el giro de sus ${numero(usados.length)} ${usados.length === 1 ? 'local' : 'locales'}.</p>`
  }
  return `<div class="acciones"><button type="button" class="${controls.base} ${controls.boton} ${controls.secundario}" data-borrar-giro>Borrar giro</button></div>
    <div data-borrado-giro></div>`
}

/** Habla con el Worker. Los errores salen en el formulario y devuelven `null`. */
async function llamar(
  formulario: HTMLFormElement,
  cuerpo: { id: string; confirmar?: boolean },
): Promise<Respuesta | null> {
  try {
    const respuesta = await fetch('/api/panel/contenido/giro/borrar', {
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
        resultado?.problemas?.length ? resultado.problemas : ['No se pudo borrar.'],
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
async function pedirImpacto(formulario: HTMLFormElement, ficha: HTMLElement): Promise<void> {
  const id = ficha.dataset.id
  const zona = ficha.querySelector<HTMLElement>('[data-borrado-giro]')
  if (!id || !zona || vista.guardando) return
  mostrarProblemas(formulario, [])
  // Cerrar el diálogo al terminar descartaría lo que se haya escrito en el resto del formulario.
  if (hayCambiosSinGuardar(formulario)) {
    mostrarProblemas(formulario, [
      'Hay cambios sin guardar. Guárdalos (o ciérralos) antes de borrar un giro: al terminar se cierra el formulario.',
    ])
    return
  }
  const resultado = await llamar(formulario, { id })
  if (!resultado?.impacto) return
  const { impacto } = resultado

  zona.innerHTML = `<section class="editor-seccion impacto-borrado" aria-labelledby="titulo-borrado-giro-${texto(id)}" tabindex="-1">
      <h3 id="titulo-borrado-giro-${texto(id)}">Si borras ${texto(impacto.giro.nombre)}</h3>
      <p class="impacto-contenido">Sale de la categoría ${texto(impacto.categoria.nombre)}.</p>
      <ul class="impacto-lista">${impacto.avisos.map((aviso) => `<li>${texto(aviso)}</li>`).join('')}</ul>
      <div class="acciones">
        <button type="button" class="${controls.base} ${controls.boton} ${controls.principal}" data-confirmar-borrado-giro>Borrar este giro</button>
        <button type="button" class="${controls.base} ${controls.boton} ${controls.secundario}" data-cancelar-borrado-giro>Mejor no</button>
      </div>
    </section>`
  zona.querySelector<HTMLElement>('section')?.focus()
}

/** Segundo paso: el borrado va a la PR del panel. */
async function confirmar(
  formulario: HTMLFormElement,
  ficha: HTMLElement,
  recargar: () => Promise<void>,
): Promise<void> {
  const id = ficha.dataset.id
  if (!id || vista.guardando) return
  mostrarProblemas(formulario, [])
  const botones = ficha.querySelectorAll<HTMLButtonElement>('[data-borrado-giro] button')
  for (const boton of botones) boton.disabled = true
  vista.guardando = true
  try {
    const resultado = await llamar(formulario, { id, confirmar: true })
    if (!resultado) return
    vista.aviso = resultado.pr
      ? `${resultado.mensaje ?? 'Borrado.'} ${resultado.pr.creada ? 'PR abierta' : 'Añadido a la PR'} #${resultado.pr.numero}.`
      : (resultado.mensaje ?? 'Validado en desarrollo. No se commitea.')
    vista.modo = 'categorias'
    cerrarEditor(true)
    await recargar()
  } finally {
    vista.guardando = false
    for (const boton of botones) boton.disabled = false
  }
}

/** Los botones del borrado de un giro. Devuelve si lo atendió. */
export function alPulsarBorrarGiro(objetivo: HTMLElement, recargar: () => Promise<void>): boolean {
  const formulario = objetivo.closest<HTMLFormElement>('form[data-editor="categoria"]')
  const ficha = objetivo.closest<HTMLElement>('[data-giro]')
  if (!formulario || !ficha) return false
  if (objetivo.closest('[data-borrar-giro]')) {
    void pedirImpacto(formulario, ficha)
    return true
  }
  if (objetivo.closest('[data-confirmar-borrado-giro]')) {
    void confirmar(formulario, ficha, recargar)
    return true
  }
  if (objetivo.closest('[data-cancelar-borrado-giro]')) {
    const zona = ficha.querySelector<HTMLElement>('[data-borrado-giro]')
    if (zona) zona.innerHTML = ''
    ficha.querySelector<HTMLElement>('[data-borrar-giro]')?.focus()
    return true
  }
  return false
}
