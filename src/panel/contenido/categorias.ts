import { ICONOS } from '../../data/iconos.ts'
import controls from '../../styles/controls.module.css'
import { accionesDeGiro } from './borrar-giro.ts'
import { seccionDireccion } from './direccion.ts'
import { abrirEditor, cerrarEditor, mostrarProblemas } from './editor.ts'
import type { Categoria, Giro } from './tipos.ts'
import { normalizar, numero, plural, sinonimosDe, texto } from './tipos.ts'
import {
  iconosUsados,
  localesVisibles,
  opcionesDeCategorias,
  opcionesDeIconos,
  vista,
} from './vista.ts'
import { zonaDelicada } from './zona-delicada.ts'

export function pintarCategorias(): void {
  if (!vista.raiz || !vista.datos) return
  const giros = vista.datos.categories.reduce((suma, categoria) => suma + categoria.giros.length, 0)
  vista.raiz.innerHTML = `
    <div class="barra-contenido">
      <input class="${controls.campo} buscar" type="search" placeholder="Buscar categoría o giro" aria-label="Buscar categoría" value="${texto(vista.consulta)}" data-buscar />
      <button type="button" class="${controls.base} ${controls.boton} ${controls.principal}" data-nueva-categoria>Nueva categoría</button>
    </div>
    <p class="meta-contenido">${numero(vista.datos.categories.length)} categorías · ${numero(giros)} giros</p>
    ${vista.aviso ? `<p class="aviso-contenido" role="status">${texto(vista.aviso)}</p>` : ''}
    <div data-zona-tabla></div>
  `
  pintarZonaCategorias()
}

export function pintarZonaCategorias(): void {
  const zona = vista.raiz?.querySelector<HTMLElement>('[data-zona-tabla]')
  if (!zona || !vista.datos) return
  const buscado = normalizar(vista.consulta)
  const filas = vista.datos.categories
    .filter((categoria) => {
      if (!buscado) return true
      return normalizar(
        [
          categoria.label.es,
          categoria.label.en ?? '',
          ...categoria.synonyms,
          ...categoria.giros.flatMap((giro) => [giro.label.es, giro.label.en ?? '']),
        ].join(' '),
      ).includes(buscado)
    })
    .sort((a, b) => a.order - b.order || a.label.es.localeCompare(b.label.es, 'es'))

  if (filas.length === 0) {
    zona.innerHTML = `<div class="vacio"><p>Ninguna categoría coincide.</p>${
      buscado
        ? `<button type="button" class="${controls.base} ${controls.boton} ${controls.fantasma}" data-quitar-filtros>Quitar la búsqueda</button>`
        : ''
    }</div>`
    return
  }

  const cuerpo = filas
    .map((categoria) => {
      const locales = localesVisibles(categoria.giros.map((giro) => giro.id)).length
      return `<tr>
        <td><span class="tono" data-tono="${categoria.hue ?? ''}" aria-hidden="true"></span></td>
        <td>
          <span class="negocio-nombre">${texto(categoria.label.es)}</span>
          ${locales === 0 ? '<span class="nota-tabla">sin página</span>' : ''}
        </td>
        <td class="cifra col-giros">${numero(categoria.giros.length)}</td>
        <td class="cifra">${numero(locales)}</td>
        <td class="cifra col-orden">${numero(categoria.order)}</td>
        <td class="accion"><button type="button" class="${controls.base} ${controls.boton} ${controls.fantasma}" data-editar-categoria="${texto(categoria.id)}" aria-label="Editar ${texto(categoria.label.es)}">Editar</button></td>
      </tr>`
    })
    .join('')

  zona.innerHTML = `<div class="tabla"><table>
    <thead><tr>
      <th><span class="visualmente">Tono</span></th>
      <th>Categoría</th>
      <th class="cifra col-giros">Giros</th>
      <th class="cifra">Locales</th>
      <th class="cifra col-orden">Orden</th>
      <th class="accion"><span class="visualmente">Acciones</span></th>
    </tr></thead>
    <tbody>${cuerpo}</tbody>
  </table></div>
  <p class="meta-contenido">Los locales cuentan solo si están visibles y su plaza está activa. Una categoría sin locales no publica página.</p>`
  pintarTonos()
}

