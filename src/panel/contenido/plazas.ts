import controls from '../../styles/controls.module.css'
import { contornoListo, seccionContorno } from './contorno.ts'
import { seccionDireccion } from './direccion.ts'
import { abrirEditor, cerrarEditor, mostrarProblemas } from './editor.ts'
import type { PlazaResumen } from './tipos.ts'
import { numero, plural, texto } from './tipos.ts'
import { vista } from './vista.ts'
import { zonaDelicada } from './zona-delicada.ts'

/* ------------------------------------------------------------------ la lista */

function estadoDeLaPlaza(plaza: PlazaResumen): { rotulo: string; marca: string; nota: string } {
  if (plaza.comingSoon) {
    return { rotulo: 'Próximamente', marca: 'cierre', nota: 'Sale en el mapa, sin locales' }
  }
  if (!plaza.active) return { rotulo: 'Inactiva', marca: 'no', nota: 'No se publica' }
  return { rotulo: 'Activa', marca: 'si', nota: '' }
}

/** Los locales que de verdad se ven por estar en esta plaza: activos y con la plaza activa. */
const localesVisiblesDe = (plaza: PlazaResumen): number =>
  plaza.active
    ? (vista.datos?.places ?? []).filter(
        (negocio) => negocio.plazaId === plaza.id && negocio.active,
      ).length
    : 0

export function pintarPlazas(): void {
  if (!vista.raiz || !vista.datos) return
  const plazas = [...vista.datos.plazas].sort((a, b) => a.name.localeCompare(b.name, 'es'))
  const cuerpo = plazas
    .map((plaza) => {
      const estado = estadoDeLaPlaza(plaza)
      const total = (vista.datos?.places ?? []).filter((n) => n.plazaId === plaza.id).length
      return `<tr>
        <td class="celda-nombre"><span class="negocio-nombre">${texto(plaza.name)}</span></td>
        <td class="cifra col-giros">${numero(localesVisiblesDe(plaza))}</td>
        <td class="cifra col-orden">${numero(total)}</td>
        <td class="celda-estado"><span class="marca-estado" data-activo="${estado.marca}" title="${texto(estado.nota)}">${texto(estado.rotulo)}</span></td>
        <td class="accion"><button type="button" class="${controls.base} ${controls.boton} ${controls.fantasma}" data-editar-plaza="${texto(plaza.id)}" aria-label="Editar ${texto(plaza.name)}">Editar</button></td>
      </tr>`
    })
    .join('')
  vista.raiz.innerHTML = `
    <div class="barra-contenido">
      <p class="meta-contenido">${numero(plazas.length)} plazas · ${numero(plazas.filter((p) => p.active).length)} activas</p>
      <button type="button" class="${controls.base} ${controls.boton} ${controls.principal}" data-nueva-plaza>Nueva plaza</button>
    </div>
    ${vista.aviso ? `<p class="aviso-contenido" role="status">${texto(vista.aviso)}</p>` : ''}
    <div class="tabla"><table>
      <thead><tr>
        <th>Plaza</th>
        <th class="cifra col-giros">Locales visibles</th>
        <th class="cifra col-orden">Locales</th>
        <th>Estado</th>
        <th class="accion"><span class="visualmente">Acciones</span></th>
      </tr></thead>
      <tbody>${cuerpo}</tbody>
    </table></div>
    <p class="meta-contenido">Una plaza nueva nace inactiva y con un contorno provisional: se ajusta en su formulario, en la sección Contorno.</p>`
}

/* ------------------------------------------------------------------ el formulario */

