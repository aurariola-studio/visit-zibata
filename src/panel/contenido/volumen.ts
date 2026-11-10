import { ALTURA_MAX_M, ALTURA_MIN_M, ESCALA_MAX, ESCALA_MIN } from '../../data/rules.ts'
import controls from '../../styles/controls.module.css'
import { leerCoordenada, otrosCambios } from './contorno.ts'
import { cerrarEditor, mostrarProblemas } from './editor.ts'
import type { PlazaResumen, ReglaVolumen } from './tipos.ts'
import { numero, texto } from './tipos.ts'
import { vista } from './vista.ts'

/**
 * El volumen provisional de una plaza: el prisma que el mapa dibuja cuando la plaza no tiene huellas reales de
 * edificio (o cuando se piden descartar las que tiene). Sección del formulario de la plaza, con su propio paso a
 * paso, como el contorno:
 *
 *  1. Los campos (altura, tamaño, reemplazar) no llevan `name`: "Guardar cambios" nunca los manda.
 *  2. "Ver el impacto" pide al Worker qué cambiaría, sin guardar nada.
 *  3. "Guardar volumen" confirma **exactamente la regla cuyo impacto se vio**: cualquier cambio posterior borra el
 *     impacto y el botón.
 *
 * Los límites vienen de `rules.ts`, los mismos que aplica el servidor; el aviso de aquí es orientativo.
 */

const RUTA = '/api/panel/contenido/plaza/volumen'
const RUTA_EDIFICIOS = '/map/plaza-buildings.geojson'

interface Impacto {
  plaza: { id: string; nombre: string }
  antes: ReglaVolumen
  despues: ReglaVolumen
  general: ReglaVolumen
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
  /** Lo que escribió la persona, tal cual. */
  altura: string
  tamano: string
  reemplazar: boolean
  /** La regla cuyo impacto se está enseñando; `null` si no hay impacto a la vista. */
  firmaImpacto: string | null
  /** Se pidió volver a la regla general en vez de mandar cifras. */
  restablecer: boolean
}

let estado: Estado | null = null
/** Lo que trae el mapa publicado por plaza, para decir si la plaza tiene huellas reales. */
let huellasEnMemoria: Promise<Map<string, { reales: number; generadas: number }>> | null = null

const regla = (plaza: PlazaResumen): ReglaVolumen | null => {
  const datos = vista.datos?.volumenes
  if (!datos) return null
  return { ...datos.default, ...datos.plazas[plaza.id] }
}

/** La regla que dicen los campos, o `null` si alguno no se puede leer o está fuera de rango. */
function leer(e: Estado): {
  regla: ReglaVolumen | null
  errores: { altura?: string; tamano?: string }
} {
  const errores: { altura?: string; tamano?: string } = {}
  const altura = leerCoordenada(e.altura)
  const tamano = leerCoordenada(e.tamano)
  if (altura === null || altura < ALTURA_MIN_M || altura > ALTURA_MAX_M)
    errores.altura = `Escribe de ${ALTURA_MIN_M} a ${ALTURA_MAX_M} metros.`
  if (tamano === null || tamano < ESCALA_MIN * 100 || tamano > ESCALA_MAX * 100)
    errores.tamano = `Escribe de ${ESCALA_MIN * 100} a ${ESCALA_MAX * 100} %.`
  if (errores.altura || errores.tamano || altura === null || tamano === null)
    return { regla: null, errores }
  return {
    regla: { height: altura, scale: tamano / 100, replaceExisting: e.reemplazar },
    errores,
  }
}

const firmaDe = (r: ReglaVolumen): string => JSON.stringify(r)
const aPorciento = (escala: number): string => String(Math.round(escala * 100))

/* ------------------------------------------------------------------------------------------ marcado */

/**
 * La sección, o nada si el Worker no trae volúmenes (uno anterior a esta entrega) o dice que el archivo no se puede
 * editar. Lo de la plaza anterior no puede quedarse si esta no tiene sección.
 */