function pintarTonos(): void {
  for (const punto of vista.raiz?.querySelectorAll<HTMLElement>('[data-tono]') ?? []) {
    const hue = punto.dataset.tono
    punto.style.background = hue ? `hsl(${hue} 34% 92%)` : 'var(--color-border)'
    punto.style.boxShadow = hue ? `inset 0 0 0 1px hsl(${hue} 38% 33% / 0.35)` : 'none'
  }
}

export function pintarCategoria(categoria: Categoria | null): void {
  if (!vista.datos) return
  vista.formularioActual = null
  vista.modo = 'categorias'
  const siguienteOrden = Math.max(0, ...vista.datos.categories.map((fila) => fila.order)) + 10
  const base: Categoria = categoria ?? {
    id: '',
    slug: { es: '', en: '' },
    label: { es: '', en: '' },
    icon: ICONOS[0],
    order: siguienteOrden,
    synonyms: [],
    giros: [],
  }
  const esNueva = !categoria
  const giros = categoria?.giros ?? [
    {
      id: '',
      label: { es: '', en: '' },
      icon: base.icon,
      synonyms: [],
      general: true,
    },
  ]
  const locales = localesVisibles(giros.map((giro) => giro.id))
  const plazas = new Set(locales.map((negocio) => negocio.plazaId))
  // Borrar exige cero locales de cualquier estado, no solo visibles; `otros` no se borra nunca.
  const girosDeLaCategoria = new Set(giros.map((giro) => giro.id))
  const usada = categoria
    ? vista.datos.places.filter((negocio) =>
        negocio.giros.some((giro) => girosDeLaCategoria.has(giro)),
      )
    : []
  const sePuedeBorrar = Boolean(categoria) && categoria?.id !== CATEGORIA_FIJA && usada.length === 0
  const notaBorrar = !categoria
    ? ''
    : categoria.id === CATEGORIA_FIJA
      ? 'Esta categoría no se borra: es a donde va todo local que se importa sin giro.'
      : usada.length > 0
        ? `Para borrarla, primero cambia el giro de sus ${plural(usada.length, 'local', 'locales')}.`
        : ''
  const impacto =
    locales.length === 0
      ? 'Esta categoría no tiene locales; su página no se publica hasta que tenga alguno.'
      : `${plural(locales.length, 'local', 'locales')} en ${plural(plazas.size, 'plaza', 'plazas')} ${locales.length === 1 ? 'está' : 'están'} en esta categoría. Al guardar se actualizan los filtros, el buscador y las páginas; si mueves un giro, cambian solo los locales de ese giro.`

  abrirEditor(
    'Taxonomía',
    esNueva ? 'Nueva categoría' : `Editar ${base.label.es}`,
    `<form data-editor="categoria" data-id="${texto(categoria?.id ?? '')}" novalidate>
      <section class="editor-seccion">
        <h3>Identidad</h3>
        <div class="editor-rejilla">
          <label class="campo-form">
            <span>Nombre en español</span>
            <input class="${controls.campo}" type="text" data-campo="labelEs" value="${texto(base.label.es)}" maxlength="80" required />
          </label>
          <label class="campo-form">
            <span>Nombre en inglés</span>
            <input class="${controls.campo}" type="text" data-campo="labelEn" value="${texto(base.label.en ?? '')}" maxlength="80" required />
          </label>
          <label class="campo-form">
            <span>Icono</span>
            <select class="${controls.campo}" data-campo="icon">${opcionesDeIconos(base.icon, new Set())}</select>
          </label>
          <label class="campo-form">
            <span>Tono <span class="ayuda">0 a 359; vacío solo para Otros</span></span>
            <span class="campo-tono">
              <input class="${controls.campo}" type="number" data-campo="hue" min="0" max="359" value="${base.hue ?? ''}" placeholder="200" />
              <span class="tono-preview" data-tono-preview aria-hidden="true"></span>
            </span>
          </label>
          <label class="campo-form">
            <span>Orden</span>
            <input class="${controls.campo}" type="number" data-campo="order" min="0" max="999" value="${base.order}" required />
          </label>
          <label class="campo-form">
            <span>Sinónimos <span class="ayuda">separados por comas</span></span>
            <input class="${controls.campo}" type="text" data-campo="synonyms" value="${texto(base.synonyms.join(', '))}" />
          </label>
        </div>
      </section>

      <section class="editor-seccion">
        <h3>Giros <span class="nota">la categoría de un local sale de aquí</span></h3>
        <div class="giros-categoria" data-giros>
          ${giros.map((giro, indice) => filaDeGiroFormulario(giro, base, indice, esNueva)).join('')}
        </div>
        <button type="button" class="${controls.base} ${controls.boton} ${controls.secundario}" data-anadir-giro>Añadir giro</button>
      </section>

      <p class="impacto-contenido" data-impacto>${texto(impacto)}${notaBorrar ? ` ${texto(notaBorrar)}` : ''}</p>
      ${categoria ? zonaDelicada({ direcciones: seccionDireccion('categoria', categoria.slug), borrado: sePuedeBorrar ? { atributo: 'data-borrar-categoria', rotulo: 'Borrar categoría', zona: '<div data-borrado-categoria></div>' } : undefined }) : ''}

      <footer class="editor-pie">
        <div class="problemas" data-problemas role="alert"></div>
        <div class="acciones">
          <button type="submit" class="${controls.base} ${controls.boton} ${controls.principal}">${esNueva ? 'Crear categoría' : 'Guardar cambios'}</button>
          <button type="button" class="${controls.base} ${controls.boton} ${controls.secundario}" data-cancelar>Cancelar</button>
        </div>
      </footer>
    </form>`,
  )
  pintarTonosEnDialogo()
  actualizarTonoPreview()
}