export function pintarPlaza(plaza: PlazaResumen): void {
  vista.modo = 'plazas'
  vista.formularioActual = {
    id: plaza.id,
    nombre: plaza.name,
    seleccion: [],
    fotos: [],
    sucio: false,
    consultaGiro: '',
  }
  const locales = (vista.datos?.places ?? []).filter((negocio) => negocio.plazaId === plaza.id)

  abrirEditor(
    'Plazas',
    plaza.name,
    `<form data-editor="plaza" data-id="${texto(plaza.id)}" novalidate>
      <section class="editor-seccion">
        <h3>Identidad</h3>
        <div class="editor-rejilla">
          <label class="campo-form campo-ancho">
            <span>Nombre</span>
            <input class="${controls.campo}" type="text" name="nombre" value="${texto(plaza.name)}" maxlength="120" required />
            <span class="ayuda">Es el título de la página de la zona. Se le añade " · Visit Zibatá" y el tope son 60 caracteres en total.</span>
          </label>
          <label class="campo-form campo-ancho">
            <span>Dirección</span>
            <input class="${controls.campo}" type="text" name="direccion" value="${texto(plaza.address ?? '')}" maxlength="200" />
          </label>
          <label class="campo-form campo-ancho">
            <span>Enlace de Google Maps <span class="ayuda">con él, Cómo llegar abre este sitio exacto</span></span>
            <input class="${controls.campo}" type="url" name="googleMapsUri" value="${texto(plaza.googleMapsUri ?? '')}" placeholder="https://maps.app.goo.gl/…" />
          </label>
        </div>
        <p class="ayuda">El contorno del mapa tiene su propia sección, más abajo. Lo mismo la dirección web de la zona.</p>
      </section>

      <section class="editor-seccion">
        <h3>Descripción</h3>
        <p class="ayuda">Salen en la página de la zona y en los buscadores. En español y en inglés, o ninguna.</p>
        <div class="editor-rejilla">
          <label class="campo-form campo-ancho">
            <span>Español</span>
            <textarea class="${controls.campo} ${controls.areaTexto}" name="descripcionEs" rows="3" maxlength="600">${texto(plaza.description?.es ?? '')}</textarea>
          </label>
          <label class="campo-form campo-ancho">
            <span>Inglés</span>
            <textarea class="${controls.campo} ${controls.areaTexto}" name="descripcionEn" rows="3" maxlength="600">${texto(plaza.description?.en ?? '')}</textarea>
          </label>
        </div>
      </section>

      <section class="editor-seccion">
        <h3>Marcador</h3>
        <div class="editor-rejilla">
          <label class="campo-form"><span>Latitud</span><input class="${controls.campo}" type="number" name="lat" step="any" value="${texto(plaza.coordinates.lat)}" required /></label>
          <label class="campo-form"><span>Longitud</span><input class="${controls.campo}" type="number" name="lng" step="any" value="${texto(plaza.coordinates.lng)}" required /></label>
        </div>
        <p class="ayuda">Es el punto donde se dibuja el nombre de la plaza en el mapa.</p>
      </section>

      ${seccionContorno(plaza)}

      <section class="editor-seccion">
        <h3>Estado en la guía</h3>
        <div class="editor-rejilla">
          <div class="campo-form">
            <span>Visibilidad</span>
            <label class="casilla"><input type="checkbox" name="activa"${plaza.active ? ' checked' : ''} /><span>Activa en la guía</span></label>
            <span class="ayuda">${plural(locales.length, 'local', 'locales')} ${locales.length === 1 ? 'está' : 'están'} en esta plaza. Al desactivarla dejan de verse y su página da 404; te mostraré el efecto antes de guardar.${locales.length > 0 ? ' Para borrarla, primero hay que borrar sus locales.' : ''}</span>
          </div>
          <div class="campo-form">
            <span>Próximamente</span>
            <label class="casilla"><input type="checkbox" name="proximamente"${plaza.comingSoon ? ' checked' : ''} /><span>Plaza confirmada y en construcción</span></label>
            <span class="ayuda">Sale en el mapa y en la lista con la leyenda "Próximamente", sin locales. No puede estar activa.</span>
          </div>
        </div>
      </section>

      <div data-impacto-plaza></div>

      ${zonaDelicada({ direcciones: seccionDireccion('plaza', plaza.slug), borrado: locales.length === 0 ? { atributo: 'data-borrar-plaza', rotulo: 'Borrar plaza', zona: '<div data-borrado-plaza></div>' } : undefined })}

      <footer class="editor-pie">
        <div class="problemas" data-problemas role="alert"></div>
        <div class="acciones">
          <button type="submit" class="${controls.base} ${controls.boton} ${controls.principal}">Guardar cambios</button>
          <button type="button" class="${controls.base} ${controls.boton} ${controls.secundario}" data-cancelar>Cancelar</button>
        </div>
      </footer>
    </form>`,
  )
  contornoListo()
}