export function seccionVolumen(plaza: PlazaResumen): string {
  estado = null
  if (vista.datos?.volumenes === undefined) return ''
  const actual = regla(plaza)
  if (!actual) {
    return `<section class="editor-seccion" data-volumen-seccion>
      <h3>Volumen provisional</h3>
      <p class="ayuda">El archivo de volúmenes falta en esta rama o no pasa el esquema: hay que arreglarlo en git (o actualizar la PR del panel con la rama principal) antes de editarlo desde el panel.</p>
    </section>`
  }
  estado = {
    plaza,
    altura: String(actual.height),
    tamano: aPorciento(actual.scale),
    reemplazar: actual.replaceExisting,
    firmaImpacto: null,
    restablecer: false,
  }
  const propia = vista.datos.volumenes?.plazas[plaza.id] !== undefined
  return `<section class="editor-seccion" data-volumen-seccion>
    <h3>Volumen provisional</h3>
    <p class="ayuda">El prisma que el mapa dibuja en esta plaza mientras no tenga edificio propio: es el contorno de la plaza a escala, así que solo es rectangular si el contorno lo es. Con "Reemplazar las huellas reales" apagado, el prisma desaparece solo cuando el mapa se actualice y traiga el edificio real. Si está encendido, el prisma tapa cualquier edificio real: apágalo para que se dibuje.</p>
    <p class="ayuda" role="status" data-volumen-huellas>Mirando qué trae el mapa publicado…</p>
    <div class="editor-rejilla">
      <label class="campo-form">
        <span>Altura (metros)</span>
        <input class="${controls.campo}" type="text" inputmode="decimal" autocomplete="off" data-volumen-campo="altura" value="${texto(estado.altura)}" aria-describedby="volumen-error-altura" />
        <span class="campo-error" id="volumen-error-altura" data-volumen-error="altura"></span>
      </label>
      <label class="campo-form">
        <span>Tamaño (% del contorno)</span>
        <input class="${controls.campo}" type="text" inputmode="decimal" autocomplete="off" data-volumen-campo="tamano" value="${texto(estado.tamano)}" aria-describedby="volumen-error-tamano" />
        <span class="campo-error" id="volumen-error-tamano" data-volumen-error="tamano"></span>
      </label>
      <div class="campo-form campo-ancho">
        <label class="casilla"><input type="checkbox" data-volumen-campo="reemplazar"${estado.reemplazar ? ' checked' : ''} /><span>Reemplazar las huellas reales</span></label>
        <span class="ayuda">Apagado, el prisma solo se dibuja si la plaza no tiene huellas reales de edificio. Encendido, esas huellas se descartan y se dibuja solo el prisma.</span>
      </div>
    </div>
    <div class="acciones">
      <button type="button" class="${controls.base} ${controls.boton} ${controls.secundario}" data-volumen-ver aria-label="Ver el impacto del volumen">Ver el impacto</button>
      ${propia ? `<button type="button" class="${controls.base} ${controls.boton} ${controls.fantasma}" data-volumen-restablecer>Restablecer a la regla general</button>` : ''}
    </div>
    <div data-volumen-impacto></div>
  </section>`
}

function seccion(): HTMLElement | null {
  return vista.dialogo?.querySelector<HTMLElement>('[data-volumen-seccion]') ?? null
}

/** Después de pintar el formulario: dice si el mapa publicado trae huellas reales de esta plaza. */
export function volumenListo(): void {
  if (!estado) return
  const actual = estado
  huellasEnMemoria ??= fetch(RUTA_EDIFICIOS)
    .then((r) => (r.ok ? r.json() : { features: [] }))
    .then((geojson: { features: { properties?: { plazaId?: string; src?: string } }[] }) => {
      const porPlaza = new Map<string, { reales: number; generadas: number }>()
      for (const f of geojson.features) {
        const id = f.properties?.plazaId
        if (!id) continue
        const cuenta = porPlaza.get(id) ?? { reales: 0, generadas: 0 }
        if (f.properties?.src === 'synthetic') cuenta.generadas++
        else cuenta.reales++
        porPlaza.set(id, cuenta)
      }
      return porPlaza
    })
    .catch(() => new Map<string, { reales: number; generadas: number }>())
  void huellasEnMemoria.then((porPlaza) => {
    // El formulario pudo cerrarse o cambiar de plaza mientras llegaba el archivo.
    if (estado !== actual) return
    const caja = seccion()?.querySelector<HTMLElement>('[data-volumen-huellas]')
    if (!caja) return
    const cuenta = porPlaza.get(actual.plaza.id)
    const aclaracion = ' Es el mapa publicado: no incluye lo que esté pendiente en la PR.'
    if (!cuenta) {
      caja.textContent = `No se pudo saber qué trae el mapa publicado para esta plaza.${aclaracion}`
    } else if (cuenta.reales > 0) {
      caja.textContent = `El mapa publicado dibuja ${numero(cuenta.reales)} ${cuenta.reales === 1 ? 'huella real' : 'huellas reales'} en esta plaza${cuenta.generadas > 0 ? ' y un volumen generado' : ''}.${aclaracion}`
    } else if (regla(actual.plaza)?.replaceExisting) {
      // Con el interruptor encendido el build descarta las huellas reales: lo publicado no dice si las hay.
      caja.textContent = `El mapa publicado dibuja solo el volumen generado. Esta plaza reemplaza sus huellas reales, así que no se sabe si las tiene: apaga "Reemplazar las huellas reales" para que se dibujen, si existen.${aclaracion}`
    } else {
      caja.textContent = `El mapa publicado dibuja solo el volumen generado: esta plaza no tiene huellas reales.${aclaracion}`
    }
  })
}