function filaDeGiroFormulario(
  giro: Giro,
  categoria: Categoria,
  indice: number,
  esNueva: boolean,
): string {
  const general = giro.general === true
  const usados = iconosUsados(giro.id)
  const locales = giro.id ? localesVisibles([giro.id]).length : 0
  const destino = esNueva ? '' : categoria.id
  return `<div class="giro-ficha" data-giro data-id="${texto(giro.id)}" data-general="${String(general)}">
    <div class="giro-cabecera">
      <h4>Giro ${indice + 1}</h4>
      ${general ? '<span class="marca-general">General</span>' : ''}
      <span class="meta">${plural(locales, 'local', 'locales')}</span>
    </div>
    <div class="giro-campos">
      <label class="campo-form"><span>Nombre en español</span><input class="${controls.campo}" type="text" data-campo="giroLabelEs" value="${texto(giro.label.es)}" maxlength="80" /></label>
      <label class="campo-form"><span>Nombre en inglés</span><input class="${controls.campo}" type="text" data-campo="giroLabelEn" value="${texto(giro.label.en ?? '')}" maxlength="80" /></label>
      <label class="campo-form"><span>Icono</span><select class="${controls.campo}" data-campo="giroIcon"${general ? ' disabled' : ''}>${opcionesDeIconos(giro.icon, usados)}</select></label>
      <label class="campo-form"><span>Sinónimos</span><input class="${controls.campo}" type="text" data-campo="giroSynonyms" value="${texto(giro.synonyms.join(', '))}" /></label>
      ${
        esNueva
          ? ''
          : `<label class="campo-form"><span>Categoría</span><select class="${controls.campo}" data-campo="destino"${general ? ' disabled' : ''}>${opcionesDeCategorias(destino)}</select></label>`
      }
    </div>
    ${esNueva ? '' : accionesDeGiro(giro)}
  </div>`
}

function pintarTonosEnDialogo(): void {
  for (const punto of vista.dialogo?.querySelectorAll<HTMLElement>('[data-tono]') ?? []) {
    const hue = punto.dataset.tono
    punto.style.background = hue ? `hsl(${hue} 34% 92%)` : 'var(--color-border)'
    punto.style.boxShadow = hue ? `inset 0 0 0 1px hsl(${hue} 38% 33% / 0.35)` : 'none'
  }
}

function actualizarTonoPreview(): void {
  const punto = vista.dialogo?.querySelector<HTMLElement>('[data-tono-preview]')
  if (!punto) return
  const hue = vista.dialogo?.querySelector<HTMLInputElement>('[data-campo="hue"]')?.value ?? ''
  punto.style.background = hue ? `hsl(${hue} 34% 92%)` : 'var(--color-border)'
  punto.style.boxShadow = hue ? `inset 0 0 0 1px hsl(${hue} 38% 33% / 0.35)` : 'none'
}