/* ------------------------------------------------------------------ leer y guardar */

interface ImpactoPlaza {
  plaza: { id: string; nombre: string }
  cambiaActiva: boolean
  activaAntes: boolean
  activaDespues: boolean
  localesAntes: number
  localesDespues: number
  categoriasSinPagina: string[]
  categoriasNuevas: string[]
  avisos: string[]
}

interface RespuestaPlaza {
  ok?: boolean
  confirmado?: boolean
  requiereConfirmacion?: boolean
  seco?: boolean
  pr?: { url: string; numero: number; creada: boolean } | null
  mensaje?: string
  problemas?: string[]
  impacto?: ImpactoPlaza
}

function valorDe(formulario: HTMLFormElement, nombre: string): string {
  const campo = formulario.elements.namedItem(nombre)
  if (
    campo instanceof HTMLInputElement ||
    campo instanceof HTMLTextAreaElement ||
    campo instanceof HTMLSelectElement
  ) {
    return campo.value.trim()
  }
  return ''
}

const marcada = (formulario: HTMLFormElement, nombre: string): boolean =>
  formulario.querySelector<HTMLInputElement>(`input[name="${nombre}"]`)?.checked ?? false

function validarPlaza(formulario: HTMLFormElement): string[] {
  const problemas: string[] = []
  if (!valorDe(formulario, 'nombre')) problemas.push('nombre: El nombre es obligatorio.')
  const lat = valorDe(formulario, 'lat')
  const lng = valorDe(formulario, 'lng')
  if (!lat || Number.isNaN(Number(lat))) problemas.push('lat: Indica la latitud.')
  if (!lng || Number.isNaN(Number(lng))) problemas.push('lng: Indica la longitud.')
  const es = valorDe(formulario, 'descripcionEs')
  const en = valorDe(formulario, 'descripcionEn')
  if (Boolean(es) !== Boolean(en)) {
    problemas.push(
      es
        ? 'descripcionEn: Falta la descripción en inglés.'
        : 'descripcionEs: Falta la descripción en español.',
    )
  }
  if (marcada(formulario, 'activa') && marcada(formulario, 'proximamente')) {
    problemas.push('proximamente: Una plaza "próximamente" no puede estar activa.')
  }
  return problemas
}

function leerPlaza(formulario: HTMLFormElement, confirmar: boolean): Record<string, unknown> {
  return {
    id: formulario.dataset.id,
    nombre: valorDe(formulario, 'nombre'),
    descripcionEs: valorDe(formulario, 'descripcionEs'),
    descripcionEn: valorDe(formulario, 'descripcionEn'),
    direccion: valorDe(formulario, 'direccion'),
    lat: Number(valorDe(formulario, 'lat')),
    lng: Number(valorDe(formulario, 'lng')),
    googleMapsUri: valorDe(formulario, 'googleMapsUri'),
    activa: marcada(formulario, 'activa'),
    proximamente: marcada(formulario, 'proximamente'),
    ...(confirmar ? { confirmar: true } : {}),
  }
}