/* --------------------------------------------------------------------------------- repintado en vivo */

function actualizar(): void {
  const raiz = seccion()
  if (!raiz || !estado) return
  const { regla: leida, errores } = leer(estado)
  for (const clave of ['altura', 'tamano'] as const) {
    const campo = raiz.querySelector<HTMLInputElement>(`[data-volumen-campo="${clave}"]`)
    const caja = raiz.querySelector<HTMLElement>(`[data-volumen-error="${clave}"]`)
    if (errores[clave]) campo?.setAttribute('aria-invalid', 'true')
    else campo?.removeAttribute('aria-invalid')
    if (caja) caja.textContent = errores[clave] ?? ''
  }
  const ver = raiz.querySelector<HTMLButtonElement>('[data-volumen-ver]')
  if (ver) ver.disabled = !leida

  // Un impacto vale para la regla que se vio: si cambia, se borra (y con él el botón de guardar).
  const vigente = estado.restablecer ? 'restablecer' : leida ? firmaDe(leida) : null
  if (estado.firmaImpacto !== null && estado.firmaImpacto !== vigente) {
    estado.firmaImpacto = null
    const caja = raiz.querySelector<HTMLElement>('[data-volumen-impacto]')
    if (caja) caja.innerHTML = ''
  }
}

/* -------------------------------------------------------------------------------------------- pasos */

async function llamar(
  formulario: HTMLFormElement,
  cuerpo: Record<string, unknown>,
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
        resultado?.problemas?.length ? resultado.problemas : ['No se pudo guardar el volumen.'],
      )
      return null
    }
    return resultado
  } catch {
    mostrarProblemas(formulario, ['No se pudo hablar con el servidor.'])
    return null
  }
}

/** Lo que se manda: o las tres cifras, o `restablecer`. `null` si los campos no se pueden leer. */
function cuerpoActual(): { cuerpo: Record<string, unknown>; firma: string } | null {
  if (!estado) return null
  if (estado.restablecer) {
    return { cuerpo: { id: estado.plaza.id, restablecer: true }, firma: 'restablecer' }
  }
  const { regla: leida } = leer(estado)
  if (!leida) return null
  return {
    cuerpo: {
      id: estado.plaza.id,
      height: leida.height,
      scale: leida.scale,
      replaceExisting: leida.replaceExisting,
    },
    firma: firmaDe(leida),
  }
}

const regla2 = (r: ReglaVolumen): string =>
  `${numero(r.height)} m, ${aPorciento(r.scale)} %, ${r.replaceExisting ? 'sustituye las huellas reales' : 'no sustituye las huellas reales'}`