function anadirGiroDeCategoria(): void {
  const contenedor = vista.dialogo?.querySelector<HTMLElement>('[data-giros]')
  const formulario = vista.dialogo?.querySelector<HTMLFormElement>('form[data-editor="categoria"]')
  if (!contenedor || !formulario) return
  const usados = iconosUsados()
  const libre = ICONOS.find((icono) => !usados.has(icono)) ?? ICONOS[0]
  const categoria = {
    id: formulario.dataset.id ?? '',
    slug: { es: '', en: '' },
    label: { es: '', en: '' },
    icon: formulario.querySelector<HTMLSelectElement>('[data-campo="icon"]')?.value ?? libre,
    order: 0,
    synonyms: [],
    giros: [],
  } as Categoria
  const indice = contenedor.querySelectorAll('[data-giro]').length
  contenedor.insertAdjacentHTML(
    'beforeend',
    filaDeGiroFormulario(
      { id: '', label: { es: '', en: '' }, icon: libre, synonyms: [] },
      categoria,
      indice,
      !formulario.dataset.id,
    ),
  )
  contenedor.querySelector<HTMLElement>('[data-giro]:last-of-type input')?.focus()
}

function leerFormularioCategoria(formulario: HTMLFormElement): {
  cuerpo: { categories: unknown[] }
  problemas: string[]
} {
  const problemas: string[] = []
  const categoriaId = formulario.dataset.id ?? ''
  const esNueva = !categoriaId
  const campoDe = (nombre: string): string =>
    (
      formulario.querySelector<HTMLInputElement | HTMLSelectElement>(`[data-campo="${nombre}"]`)
        ?.value ?? ''
    ).trim()

  const labelEs = campoDe('labelEs')
  const labelEn = campoDe('labelEn')
  const icono = campoDe('icon')
  const hueTexto = campoDe('hue')
  const ordenTexto = campoDe('order')
  const sinonimos = sinonimosDe(campoDe('synonyms'))

  if (!labelEs) problemas.push('El nombre en español es obligatorio.')
  if (!labelEn) problemas.push('El nombre en inglés es obligatorio.')
  if (categoriaId !== 'otros' && !hueTexto) {
    problemas.push('Esta categoría necesita un tono entre 0 y 359.')
  }
  if (
    hueTexto &&
    (!Number.isInteger(Number(hueTexto)) || Number(hueTexto) < 0 || Number(hueTexto) > 359)
  ) {
    problemas.push('El tono debe ser un entero entre 0 y 359.')
  }
  if (!Number.isInteger(Number(ordenTexto)) || Number(ordenTexto) < 0) {
    problemas.push('El orden debe ser un entero positivo.')
  }

  const filas = [...formulario.querySelectorAll<HTMLElement>('[data-giro]')]
  if (filas.length === 0) problemas.push('Una categoría necesita al menos un giro.')

  const leidas = filas.map((fila) => {
    const general = fila.dataset.general === 'true'
    const giroLabelEs =
      fila.querySelector<HTMLInputElement>('[data-campo="giroLabelEs"]')?.value.trim() ?? ''
    const giroLabelEn =
      fila.querySelector<HTMLInputElement>('[data-campo="giroLabelEn"]')?.value.trim() ?? ''
    const giroIcono =
      fila.querySelector<HTMLSelectElement>('[data-campo="giroIcon"]')?.value ?? icono
    const giroSinonimos = sinonimosDe(
      fila.querySelector<HTMLInputElement>('[data-campo="giroSynonyms"]')?.value ?? '',
    )
    const destino = esNueva
      ? ''
      : (fila.querySelector<HTMLSelectElement>('[data-campo="destino"]')?.value ?? categoriaId)
    if (!giroLabelEs) problemas.push('Cada giro necesita nombre en español.')
    if (!giroLabelEn) problemas.push('Cada giro necesita nombre en inglés.')
    return {
      id: fila.dataset.id || undefined,
      general,
      labelEs: giroLabelEs,
      labelEn: giroLabelEn,
      icon: general ? icono : giroIcono,
      synonyms: giroSinonimos,
      destino: destino || (esNueva ? '' : categoriaId),
    }
  })
  if (leidas.filter((fila) => fila.general).length > 1) {
    problemas.push('Solo puede haber un giro general por categoría.')
  }

  if (problemas.length > 0) {
    return { cuerpo: { categories: [] }, problemas }
  }

  const categorias = structuredClone(vista.datos?.categories ?? []) as Categoria[]
  let actual = categoriaId
    ? categorias.find((categoria) => categoria.id === categoriaId)
    : undefined
  if (!actual) {
    actual = {
      id: '__nueva-categoria__',
      slug: { es: '', en: '' },
      label: { es: '', en: '' },
      icon: '',
      order: 0,
      synonyms: [],
      giros: [],
    }
    categorias.push(actual)
  }

  actual.label = { es: labelEs, en: labelEn }
  actual.icon = icono
  actual.hue = hueTexto ? Number(hueTexto) : undefined
  actual.order = Number(ordenTexto)
  actual.synonyms = sinonimos

  const propios: Giro[] = []
  for (const fila of leidas) {
    const giro: Giro = {
      id: fila.id ?? '',
      label: { es: fila.labelEs, en: fila.labelEn },
      icon: fila.general ? icono : fila.icon,
      synonyms: fila.synonyms,
      ...(fila.general ? { general: true } : {}),
    }
    if (!fila.id) delete (giro as Partial<Giro>).id
    const destino = fila.destino || actual.id
    if (destino === actual.id) {
      propios.push(giro)
      continue
    }
    const llegada = categorias.find((categoria) => categoria.id === destino)
    if (!llegada) {
      problemas.push(`La categoría de destino "${destino}" no existe.`)
      continue
    }
    llegada.giros.push(giro)
  }
  actual.giros = propios

  if (problemas.length > 0) return { cuerpo: { categories: [] }, problemas }
  const categories = categorias.map((categoria) => {
    if (categoria.id !== '__nueva-categoria__') return categoria
    const { id: _id, ...resto } = categoria
    return resto
  })
  return { cuerpo: { categories }, problemas }
}