/** Enseña lo que cambiaría y pide la confirmación. No se ha guardado nada. */
function pintarImpacto(formulario: HTMLFormElement, impacto: ImpactoPlaza): void {
  const zona = formulario.querySelector<HTMLElement>('[data-impacto-plaza]')
  if (!zona) return
  const antes = impacto.activaAntes ? 'activa' : 'inactiva'
  const despues = impacto.activaDespues ? 'activa' : 'inactiva'
  const categorias = (titulo: string, lista: string[]) =>
    lista.length ? `<li>${titulo}: ${lista.map(texto).join(', ')}.</li>` : ''
  zona.innerHTML = `<section class="editor-seccion impacto-borrado" aria-labelledby="titulo-impacto-plaza" tabindex="-1">
      <h3 id="titulo-impacto-plaza">${texto(impacto.plaza.nombre)} pasa de ${antes} a ${despues}</h3>
      <ul class="impacto-lista">
        <li>Locales que se ven por estar en esta plaza: ${numero(impacto.localesAntes)} ahora, ${numero(impacto.localesDespues)} después.</li>
        ${categorias('Se quedan sin página', impacto.categoriasSinPagina)}
        ${categorias('Ganan página', impacto.categoriasNuevas)}
        ${impacto.avisos.map((aviso) => `<li>${texto(aviso)}</li>`).join('')}
      </ul>
      <div class="acciones">
        <button type="button" class="${controls.base} ${controls.boton} ${controls.principal}" data-confirmar-plaza>Guardar este cambio</button>
        <button type="button" class="${controls.base} ${controls.boton} ${controls.secundario}" data-cancelar-plaza>Mejor no</button>
      </div>
    </section>`
  zona.querySelector<HTMLElement>('section')?.focus()
}

export async function enviarPlaza(
  formulario: HTMLFormElement,
  recargar: () => Promise<void>,
  confirmar = false,
): Promise<void> {
  if (vista.guardando) return
  mostrarProblemas(formulario, [])
  const problemas = validarPlaza(formulario)
  if (problemas.length > 0) {
    mostrarProblemas(formulario, problemas)
    return
  }

  const botones = formulario.querySelectorAll<HTMLButtonElement>(
    'button[type="submit"], [data-impacto-plaza] button',
  )
  for (const boton of botones) boton.disabled = true
  vista.guardando = true
  try {
    const respuesta = await fetch('/api/panel/contenido/plaza', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(leerPlaza(formulario, confirmar)),
    })
    const resultado = (await respuesta.json().catch(() => null)) as RespuestaPlaza | null
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
    if (resultado.requiereConfirmacion && !resultado.confirmado && resultado.impacto) {
      pintarImpacto(formulario, resultado.impacto)
      return
    }

    if (vista.formularioActual) vista.formularioActual.sucio = false
    vista.aviso = resultado.pr
      ? `${resultado.mensaje ?? 'Guardado.'} ${resultado.pr.creada ? 'PR abierta' : 'Añadido a la PR'} #${resultado.pr.numero}.`
      : (resultado.mensaje ?? 'Validado en desarrollo. No se commitea.')
    vista.modo = 'plazas'
    cerrarEditor(true)
    await recargar()
  } catch {
    mostrarProblemas(formulario, ['No se pudo hablar con el servidor.'])
  } finally {
    vista.guardando = false
    for (const boton of botones) boton.disabled = false
  }
}

/* ------------------------------------------------------------------ eventos */

/** Los botones del paso de impacto. Devuelve si lo atendió. */
export function alPulsarPlaza(objetivo: HTMLElement, recargar: () => Promise<void>): boolean {
  const formulario = objetivo.closest<HTMLFormElement>('form[data-editor="plaza"]')
  if (!formulario) return false
  if (objetivo.closest('[data-confirmar-plaza]')) {
    void enviarPlaza(formulario, recargar, true)
    return true
  }
  if (objetivo.closest('[data-cancelar-plaza]')) {
    const zona = formulario.querySelector<HTMLElement>('[data-impacto-plaza]')
    if (zona) zona.innerHTML = ''
    formulario.querySelector<HTMLElement>('button[type="submit"]')?.focus()
    return true
  }
  if (objetivo.closest('[data-borrar-plaza]')) {
    void pedirImpactoBorrado(formulario)
    return true
  }
  if (objetivo.closest('[data-confirmar-borrado-plaza]')) {
    void confirmarBorrado(formulario, recargar)
    return true
  }
  if (objetivo.closest('[data-cancelar-borrado-plaza]')) {
    const zona = formulario.querySelector<HTMLElement>('[data-borrado-plaza]')
    if (zona) zona.innerHTML = ''
    formulario.querySelector<HTMLElement>('[data-borrar-plaza]')?.focus()
    return true
  }
  return false
}