async function pedirImpacto(formulario: HTMLFormElement): Promise<void> {
  const raiz = seccion()
  if (!raiz || !estado || vista.guardando) return
  const actual = cuerpoActual()
  if (!actual) return
  mostrarProblemas(formulario, [])
  // El guardado cierra el diálogo: lo demás que se haya escrito se perdería.
  if (otrosCambios(formulario)) {
    mostrarProblemas(formulario, [
      'Hay cambios sin guardar en el resto del formulario. Guárdalos antes: el volumen se guarda aparte y al terminar el diálogo se cierra.',
    ])
    return
  }
  const resultado = await llamar(formulario, actual.cuerpo)
  if (!resultado?.impacto || !estado) return
  // Mientras llegaba la respuesta pudo cambiarse un campo: ese impacto ya no corresponde.
  if (cuerpoActual()?.firma !== actual.firma) return
  estado.firmaImpacto = actual.firma
  const { impacto } = resultado
  const caja = raiz.querySelector<HTMLElement>('[data-volumen-impacto]')
  if (!caja) return
  caja.innerHTML = `<section class="editor-seccion impacto-borrado" aria-labelledby="titulo-volumen" tabindex="-1">
      <h3 id="titulo-volumen">Si guardas este volumen en ${texto(impacto.plaza.nombre)}</h3>
      <ul class="impacto-lista">
        <li>Ahora: ${texto(regla2(impacto.antes))}.</li>
        <li>Después: ${texto(regla2(impacto.despues))}.</li>
      </ul>
      <ul class="impacto-lista">${impacto.avisos.map((aviso) => `<li>${texto(aviso)}</li>`).join('')}</ul>
      <div class="acciones">
        <button type="button" class="${controls.base} ${controls.boton} ${controls.principal}" data-volumen-confirmar>Guardar volumen</button>
        <button type="button" class="${controls.base} ${controls.boton} ${controls.secundario}" data-volumen-cancelar>Mejor no</button>
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
  const actual = cuerpoActual()
  // Lo que se confirma es lo que se vio: si la regla ya no es la del impacto, no se guarda.
  if (!actual || estado.firmaImpacto === null || actual.firma !== estado.firmaImpacto) {
    mostrarProblemas(formulario, ['La regla cambió después de ver el impacto. Vuelve a pedirlo.'])
    actualizar()
    return
  }
  mostrarProblemas(formulario, [])
  const botones = raiz.querySelectorAll<HTMLButtonElement>('[data-volumen-impacto] button')
  for (const boton of botones) boton.disabled = true
  vista.guardando = true
  try {
    const resultado = await llamar(formulario, { ...actual.cuerpo, confirmar: true })
    if (!resultado) return
    vista.aviso = resultado.pr
      ? `${resultado.mensaje ?? 'Volumen guardado.'} ${resultado.pr.creada ? 'PR abierta' : 'Añadido a la PR'} #${resultado.pr.numero}.`
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

/** Los botones de la sección. Devuelve si lo atendió. */
export function alPulsarVolumen(objetivo: HTMLElement, recargar: () => Promise<void>): boolean {
  if (!objetivo.closest('[data-volumen-seccion]') || !estado) return false
  const formulario = objetivo.closest<HTMLFormElement>('form[data-editor]')
  if (!formulario) return false

  if (objetivo.closest('[data-volumen-ver]')) {
    estado.restablecer = false
    void pedirImpacto(formulario)
    return true
  }
  if (objetivo.closest('[data-volumen-restablecer]')) {
    estado.restablecer = true
    void pedirImpacto(formulario)
    return true
  }
  if (objetivo.closest('[data-volumen-confirmar]')) {
    void confirmar(formulario, recargar)
    return true
  }
  if (objetivo.closest('[data-volumen-cancelar]')) {
    estado.firmaImpacto = null
    estado.restablecer = false
    const caja = seccion()?.querySelector<HTMLElement>('[data-volumen-impacto]')
    if (caja) caja.innerHTML = ''
    seccion()?.querySelector<HTMLElement>('[data-volumen-ver]')?.focus()
    return true
  }
  return false
}

/** Escribir o marcar un campo. Devuelve si lo atendió. */
export function alEscribirVolumen(objetivo: HTMLElement): boolean {
  const campo = objetivo.closest<HTMLInputElement>('[data-volumen-campo]')
  if (!campo || !estado) return false
  const cual = campo.dataset.volumenCampo
  if (cual === 'altura') estado.altura = campo.value
  else if (cual === 'tamano') estado.tamano = campo.value
  else if (cual === 'reemplazar') estado.reemplazar = campo.checked
  // Tocar un campo deja la vista de "restablecer": ya se quiere otra regla.
  estado.restablecer = false
  actualizar()
  return true
}

/** Intro en un campo no envía el formulario entero. */
export function alTeclearVolumen(evento: KeyboardEvent): void {
  const objetivo = evento.target as HTMLElement | null
  if (evento.key === 'Enter' && objetivo?.matches('[data-volumen-campo]')) evento.preventDefault()
}

/** Al abrir otro formulario o cerrar el diálogo, lo de la plaza anterior no se queda colgando. */
export function olvidarVolumen(): void {
  estado = null
}