export async function enviarCategoria(
  formulario: HTMLFormElement,
  recargar: () => Promise<void>,
): Promise<void> {
  mostrarProblemas(formulario, [])
  const { cuerpo, problemas } = leerFormularioCategoria(formulario)
  if (problemas.length > 0) {
    mostrarProblemas(formulario, problemas)
    return
  }

  const boton = formulario.querySelector<HTMLButtonElement>('button[type="submit"]')
  if (boton) boton.disabled = true
  try {
    const respuesta = await fetch('/api/panel/contenido/categorias', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(cuerpo),
    })
    const resultado = (await respuesta.json().catch(() => null)) as {
      ok?: boolean
      seco?: boolean
      pr?: { url: string; numero: number; creada: boolean } | null
      mensaje?: string
      problemas?: string[]
      afectados?: { locales: number; plazas: number }
    } | null

    if (respuesta.status === 403) {
      mostrarProblemas(formulario, ['Sin permiso. Revisa la regla de Access.'])
      return
    }
    if (respuesta.status === 503) {
      mostrarProblemas(formulario, ['Falta GITHUB_TOKEN en el Worker.'])
      return
    }
    if (!respuesta.ok || !resultado?.ok) {
      mostrarProblemas(
        formulario,
        resultado?.problemas?.length ? resultado.problemas : ['No se pudo guardar.'],
      )
      return
    }

    const alcance = resultado.afectados
      ? ` Afecta a ${plural(resultado.afectados.locales, 'local', 'locales')} en ${plural(resultado.afectados.plazas, 'plaza', 'plazas')}.`
      : ''
    vista.aviso = resultado.pr
      ? `${resultado.mensaje ?? 'Guardado.'} ${resultado.pr.creada ? 'PR abierta' : 'Añadido a la PR'} #${resultado.pr.numero}.${alcance}`
      : `${resultado.mensaje ?? 'Validado en desarrollo. No se commitea.'}${alcance}`
    vista.modo = 'categorias'
    vista.dialogo?.close()
    await recargar()
  } catch {
    mostrarProblemas(formulario, ['No se pudo hablar con el servidor.'])
  } finally {
    if (boton) boton.disabled = false
  }
}

/** Los botones de añadir giro y de borrar una categoría. Devuelve si lo atendió. */
export function alPulsarCategoria(objetivo: HTMLElement, recargar: () => Promise<void>): boolean {
  if (objetivo.closest('[data-anadir-giro]')) {
    anadirGiroDeCategoria()
    return true
  }
  const formulario = objetivo.closest<HTMLFormElement>('form[data-editor="categoria"]')
  if (!formulario) return false
  if (objetivo.closest('[data-borrar-categoria]')) {
    void pedirImpactoBorrado(formulario)
    return true
  }
  if (objetivo.closest('[data-confirmar-borrado-categoria]')) {
    void confirmarBorrado(formulario, recargar)
    return true
  }
  if (objetivo.closest('[data-cancelar-borrado-categoria]')) {
    const zona = formulario.querySelector<HTMLElement>('[data-borrado-categoria]')
    if (zona) zona.innerHTML = ''
    formulario.querySelector<HTMLElement>('[data-borrar-categoria]')?.focus()
    return true
  }
  return false
}