/** Cambiar una casilla ensucia el formulario; "próximamente" y "activa" no van juntas. */
export function alCambiarPlaza(objetivo: HTMLElement): boolean {
  const formulario = objetivo.closest<HTMLFormElement>('form[data-editor="plaza"]')
  if (!formulario || !vista.formularioActual) return false
  vista.formularioActual.sucio = true
  // Cualquier cambio de estado invalida un impacto que ya se había mostrado.
  const zona = formulario.querySelector<HTMLElement>('[data-impacto-plaza]')
  if (zona) zona.innerHTML = ''
  if (objetivo.matches('input[name="proximamente"]') && (objetivo as HTMLInputElement).checked) {
    const activa = formulario.querySelector<HTMLInputElement>('input[name="activa"]')
    if (activa) activa.checked = false
  }
  if (objetivo.matches('input[name="activa"]') && (objetivo as HTMLInputElement).checked) {
    const pronto = formulario.querySelector<HTMLInputElement>('input[name="proximamente"]')
    if (pronto) pronto.checked = false
  }
  return true
}

/* ------------------------------------------------------------------ borrar */

interface ImpactoBorradoPlaza {
  plaza: { id: string; nombre: string }
  redirecciones: { desde: string; hacia: string }[]
  teniaPagina: boolean
  redireccionesDeLocales: number
  avisos: string[]
}

interface RespuestaBorradoPlaza {
  ok?: boolean
  pr?: { url: string; numero: number; creada: boolean } | null
  mensaje?: string
  problemas?: string[]
  impacto?: ImpactoBorradoPlaza
}

/** Habla con el Worker. Los errores salen en el formulario y devuelven `null`. */
async function llamarBorrado(
  formulario: HTMLFormElement,
  cuerpo: { id: string; confirmar?: boolean },
): Promise<RespuestaBorradoPlaza | null> {
  try {
    const respuesta = await fetch('/api/panel/contenido/plaza/borrar', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(cuerpo),
    })
    const resultado = (await respuesta.json().catch(() => null)) as RespuestaBorradoPlaza | null
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
  const zona = formulario.querySelector<HTMLElement>('[data-borrado-plaza]')
  if (!id || !zona || vista.guardando) return
  mostrarProblemas(formulario, [])
  const resultado = await llamarBorrado(formulario, { id })
  if (!resultado?.impacto) return
  const { impacto } = resultado

  const direcciones = impacto.redirecciones
    .map(
      (fila) =>
        `<li><code>${texto(fila.desde)}</code> pasa a <code>${texto(fila.hacia)}</code> (redirección permanente)</li>`,
    )
    .join('')
  zona.innerHTML = `<section class="editor-seccion impacto-borrado" aria-labelledby="titulo-borrado-plaza" tabindex="-1">
      <h3 id="titulo-borrado-plaza">Si borras ${texto(impacto.plaza.nombre)}</h3>
      <ul class="impacto-lista">${direcciones}</ul>
      <ul class="impacto-lista">${impacto.avisos.map((aviso) => `<li>${texto(aviso)}</li>`).join('')}</ul>
      <div class="acciones">
        <button type="button" class="${controls.base} ${controls.boton} ${controls.principal}" data-confirmar-borrado-plaza>Borrar esta plaza</button>
        <button type="button" class="${controls.base} ${controls.boton} ${controls.secundario}" data-cancelar-borrado-plaza>Mejor no</button>
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
  const botones = formulario.querySelectorAll<HTMLButtonElement>('[data-borrado-plaza] button')
  for (const boton of botones) boton.disabled = true
  vista.guardando = true
  try {
    const resultado = await llamarBorrado(formulario, { id, confirmar: true })
    if (!resultado) return
    vista.aviso = resultado.pr
      ? `${resultado.mensaje ?? 'Borrado.'} ${resultado.pr.creada ? 'PR abierta' : 'Añadido a la PR'} #${resultado.pr.numero}.`
      : (resultado.mensaje ?? 'Validado en desarrollo. No se commitea.')
    if (vista.formularioActual) vista.formularioActual.sucio = false
    vista.modo = 'plazas'
    cerrarEditor(true)
    await recargar()
  } finally {
    vista.guardando = false
    for (const boton of botones) boton.disabled = false
  }
}
