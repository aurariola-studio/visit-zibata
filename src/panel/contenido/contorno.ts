import extent from '../../../data/geographic/extent.json'
import { areaM2, MAX_VERTICES, validarContornoDePlaza } from '../../data/geometria.ts'
import controls from '../../styles/controls.module.css'
import { cerrarEditor, mostrarProblemas } from './editor.ts'
import type { PlazaResumen } from './tipos.ts'
import { numero, plural, texto } from './tipos.ts'
import { vista } from './vista.ts'

/**
 * El contorno de una plaza, en la sección "Contorno" de su formulario. **Todavía no es un editor sobre el
 * mapa** (eso es la siguiente PR): es una lista de vértices con sus coordenadas, una vista previa y el
 * mismo paso a paso que un borrado. Sirve para ajustar un contorno que ya existe, y es además la
 * alternativa que hace falta cuando no se puede arrastrar (WCAG 2.5.7).
 *
 *  1. Los vértices se editan en campos de texto. Con cada cambio se avisa con las mismas reglas que aplica
 *     el servidor (`src/data/geometria.ts`); el aviso es orientativo, el servidor manda.
 *  2. "Ver el impacto" pide al Worker qué cambiaría, sin guardar nada.
 *  3. "Guardar contorno" lo manda a la PR del panel. **Confirma exactamente el contorno cuyo impacto se
 *     vio**: cualquier cambio posterior borra el impacto y el botón.
 *
 * Los campos no llevan `name`: "Guardar cambios" nunca manda el contorno. Sí marcan el formulario como
 * modificado, para que cerrar con vértices a medio escribir pregunte antes de descartarlos.
 */

const RUTA = '/api/panel/contenido/plaza/contorno'
const RUTA_EDIFICIOS = '/map/plaza-buildings.geojson'
/** Ancho del dibujo si aún no se puede medir el contenedor. */
const ANCHO_SVG = 600
/** Alto del lienzo, en píxeles. */
const ALTO_SVG = 300

interface Vertice {
  lng: string
  lat: string
}

interface Impacto {
  plaza: { id: string; nombre: string }
  vertices: { antes: number; despues: number }
  area: { antes: number; despues: number; cambio: number }
  locales: {
    quedanFuera: { id: string; nombre: string }[]
    vuelvenDentro: { id: string; nombre: string }[]
    siguenFuera: number
  }
  avisos: string[]
}

interface Respuesta {
  ok?: boolean
  pr?: { url: string; numero: number; creada: boolean } | null
  mensaje?: string
  problemas?: string[]
  impacto?: Impacto
}

interface Estado {
  plaza: PlazaResumen
  vertices: Vertice[]
  /** La firma del contorno cuyo impacto se está enseñando; `null` si no hay impacto a la vista. */
  firmaImpacto: string | null
  /** El último contorno que se pudo leer entero: lo que se dibuja mientras hay un campo a medio escribir. */
  ultimoValido: number[][] | null
  edificios: number[][][] | null
}

let estado: Estado | null = null
let edificiosEnMemoria: Promise<{ plazaId: string; anillo: number[][] }[]> | null = null

const anilloDe = (geometry: PlazaResumen['geometry']): number[][] | null => {
  const poligono = geometry?.type === 'Polygon' ? (geometry.coordinates as number[][][]) : undefined
  const anillo = poligono?.[0]
  return anillo && anillo.length >= 4 ? anillo : null
}

const aTexto = (n: number): string => n.toFixed(6)