/** El tono se previsualiza al escribirlo. Devuelve si lo atendió. */
export function alEscribirCategoria(objetivo: HTMLElement): boolean {
  if (!objetivo.matches('[data-campo="hue"]')) return false
  actualizarTonoPreview()
  return true
}

/** El giro general comparte el icono con su categoría; al cambiarlo, la fila lo sigue. */
export function alCambiarCategoria(objetivo: HTMLElement): boolean {
  const icono = objetivo.closest<HTMLSelectElement>('[data-campo="icon"]')
  if (!icono) return false
  const formulario = icono.closest<HTMLFormElement>('form[data-editor="categoria"]')
  const general = formulario?.querySelector<HTMLSelectElement>(
    '[data-giro][data-general="true"] [data-campo="giroIcon"]',
  )
  if (general) general.value = icono.value
  return true
}

/* ------------------------------------------------------------------ borrar */

/** Debe coincidir con `CATEGORIA_FIJA` de `worker/borrado-categoria.ts`: el Worker es quien manda. */
const CATEGORIA_FIJA = 'otros'

interface ImpactoBorradoCategoria {
  categoria: { id: string; nombre: string }
  giros: string[]
  gustosDeLocalesBorrados: number
  avisos: string[]
}

interface RespuestaBorradoCategoria {
  ok?: boolean
  pr?: { url: string; numero: number; creada: boolean } | null
  mensaje?: string
  problemas?: string[]
  impacto?: ImpactoBorradoCategoria
}

/** Habla con el Worker. Los errores salen en el formulario y devuelven `null`. */
async function llamarBorrado(
  formulario: HTMLFormElement,
  cuerpo: { id: string; confirmar?: boolean },
): Promise<RespuestaBorradoCategoria | null> {
  try {
    const respuesta = await fetch('/api/panel/contenido/categoria/borrar', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(cuerpo),
    })
    const resultado = (await respuesta.json().catch(() => null)) as RespuestaBorradoCategoria | null
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
async function pedirImpactoBorrado(formulario: HTMLFormElement): Promise<void> {
  const id = formulario.dataset.id
  const zona = formulario.querySelector<HTMLElement>('[data-borrado-categoria]')
  if (!id || !zona || vista.guardando) return
  mostrarProblemas(formulario, [])
  const resultado = await llamarBorrado(formulario, { id })
  if (!resultado?.impacto) return
  const { impacto } = resultado

  zona.innerHTML = `<section class="editor-seccion impacto-borrado" aria-labelledby="titulo-borrado-categoria" tabindex="-1">
      <h3 id="titulo-borrado-categoria">Si borras ${texto(impacto.categoria.nombre)}</h3>
      <p class="impacto-contenido">Se van también sus ${numero(impacto.giros.length)} ${impacto.giros.length === 1 ? 'giro' : 'giros'}: ${impacto.giros.map(texto).join(', ')}.</p>
      <ul class="impacto-lista">${impacto.avisos.map((aviso) => `<li>${texto(aviso)}</li>`).join('')}</ul>
      <div class="acciones">
        <button type="button" class="${controls.base} ${controls.boton} ${controls.principal}" data-confirmar-borrado-categoria>Borrar esta categoría</button>
        <button type="button" class="${controls.base} ${controls.boton} ${controls.secundario}" data-cancelar-borrado-categoria>Mejor no</button>
      </div>
    </section>`
  zona.querySelector<HTMLElement>('section')?.focus()
}

/** Segundo paso: el borrado va a la PR del panel. */
async function confirmarBorrado(
  formulario: HTMLFormElement,
  recargar: () => Promise<void>,
): Promise<void> {
  const id = formulario.dataset.id
  if (!id || vista.guardando) return
  mostrarProblemas(formulario, [])
  const botones = formulario.querySelectorAll<HTMLButtonElement>('[data-borrado-categoria] button')
  for (const boton of botones) boton.disabled = true
  vista.guardando = true
  try {
    const resultado = await llamarBorrado(formulario, { id, confirmar: true })
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
