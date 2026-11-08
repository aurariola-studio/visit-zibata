import controls from '../../styles/controls.module.css'
import { cerrarEditor, mostrarProblemas } from './editor.ts'
import { texto } from './tipos.ts'
import { vista } from './vista.ts'

/**
 * Cambiar la dirección web (el slug) de un negocio, una plaza o una categoría. Una sola sección para los
 * tres formularios: cambia el endpoint y el prefijo, el paso a paso es el mismo que el de un borrado.
 *
 *  1. "Ver el impacto" pide al Worker qué cambiaría, sin guardar nada.
 *  2. "Cambiar la dirección" lo manda a la PR del panel, con la redirección de la dirección antigua.
 *
 * El campo no lleva `name` y no marca el formulario como sucio: no es parte de "Guardar cambios", que
 * seguiría guardando el resto sin tocar la dirección. Pulsar Intro en él pide el impacto en vez de
 * enviar el formulario entero.
 *
 * Una categoría tiene un slug por idioma, así que su formulario lleva DOS secciones. Todo se busca dentro
 * de la sección del control que se tocó (`[data-direccion]`), nunca en el formulario entero: con dos
 * campos, buscar en el formulario leería siempre el primero.
 */

type Tipo = 'negocio' | 'plaza' | 'categoria'
type Idioma = 'es' | 'en'

const CONFIG = {
  negocio: { ruta: '/api/panel/contenido/negocio/slug', modo: 'negocios' },
  plaza: { ruta: '/api/panel/contenido/plaza/slug', modo: 'plazas' },
  categoria: { ruta: '/api/panel/contenido/categoria/slug', modo: 'categorias' },
} as const

const PREFIJO = {
  negocio: { es: '/es/lugar/', en: '/en/place/' },
  plaza: { es: '/es/zona/', en: '/en/area/' },
  categoria: { es: '/es/categoria/', en: '/en/category/' },
} as const

const IDIOMA_EN_TEXTO = { es: 'español', en: 'inglés' } as const