/** Un número con punto o con coma decimal; todo lo demás es `null` (y se dice en el campo). */
export function leerCoordenada(valor: string): number | null {
  const limpio = valor.trim()
  if (!/^-?\d+([.,]\d+)?$/.test(limpio)) return null
  const n = Number(limpio.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/** Los vértices leídos, con el error de cada campo que no es un número. */
function leer(vertices: readonly Vertice[]): {
  anillo: number[][] | null
  errores: { i: number; campo: 'lng' | 'lat'; mensaje: string }[]
} {
  const errores: { i: number; campo: 'lng' | 'lat'; mensaje: string }[] = []
  const puntos: number[][] = []
  vertices.forEach((v, i) => {
    const lng = leerCoordenada(v.lng)
    const lat = leerCoordenada(v.lat)
    if (lng === null)
      errores.push({ i, campo: 'lng', mensaje: 'Escribe un número, por ejemplo -100.35.' })
    if (lat === null)
      errores.push({ i, campo: 'lat', mensaje: 'Escribe un número, por ejemplo 20.69.' })
    if (lng !== null && lat !== null) puntos.push([lng, lat])
  })
  if (errores.length > 0 || puntos.length < 3) return { anillo: null, errores }
  return { anillo: [...puntos, puntos[0] ?? []], errores }
}

const firmaDe = (anillo: number[][]): string => JSON.stringify(anillo)

/* ------------------------------------------------------------------------------------------ marcado */

function fila(v: Vertice, i: number, total: number): string {
  const n = i + 1
  return `<li class="contorno-fila" data-vertice="${i}">
    <span class="contorno-numero" aria-hidden="true">${n}</span>
    <label class="campo-form contorno-campo">
      <span class="visualmente">Longitud del vértice ${n}</span>
      <input class="${controls.campo}" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" data-contorno-campo="lng" value="${texto(v.lng)}" aria-describedby="contorno-error-${i}-lng" />
    </label>
    <label class="campo-form contorno-campo">
      <span class="visualmente">Latitud del vértice ${n}</span>
      <input class="${controls.campo}" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" data-contorno-campo="lat" value="${texto(v.lat)}" aria-describedby="contorno-error-${i}-lat" />
    </label>
    <span class="contorno-acciones">
      <button type="button" class="${controls.base} ${controls.boton} ${controls.fantasma}" data-contorno-anadir="${i}" aria-label="Añadir un vértice después del ${n}"${total >= MAX_VERTICES ? ' disabled' : ''}>Añadir</button>
      <button type="button" class="${controls.base} ${controls.boton} ${controls.fantasma}" data-contorno-quitar="${i}" aria-label="Quitar el vértice ${n}"${total <= 3 ? ' disabled' : ''}>Quitar</button>
    </span>
    <span class="campo-error" id="contorno-error-${i}-lng" data-contorno-error="${i}-lng"></span>
    <span class="campo-error" id="contorno-error-${i}-lat" data-contorno-error="${i}-lat"></span>
  </li>`
}

/**
 * La sección del formulario de una plaza, o nada si no hay un contorno que editar (el panel simulado de las
 * pruebas no lo trae) o si es de varias partes, que no se edita aquí.
 */
export function seccionContorno(plaza: PlazaResumen): string {
  // Lo de la plaza anterior no puede quedarse si esta no tiene sección.
  estado = null
  const anillo = anilloDe(plaza.geometry)
  if (!plaza.geometry) return ''
  if (!anillo) {
    return `<section class="editor-seccion" data-contorno-seccion>
      <h3>Contorno</h3>
      <p class="ayuda">Esta plaza tiene un contorno de varias partes y no se edita desde el panel.</p>
    </section>`
  }
  const vertices = anillo
    .slice(0, -1)
    .map(([lng = 0, lat = 0]) => ({ lng: aTexto(lng), lat: aTexto(lat) }))
  estado = { plaza, vertices, firmaImpacto: null, ultimoValido: anillo, edificios: null }
  return `<section class="editor-seccion contorno" data-contorno-seccion>
    <h3>Contorno</h3>
    <p class="ayuda">Los vértices del polígono que se dibuja en el mapa, en orden. Sirve para ajustar un contorno que ya existe: dibujarlo sobre el mapa llega en la siguiente entrega. Coordenadas en grados, con punto decimal.</p>
    <div class="contorno-vista" data-contorno-vista></div>
    <p class="contorno-resumen" role="status" data-contorno-resumen></p>
    <ol class="contorno-lista" data-contorno-lista aria-label="Vértices del contorno">${vertices.map((v, i) => fila(v, i, vertices.length)).join('')}</ol>
    <div class="problemas contorno-avisos" data-contorno-avisos></div>
    <div class="acciones">
      <button type="button" class="${controls.base} ${controls.boton} ${controls.secundario}" data-contorno-ver aria-label="Ver el impacto del contorno">Ver el impacto</button>
    </div>
    <div data-contorno-impacto></div>
  </section>`
}

/* ------------------------------------------------------------------------------------- vista previa */

interface Caja {
  minLng: number
  maxLng: number
  minLat: number
  maxLat: number
}

const cajaDe = (puntos: number[][]): Caja => ({
  minLng: Math.min(...puntos.map((p) => p[0] ?? 0)),
  maxLng: Math.max(...puntos.map((p) => p[0] ?? 0)),
  minLat: Math.min(...puntos.map((p) => p[1] ?? 0)),
  maxLat: Math.max(...puntos.map((p) => p[1] ?? 0)),
})

const seCortan = (a: Caja, b: Caja): boolean =>
  a.minLng <= b.maxLng && a.maxLng >= b.minLng && a.minLat <= b.maxLat && a.maxLat >= b.minLat

/** El dibujo de lo que se va a guardar: no se puede pulsar, sirve para ver que el contorno es el que se quiere. */
function dibujo(anillo: number[][], conError: boolean, anchoSvg: number): string {
  if (!estado) return ''
  const caja = cajaDe(anillo)
  const ancho = caja.maxLng - caja.minLng
  const alto = caja.maxLat - caja.minLat
  const margen = Math.max(ancho, alto) * 0.4
  const vista = {
    minLng: caja.minLng - margen,
    maxLng: caja.maxLng + margen,
    minLat: caja.minLat - margen,
    maxLat: caja.maxLat + margen,
  }
  const lat0 = (vista.minLat + vista.maxLat) / 2
  const k = Math.cos((lat0 * Math.PI) / 180)
  const anchoGrados = (vista.maxLng - vista.minLng) * k
  const altoGrados = vista.maxLat - vista.minLat
  // Un lienzo de tamaño fijo en píxeles, con el contorno centrado y a la mayor escala que cabe: si el
  // dibujo fuera más alto que el lienzo, el navegador lo encogería y el texto saldría diminuto.
  const escala = Math.min(
    anchoSvg / Math.max(anchoGrados, 1e-9),
    ALTO_SVG / Math.max(altoGrados, 1e-9),
  )
  const alto2 = ALTO_SVG
  const sobraX = (anchoSvg - anchoGrados * escala) / 2
  const sobraY = (ALTO_SVG - altoGrados * escala) / 2
  const punto = (p: readonly number[]) =>
    `${(sobraX + ((p[0] ?? 0) - vista.minLng) * k * escala).toFixed(1)},${(sobraY + (vista.maxLat - (p[1] ?? 0)) * escala).toFixed(1)}`
  const trazo = (puntos: readonly (readonly number[])[]) => puntos.map(punto).join(' ')

  const vecinas = (vistaDatos()?.plazas ?? [])
    .filter((otra) => otra.id !== estado?.plaza.id)
    .flatMap((otra) => {
      const a = anilloDe(otra.geometry)
      return a && seCortan(cajaDe(a), vista) ? [a] : []
    })
    .map((a) => `<polygon class="cv-vecina" points="${trazo(a)}" />`)
    .join('')
  const edificios = (estado.edificios ?? [])
    .filter((a) => seCortan(cajaDe(a), vista))
    .map((a) => `<polygon class="cv-edificio" points="${trazo(a)}" />`)
    .join('')
  const marcador = estado.plaza.coordinates
  const [mx, my] = punto([marcador.lng, marcador.lat]).split(',')
  const locales = (vistaDatos()?.places ?? [])
    .filter((l) => l.plazaId === estado?.plaza.id && l.location)
    .map((l) => {
      const dentro = puntoDentro(l.location, anillo)
      const [x, y] = punto([l.location?.lng ?? 0, l.location?.lat ?? 0]).split(',')
      return `<circle class="${dentro ? 'cv-local' : 'cv-local-fuera'}" cx="${x}" cy="${y}" r="4" />`
    })
    .join('')
  const numeros = anillo
    .slice(0, -1)
    .map((p, i) => {
      const [x, y] = punto(p).split(',')
      return `<circle class="cv-vertice" cx="${x}" cy="${y}" r="3.5" /><text class="cv-numero" x="${x}" y="${y}" dx="6" dy="-6">${i + 1}</text>`
    })
    .join('')
  return `<svg viewBox="0 0 ${anchoSvg} ${alto2}" role="img" aria-label="Vista previa del contorno, solo para mirar" class="${conError ? 'contorno-borroso' : ''}">
    ${vecinas}${edificios}
    <polygon class="cv-poligono" points="${trazo(anillo)}" />
    ${locales}${numeros}
    <path class="cv-marcador" d="M${mx} ${Number(my) - 7}v14M${Number(mx) - 7} ${my}h14" />
  </svg>`
}

function puntoDentro(
  p: { lat: number; lng: number } | null | undefined,
  anillo: number[][],
): boolean {
  if (!p) return true
  let dentro = false
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
    const [xi = 0, yi = 0] = anillo[i] ?? []
    const [xj = 0, yj = 0] = anillo[j] ?? []
    if (yi > p.lat !== yj > p.lat && p.lng < ((xj - xi) * (p.lat - yi)) / (yj - yi) + xi)
      dentro = !dentro
  }
  return dentro
}

const vistaDatos = () => vista.datos

/* --------------------------------------------------------------------------------- repintado en vivo */

function seccion(): HTMLElement | null {
  return vista.dialogo?.querySelector<HTMLElement>('[data-contorno-seccion]') ?? null
}

/** Lo que cambia con cada tecla: avisos, dibujo y el impacto, que se borra. Las filas no se reconstruyen. */
function actualizar(): void {
  const raiz = seccion()
  if (!raiz || !estado) return
  const { anillo, errores } = leer(estado.vertices)

  // Cada campo, con su mensaje.
  for (const caja of raiz.querySelectorAll<HTMLElement>('[data-contorno-error]'))
    caja.textContent = ''
  for (const campo of raiz.querySelectorAll<HTMLInputElement>('[data-contorno-campo]')) {
    campo.removeAttribute('aria-invalid')
  }
  for (const e of errores) {
    const campo = raiz.querySelector<HTMLInputElement>(
      `[data-vertice="${e.i}"] [data-contorno-campo="${e.campo}"]`,
    )
    campo?.setAttribute('aria-invalid', 'true')
    const caja = raiz.querySelector<HTMLElement>(`[data-contorno-error="${e.i}-${e.campo}"]`)
    if (caja) caja.textContent = e.mensaje
  }

  const avisos = raiz.querySelector<HTMLElement>('[data-contorno-avisos]')
  const resumen = raiz.querySelector<HTMLElement>('[data-contorno-resumen]')
  const ver = raiz.querySelector<HTMLButtonElement>('[data-contorno-ver]')
  let problemas: string[] = []
  if (anillo) {
    estado.ultimoValido = anillo
    problemas = validarContornoDePlaza(
      { type: 'Polygon', coordinates: [anillo] },
      {
        contorno: (extent.boundary as { coordinates: number[][][] }).coordinates[0],
        marcador: estado.plaza.coordinates,
        otras: (vistaDatos()?.plazas ?? []).flatMap((otra) => {
          const a = anilloDe(otra.geometry)
          return otra.id !== estado?.plaza.id && a ? [{ id: otra.id, anillo: a }] : []
        }),
      },
    ).map((problema) => problema.mensaje)
  }
  if (resumen) {
    resumen.textContent = anillo
      ? `${plural(estado.vertices.length, 'vértice', 'vértices')} · ${numero(Math.round(areaM2(anillo)))} m²`
      : 'Hay coordenadas que no se pueden leer: se dibuja el último contorno válido.'
  }
  if (avisos) {
    avisos.innerHTML = (errores.length > 0 ? [] : problemas)
      .map((p) => `<p>${texto(p)}</p>`)
      .join('')
  }
  if (ver) ver.disabled = !anillo || problemas.length > 0

  const vistaPrevia = raiz.querySelector<HTMLElement>('[data-contorno-vista]')
  const aDibujar = anillo ?? estado.ultimoValido
  // El dibujo mide lo que mide su contenedor, para que una unidad sea un píxel: si no, el texto escalaría con
  // el dibujo y en un teléfono los números de los vértices saldrían de unos 5 px.
  if (vistaPrevia && aDibujar) {
    vistaPrevia.innerHTML = dibujo(
      aDibujar,
      !anillo,
      Math.max(240, vistaPrevia.clientWidth || ANCHO_SVG),
    )
  }

  // Un impacto vale para el contorno que se vio: si cambia, se borra (y con él el botón de guardar).
  if (estado.firmaImpacto !== null && (!anillo || firmaDe(anillo) !== estado.firmaImpacto)) {
    estado.firmaImpacto = null
    const caja = raiz.querySelector<HTMLElement>('[data-contorno-impacto]')
    if (caja) caja.innerHTML = ''
  }
}

function repintarFilas(enfocar?: { i: number }): void {
  const raiz = seccion()
  const lista = raiz?.querySelector<HTMLElement>('[data-contorno-lista]')
  if (!raiz || !lista || !estado) return
  lista.innerHTML = estado.vertices.map((v, i, todos) => fila(v, i, todos.length)).join('')
  actualizar()
  if (enfocar) {
    const i = Math.min(Math.max(enfocar.i, 0), estado.vertices.length - 1)
    lista
      .querySelector<HTMLInputElement>(`[data-vertice="${i}"] [data-contorno-campo="lng"]`)
      ?.focus()
  }
}

/** Después de pintar el formulario: dibuja la vista previa y trae las huellas de los edificios. */
export function contornoListo(): void {
  if (!estado) return
  actualizar()
  const actual = estado
  edificiosEnMemoria ??= fetch(RUTA_EDIFICIOS)
    .then((r) => (r.ok ? r.json() : { features: [] }))
    .then(
      (geojson: {
        features: { properties?: { plazaId?: string }; geometry?: { coordinates?: number[][][] } }[]
      }) =>
        geojson.features.flatMap((f) => {
          const anillo = f.geometry?.coordinates?.[0]
          return anillo && f.properties?.plazaId ? [{ plazaId: f.properties.plazaId, anillo }] : []
        }),
    )
    .catch(() => [])
  void edificiosEnMemoria.then((todos) => {
    // El formulario pudo cerrarse o cambiar de plaza mientras llegaba el archivo.
    if (estado !== actual) return
    actual.edificios = todos.filter((e) => e.plazaId === actual.plaza.id).map((e) => e.anillo)
    actualizar()
  })
}

/* -------------------------------------------------------------------------------------------- pasos */

async function llamar(
  formulario: HTMLFormElement,
  cuerpo: { id: string; geometria: unknown; confirmar?: boolean },
): Promise<Respuesta | null> {
  try {
    const respuesta = await fetch(RUTA, {
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
        resultado?.problemas?.length ? resultado.problemas : ['No se pudo guardar el contorno.'],
      )
      return null
    }
    return resultado
  } catch {
    mostrarProblemas(formulario, ['No se pudo hablar con el servidor.'])
    return null
  }
}

/** Si hay algo escrito en los demás campos del formulario (los del contorno no llevan `name`). */
function otrosCambios(formulario: HTMLFormElement): boolean {
  for (const control of formulario.elements) {
    if (!(control as HTMLInputElement).name) continue
    if (control instanceof HTMLInputElement) {
      if (control.type === 'checkbox' || control.type === 'radio') {
        if (control.checked !== control.defaultChecked) return true
      } else if (control.value !== control.defaultValue) return true
    } else if (control instanceof HTMLTextAreaElement && control.value !== control.defaultValue) {
      return true
    }
  }
  return false
}

async function pedirImpacto(formulario: HTMLFormElement): Promise<void> {
  const raiz = seccion()
  if (!raiz || !estado || vista.guardando) return
  const { anillo } = leer(estado.vertices)
  if (!anillo) return
  mostrarProblemas(formulario, [])
  // El guardado de un contorno cierra el diálogo: lo demás que se haya escrito se perdería.
  if (otrosCambios(formulario)) {
    mostrarProblemas(formulario, [
      'Hay cambios sin guardar en el resto del formulario. Guárdalos antes: el contorno se guarda aparte y al terminar el diálogo se cierra.',
    ])
    return
  }
  const resultado = await llamar(formulario, {
    id: estado.plaza.id,
    geometria: { type: 'Polygon', coordinates: [anillo] },
  })
  if (!resultado?.impacto || !estado) return
  // Mientras llegaba la respuesta pudo cambiarse un vértice: ese impacto ya no corresponde.
  const ahora = leer(estado.vertices).anillo
  if (!ahora || firmaDe(ahora) !== firmaDe(anillo)) return
  estado.firmaImpacto = firmaDe(anillo)
  const { impacto } = resultado
  const sube = impacto.area.cambio >= 0
  const pct =
    impacto.area.antes > 0
      ? Math.round((Math.abs(impacto.area.cambio) / impacto.area.antes) * 100)
      : 0
  const nombres = (lista: { nombre: string }[]) => lista.map((l) => texto(l.nombre)).join(', ')
  const caja = raiz.querySelector<HTMLElement>('[data-contorno-impacto]')
  if (!caja) return
  caja.innerHTML = `<section class="editor-seccion impacto-borrado" aria-labelledby="titulo-contorno" tabindex="-1">
      <h3 id="titulo-contorno">Si guardas este contorno en ${texto(impacto.plaza.nombre)}</h3>
      <ul class="impacto-lista">
        <li>${plural(impacto.vertices.antes, 'vértice', 'vértices')} pasan a ${numero(impacto.vertices.despues)}.</li>
        <li>El área pasa de ${numero(impacto.area.antes)} m² a ${numero(impacto.area.despues)} m² (${sube ? 'sube' : 'baja'} un ${pct} %).</li>
        ${impacto.locales.quedanFuera.length > 0 ? `<li><strong>${plural(impacto.locales.quedanFuera.length, 'local queda', 'locales quedan')} fuera del contorno nuevo:</strong> ${nombres(impacto.locales.quedanFuera)}.</li>` : ''}
        ${impacto.locales.vuelvenDentro.length > 0 ? `<li>${plural(impacto.locales.vuelvenDentro.length, 'local vuelve', 'locales vuelven')} a quedar dentro: ${nombres(impacto.locales.vuelvenDentro)}.</li>` : ''}
        ${impacto.locales.siguenFuera > 0 ? `<li>${plural(impacto.locales.siguenFuera, 'local ya estaba', 'locales ya estaban')} fuera y sigue${impacto.locales.siguenFuera === 1 ? '' : 'n'} igual.</li>` : ''}
      </ul>
      <ul class="impacto-lista">${impacto.avisos.map((aviso) => `<li>${texto(aviso)}</li>`).join('')}</ul>
      <div class="acciones">
        <button type="button" class="${controls.base} ${controls.boton} ${controls.principal}" data-contorno-confirmar>Guardar contorno</button>
        <button type="button" class="${controls.base} ${controls.boton} ${controls.secundario}" data-contorno-cancelar>Mejor no</button>
      </div>
    </section>`
  caja.querySelector<HTMLElement>('section')?.focus()
}

async function confirmar(
  formulario: HTMLFormElement,
  recargar: () => Promise<void>,
): Promise<void> {
  const raiz = seccion()
  if (!raiz || !estado || vista.guardando) return
  const { anillo } = leer(estado.vertices)
  // Lo que se confirma es lo que se vio: si el contorno ya no es el del impacto, no se guarda.
  if (!anillo || estado.firmaImpacto === null || firmaDe(anillo) !== estado.firmaImpacto) {
    mostrarProblemas(formulario, [
      'El contorno cambió después de ver el impacto. Vuelve a pedirlo.',
    ])
    actualizar()
    return
  }
  mostrarProblemas(formulario, [])
  const botones = raiz.querySelectorAll<HTMLButtonElement>('[data-contorno-impacto] button')
  for (const boton of botones) boton.disabled = true
  vista.guardando = true
  try {
    const resultado = await llamar(formulario, {
      id: estado.plaza.id,
      geometria: { type: 'Polygon', coordinates: [anillo] },
      confirmar: true,
    })
    if (!resultado) return
    vista.aviso = resultado.pr
      ? `${resultado.mensaje ?? 'Contorno guardado.'} ${resultado.pr.creada ? 'PR abierta' : 'Añadido a la PR'} #${resultado.pr.numero}.`
      : (resultado.mensaje ?? 'Validado en desarrollo. No se commitea.')
    vista.modo = 'plazas'
    cerrarEditor(true)
    await recargar()
  } finally {
    vista.guardando = false
    for (const boton of botones) boton.disabled = false
  }
}

/* ------------------------------------------------------------------------------------------ eventos */

function marcarSucio(): void {
  if (vista.formularioActual) vista.formularioActual.sucio = true
}

/** Los botones de la sección. Devuelve si lo atendió. */
export function alPulsarContorno(objetivo: HTMLElement, recargar: () => Promise<void>): boolean {
  if (!objetivo.closest('[data-contorno-seccion]') || !estado) return false
  const formulario = objetivo.closest<HTMLFormElement>('form[data-editor]')
  if (!formulario) return false

  const anadir = objetivo.closest<HTMLElement>('[data-contorno-anadir]')
  if (anadir) {
    const i = Number(anadir.dataset.contornoAnadir)
    const actual = estado.vertices[i]
    const siguiente = estado.vertices[(i + 1) % estado.vertices.length]
    const medio = (campo: 'lng' | 'lat'): string => {
      const x = leerCoordenada(actual?.[campo] ?? '')
      const y = leerCoordenada(siguiente?.[campo] ?? '')
      return x !== null && y !== null ? aTexto((x + y) / 2) : (actual?.[campo] ?? '')
    }
    if (estado.vertices.length >= MAX_VERTICES) return true
    estado.vertices.splice(i + 1, 0, { lng: medio('lng'), lat: medio('lat') })
    marcarSucio()
    repintarFilas({ i: i + 1 })
    return true
  }

  const quitar = objetivo.closest<HTMLElement>('[data-contorno-quitar]')
  if (quitar) {
    if (estado.vertices.length <= 3) return true
    const i = Number(quitar.dataset.contornoQuitar)
    estado.vertices.splice(i, 1)
    marcarSucio()
    // El foco pasa a la fila que ocupa su lugar (o a la anterior si era la última): el botón ya no existe.
    repintarFilas({ i: Math.min(i, estado.vertices.length - 1) })
    return true
  }

  if (objetivo.closest('[data-contorno-ver]')) {
    void pedirImpacto(formulario)
    return true
  }
  if (objetivo.closest('[data-contorno-confirmar]')) {
    void confirmar(formulario, recargar)
    return true
  }
  if (objetivo.closest('[data-contorno-cancelar]')) {
    if (estado) estado.firmaImpacto = null
    const caja = seccion()?.querySelector<HTMLElement>('[data-contorno-impacto]')
    if (caja) caja.innerHTML = ''
    seccion()?.querySelector<HTMLElement>('[data-contorno-ver]')?.focus()
    return true
  }
  return false
}

/** Escribir en un vértice. Devuelve si lo atendió. */
export function alEscribirContorno(objetivo: HTMLElement): boolean {
  const campo = objetivo.closest<HTMLInputElement>('[data-contorno-campo]')
  if (!campo || !estado) return false
  const fila = campo.closest<HTMLElement>('[data-vertice]')
  const vertice = estado.vertices[Number(fila?.dataset.vertice)]
  if (!vertice) return true
  vertice[campo.dataset.contornoCampo === 'lat' ? 'lat' : 'lng'] = campo.value
  marcarSucio()
  actualizar()
  return true
}

/** Intro en un vértice no envía el formulario entero. */
export function alTeclearContorno(evento: KeyboardEvent): void {
  const objetivo = evento.target as HTMLElement | null
  if (evento.key === 'Enter' && objetivo?.matches('[data-contorno-campo]')) evento.preventDefault()
}

/** Al abrir otro formulario o cerrar el diálogo, lo de la plaza anterior no se queda colgando. */
export function olvidarContorno(): void {
  estado = null
}