interface ImpactoCambio {
  tipo: 'place' | 'plaza' | 'category'
  lang: Idioma | null
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

/**
 * La sección del formulario. Solo para algo que ya existe: uno nuevo aún no tiene dirección. Una categoría
 * pasa un slug por idioma y obtiene una sección por cada uno.
 */
export function seccionDireccion(tipo: Tipo, slug: string | { es: string; en: string }): string {
  if (typeof slug === 'string') return unaSeccion(tipo, slug, null)
  return (['es', 'en'] as const).map((idioma) => unaSeccion(tipo, slug[idioma], idioma)).join('\n')
}

function unaSeccion(tipo: Tipo, slug: string, idioma: Idioma | null): string {
  const prefijo = PREFIJO[tipo][idioma ?? 'es']
  const titulo = idioma
    ? `Dirección en la web, en ${IDIOMA_EN_TEXTO[idioma]}`
    : 'Dirección en la web'
  const enIdioma = idioma ? ` (${IDIOMA_EN_TEXTO[idioma]})` : ''
  return `<section class="editor-seccion" data-direccion${idioma ? ` data-lang="${idioma}"` : ''}>
      <h3>${titulo}</h3>
      <p class="ayuda">Hoy es <code>${texto(prefijo + slug)}</code>. Si la cambias, la antigua pasa a la nueva con una redirección permanente. Solo minúsculas, números y guiones.</p>
      <div class="editor-rejilla">
        <label class="campo-form campo-ancho">
          <span>Dirección nueva${enIdioma}</span>
          <input class="${controls.campo}" type="text" data-slug-nuevo value="${texto(slug)}" maxlength="80" autocomplete="off" spellcheck="false" autocapitalize="none" />
        </label>
      </div>
      <div class="acciones">
        <button type="button" class="${controls.base} ${controls.boton} ${controls.secundario}" data-cambiar-direccion>Ver el impacto${enIdioma}</button>
      </div>
      <div data-cambio-direccion></div>
    </section>`
}

const tipoDe = (formulario: HTMLFormElement): Tipo | null => {
  const tipo = formulario.dataset.editor
  return tipo === 'negocio' || tipo === 'plaza' || tipo === 'categoria' ? tipo : null
}

/** La sección de un control: todo lo que se busca, se busca aquí y no en el formulario entero. */
const seccionDe = (control: Element): HTMLElement | null =>
  control.closest<HTMLElement>('[data-direccion]')

const idiomaDe = (seccion: HTMLElement): Idioma | undefined => {
  const lang = seccion.dataset.lang
  return lang === 'es' || lang === 'en' ? lang : undefined
}

/** Habla con el Worker. Los errores salen en el formulario y devuelven `null`. */
async function llamar(
  formulario: HTMLFormElement,
  tipo: Tipo,
  cuerpo: { id: string; slug: string; lang?: Idioma; confirmar?: boolean },
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

/**
 * Si el formulario tiene algo escrito sin guardar. Negocios y plazas lo llevan en `vista`; el de una
 * categoría no tiene ese seguimiento, así que se mira el propio formulario: un control cuyo valor ya no es
 * el que traía. Los campos de dirección no cuentan (son este mismo paso).
 */
function hayCambiosSinGuardar(formulario: HTMLFormElement): boolean {
  if (vista.formularioActual?.sucio) return true
  if (formulario.dataset.editor !== 'categoria') return false
  for (const control of formulario.elements) {
    if (control.matches('[data-slug-nuevo]')) continue
    if (control instanceof HTMLInputElement) {
      if (control.type === 'checkbox' || control.type === 'radio') {
        if (control.checked !== control.defaultChecked) return true
      } else if (control.value !== control.defaultValue) return true
    } else if (control instanceof HTMLTextAreaElement) {
      if (control.value !== control.defaultValue) return true
    } else if (control instanceof HTMLSelectElement) {
      // Sin ninguna opción marcada de origen, el navegador elige la primera: ese es el valor inicial.
      const marcada = [...control.options].findIndex((opcion) => opcion.defaultSelected)
      if (control.selectedIndex !== Math.max(marcada, 0)) return true
    }
  }
  return false
}

/** Primer paso: enseña qué cambiaría, sin guardar nada. */
async function pedirImpacto(
  formulario: HTMLFormElement,
  tipo: Tipo,
  seccion: HTMLElement,
): Promise<void> {
  const id = formulario.dataset.id
  const entrada = seccion.querySelector<HTMLInputElement>('[data-slug-nuevo]')
  const zona = seccion.querySelector<HTMLElement>('[data-cambio-direccion]')
  if (!id || !entrada || !zona || vista.guardando) return
  mostrarProblemas(formulario, [])
  // El cambio guarda solo la dirección: lo demás que se haya escrito se perdería al cerrar el diálogo.
  if (hayCambiosSinGuardar(formulario)) {
    mostrarProblemas(formulario, [
      'Hay cambios sin guardar. Guárdalos (o ciérralos) antes de cambiar la dirección: este cambio solo guarda la dirección.',
    ])
    return
  }
  const lang = idiomaDe(seccion)
  const resultado = await llamar(formulario, tipo, {
    id,
    slug: entrada.value,
    ...(lang ? { lang } : {}),
  })
  if (!resultado?.impacto) return
  const { impacto } = resultado

  const direcciones = impacto.redirecciones
    .map(
      (fila) =>
        `<li><code>${texto(fila.desde)}</code> pasa a <code>${texto(fila.hacia)}</code> (redirección permanente)</li>`,
    )
    .join('')
  const idTitulo = `titulo-direccion-${lang ?? 'unico'}`
  zona.innerHTML = `<section class="editor-seccion impacto-borrado" aria-labelledby="${idTitulo}" tabindex="-1" data-slug="${texto(impacto.despues)}">
      <h3 id="${idTitulo}">Si cambias la dirección de ${texto(impacto.entidad.nombre)}${lang ? ` en ${IDIOMA_EN_TEXTO[lang]}` : ''}</h3>
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
  seccion: HTMLElement,
  recargar: () => Promise<void>,
): Promise<void> {
  const id = formulario.dataset.id
  // Lo que se confirma es lo que se vio: la dirección del paso de impacto, no lo que haya en el campo.
  const slug = seccion.querySelector<HTMLElement>('[data-cambio-direccion] [data-slug]')?.dataset
    .slug
  if (!id || !slug || vista.guardando) return
  mostrarProblemas(formulario, [])
  const botones = seccion.querySelectorAll<HTMLButtonElement>('[data-cambio-direccion] button')
  for (const boton of botones) boton.disabled = true
  vista.guardando = true
  try {
    const lang = idiomaDe(seccion)
    const resultado = await llamar(formulario, tipo, {
      id,
      slug,
      ...(lang ? { lang } : {}),
      confirmar: true,
    })
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
  const seccion = seccionDe(objetivo)
  if (!formulario || !tipo || !seccion) return false
  if (objetivo.closest('[data-cambiar-direccion]')) {
    void pedirImpacto(formulario, tipo, seccion)
    return true
  }
  if (objetivo.closest('[data-confirmar-direccion]')) {
    void confirmar(formulario, tipo, seccion, recargar)
    return true
  }
  if (objetivo.closest('[data-cancelar-direccion]')) {
    const zona = seccion.querySelector<HTMLElement>('[data-cambio-direccion]')
    if (zona) zona.innerHTML = ''
    seccion.querySelector<HTMLElement>('[data-slug-nuevo]')?.focus()
    return true
  }
  return false
}

/** Escribir en el campo descarta un impacto ya enseñado (describe otra dirección) y no ensucia el formulario. */
export function alEscribirDireccion(objetivo: HTMLElement): boolean {
  if (!objetivo.matches('[data-slug-nuevo]')) return false
  const zona = seccionDe(objetivo)?.querySelector<HTMLElement>('[data-cambio-direccion]')
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
  const seccion = seccionDe(objetivo)
  if (formulario && tipo && seccion) void pedirImpacto(formulario, tipo, seccion)
}
