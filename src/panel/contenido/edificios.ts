import controls from '../../styles/controls.module.css'
import { leerCoordenada } from './contorno.ts'
import { abrirEditor, cerrarEditor, mostrarProblemas } from './editor.ts'
import { numero, texto } from './tipos.ts'
import { vista } from './vista.ts'

/*
 * Los ajustes a mano de los edificios del mapa: la lista y quitar uno. Ocultar un edificio o fijarle la altura
 * (Fase 4b-2, desde el mapa) los añade; aquí se ven y se deshacen. Sin esto un edificio oculto no se podría
 * volver a tocar: ya no está en el mapa para pulsarlo.
 *
 * Lo que se quita pasa por los dos pasos de siempre: primero se ve lo que cambiaría, luego se confirma, y lo que
 * se confirma es lo que se vio.
 */

const RUTA = '/api/panel/contenido/edificio'

interface Punto {
  lat: number
  lng: number
}

interface Respuesta {
  ok: boolean
  mensaje?: string
  pr?: { numero: number; creada: boolean } | null
  problemas?: string[]
  resumen?: { total: number; avisos: string[] }
}

/** El mapa abierto en el formulario de ajustar, para destruirlo al cerrarlo. */
let mapaAbierto: import('./edificios-mapa.ts').MapaDeEdificios | null = null

/** Metros con sus decimales (10,5), no redondeados como un conteo. */
const metros = (valor: number) =>
  new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 }).format(valor)
const claveDe = (punto: Punto) => `${punto.lat},${punto.lng}`
const coordenadas = (punto: Punto) => `${punto.lat.toFixed(6)}, ${punto.lng.toFixed(6)}`

export function pintarEdificios(): void {
  if (!vista.raiz || !vista.datos) return
  const { valido, ajustes } = vista.datos.edificios ?? { valido: true, ajustes: [] }
  const filas = ajustes
    .map((ajuste) => {
      const que =
        ajuste.accion === 'ocultar' ? 'Oculto' : `Altura fijada a ${metros(ajuste.alturaM ?? 0)} m`
      const donde = coordenadas(ajuste.punto)
      return `<tr>
        <td class="celda-nombre"><span class="negocio-nombre">${texto(que)}</span><span class="ayuda">${texto(donde)}</span><span class="ayuda">${texto(ajuste.motivo)}</span></td>
        <td class="col-orden">${texto(ajuste.creado)}</td>
        <td class="accion"><button type="button" class="${controls.base} ${controls.boton} ${controls.fantasma}" data-quitar-edificio="${texto(claveDe(ajuste.punto))}" aria-label="Quitar el ajuste: ${texto(que)} en ${texto(donde)}">Quitar</button></td>
      </tr>`
    })
    .join('')
  vista.raiz.innerHTML = `
    <div class="barra-contenido">
      <p class="meta-contenido">${numero(ajustes.length)} ${ajustes.length === 1 ? 'ajuste' : 'ajustes'} de edificios</p>
      <button type="button" class="${controls.base} ${controls.boton} ${controls.principal}" data-ajustar-edificio${valido ? '' : ' disabled'}>Elegir en el mapa</button>
    </div>
    ${vista.aviso ? `<p class="aviso-contenido" role="status">${texto(vista.aviso)}</p>` : ''}
    ${valido ? '' : '<p class="aviso-contenido" role="alert">El archivo de ajustes no pasa el esquema: no se puede editar desde el panel. Hay que arreglarlo en git.</p>'}
    ${
      ajustes.length === 0
        ? '<p class="estado">Todavía no hay ajustes. Un ajuste oculta un edificio del mapa o le fija la altura.</p>'
        : `<div class="tabla"><table>
      <thead><tr>
        <th>Ajuste y motivo</th>
        <th class="col-orden">Desde</th>
        <th class="accion"><span class="visualmente">Acciones</span></th>
      </tr></thead>
      <tbody>${filas}</tbody>
    </table></div>`
    }
    <p class="meta-contenido">Un ajuste oculta un edificio o le fija la altura. Cada cambio abre o añade una PR; el build comprueba contra los datos de edificios que cada ajuste cae en una sola huella, y si no, la PR no se puede fusionar (se retira desde el Resumen, con "Retirar el último cambio").</p>`
}

const zonaImpacto = (formulario: HTMLFormElement) =>
  formulario.querySelector<HTMLElement>('[data-edificio-impacto]')

async function llamar(formulario: HTMLFormElement, cuerpo: object): Promise<Respuesta | null> {
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
        resultado?.problemas?.length ? resultado.problemas : ['No se pudo guardar el ajuste.'],
      )
      return null
    }
    return resultado
  } catch {
    mostrarProblemas(formulario, ['No se pudo hablar con el servidor.'])
    return null
  }
}

/** Abre el formulario de quitar y pide ya lo que cambiaría: no hay nada que rellenar. */
export function pintarQuitarEdificio(clave: string): void {
  const ajuste = vista.datos?.edificios?.ajustes.find((fila) => claveDe(fila.punto) === clave)
  if (!ajuste) return
  vista.modo = 'edificios'
  vista.formularioActual = {
    id: clave,
    nombre: 'Quitar un ajuste',
    seleccion: [],
    fotos: [],
    sucio: false,
    consultaGiro: '',
  }
  const que =
    ajuste.accion === 'ocultar'
      ? 'Edificio oculto'
      : `Altura fijada a ${metros(ajuste.alturaM ?? 0)} m`
  abrirEditor(
    'Edificios',
    'Quitar un ajuste',
    `<form data-editor="edificio-quitar" data-clave="${texto(clave)}" novalidate>
      <section class="editor-seccion">
        <h3>${texto(que)}</h3>
        <ul class="impacto-lista">
          <li>Punto del edificio: <code>${texto(coordenadas(ajuste.punto))}</code></li>
          <li>Motivo: ${texto(ajuste.motivo)}</li>
          <li>Ajustado el ${texto(ajuste.creado)}.</li>
        </ul>
      </section>
      <div class="problemas" data-problemas role="alert"></div>
      <div data-edificio-impacto></div>
    </form>`,
  )
  const formulario = vista.dialogo?.querySelector<HTMLFormElement>(
    'form[data-editor="edificio-quitar"]',
  )
  if (formulario) void pedirImpacto(formulario, ajuste.punto)
}

async function pedirImpacto(formulario: HTMLFormElement, punto: Punto): Promise<void> {
  const cuerpo = { operacion: 'quitar', punto }
  const resultado = await llamar(formulario, cuerpo)
  const zona = zonaImpacto(formulario)
  if (!resultado?.resumen || !zona) return
  zona.innerHTML = `<section class="editor-seccion impacto-borrado" aria-labelledby="titulo-quitar-edificio" tabindex="-1" data-firma="${texto(JSON.stringify(cuerpo))}">
      <h3 id="titulo-quitar-edificio">Se quitará este ajuste</h3>
      <ul class="impacto-lista">${resultado.resumen.avisos.map((aviso) => `<li>${texto(aviso)}</li>`).join('')}</ul>
      <div class="acciones">
        <button type="button" class="${controls.base} ${controls.boton} ${controls.principal}" data-confirmar-edificio>Quitar ajuste</button>
        <button type="button" class="${controls.base} ${controls.boton} ${controls.secundario}" data-cancelar>Mejor no</button>
      </div>
    </section>`
  zona.querySelector<HTMLElement>('section')?.focus()
}

/** Lo que se confirma es lo que se vio. */
async function confirmar(
  formulario: HTMLFormElement,
  recargar: () => Promise<void>,
): Promise<void> {
  const zona = zonaImpacto(formulario)
  const firma = zona?.querySelector<HTMLElement>('[data-firma]')?.dataset.firma
  if (!zona || !firma || vista.guardando) return
  let cuerpo: object
  try {
    cuerpo = JSON.parse(firma) as object
  } catch {
    return
  }
  mostrarProblemas(formulario, [])
  const botones = zona.querySelectorAll<HTMLButtonElement>('button')
  for (const boton of botones) boton.disabled = true
  vista.guardando = true
  try {
    const resultado = await llamar(formulario, { ...cuerpo, confirmar: true })
    if (!resultado) return
    vista.aviso = resultado.pr
      ? `${resultado.mensaje ?? 'Ajuste quitado.'} ${resultado.pr.creada ? 'PR abierta' : 'Añadido a la PR'} #${resultado.pr.numero}.`
      : (resultado.mensaje ?? 'Validado en desarrollo. No se commitea.')
    vista.modo = 'edificios'
    cerrarEditor(true)
    await recargar()
  } finally {
    vista.guardando = false
    for (const boton of botones) boton.disabled = false
  }
}

/** Los botones del impacto. Devuelve si lo atendió. */
export function alPulsarEdificio(objetivo: HTMLElement, recargar: () => Promise<void>): boolean {
  const formulario = objetivo.closest<HTMLFormElement>(
    'form[data-editor="edificio-quitar"], form[data-editor="edificio-ajustar"]',
  )
  if (!formulario) return false
  if (objetivo.closest('[data-confirmar-edificio]')) {
    void confirmar(formulario, recargar)
    return true
  }
  if (objetivo.closest('[data-edificio-cancelar]')) {
    const zona = zonaImpacto(formulario)
    if (zona) zona.innerHTML = ''
    return true
  }
  return false
}

/* ------------------------------------------------------------------ ajustar un edificio */

export function olvidarMapaEdificios(): void {
  mapaAbierto?.destruir()
  mapaAbierto = null
}

const formularioDeAjuste = () =>
  vista.dialogo?.querySelector<HTMLFormElement>('form[data-editor="edificio-ajustar"]') ?? null

/** Abre el formulario de ajustar un edificio, con el mapa delante. */
export function pintarAjustarEdificio(): void {
  vista.modo = 'edificios'
  vista.formularioActual = {
    id: '',
    nombre: 'Ajustar un edificio',
    seleccion: [],
    fotos: [],
    sucio: false,
    consultaGiro: '',
  }
  const plazas = [...(vista.datos?.plazas ?? [])]
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))
    .map((plaza) => `<option value="${texto(plaza.id)}">${texto(plaza.name)}</option>`)
    .join('')
  abrirEditor(
    'Edificios',
    'Ajustar un edificio',
    `<form data-editor="edificio-ajustar" novalidate>
      <section class="editor-seccion">
        <h3>Edificio</h3>
        <p class="ayuda">Pulsa un edificio en el mapa. El panel manda un punto dentro de su huella, y el build comprueba que cae en una sola. Los puntos rojos son ajustes que ya existen. No se pueden ajustar los volúmenes generados, dos edificios a la vez ni uno que ya tiene un ajuste.</p>
        <label class="campo-form">
          <span>Centrar el mapa en una plaza</span>
          <select class="${controls.campo}" name="plazaCentro"><option value="">Elige una plaza</option>${plazas}</select>
        </label>
        <div class="edificios-mapa" data-edificios-mapa role="group" aria-label="Mapa para elegir un edificio"></div>
        <p class="ayuda" data-edificio-aviso role="status"></p>
        <div class="editor-rejilla">
          <label class="campo-form"><span>Latitud</span><input class="${controls.campo}" type="text" inputmode="decimal" autocomplete="off" name="lat" /></label>
          <label class="campo-form"><span>Longitud</span><input class="${controls.campo}" type="text" inputmode="decimal" autocomplete="off" name="lng" /></label>
        </div>
        <p class="ayuda" data-edificio-elegido>Sin edificio elegido. Sin ratón ni pantalla táctil, escribe las coordenadas de un punto dentro del edificio: así no se comprueba nada hasta el build.</p>
      </section>

      <section class="editor-seccion">
        <h3>Qué hacer</h3>
        <fieldset class="campo-form">
          <legend>Ajuste <span class="ayuda">obligatorio</span></legend>
          <label class="casilla"><input type="radio" name="accion" value="ocultar" /><span>Ocultarlo: desaparece del mapa, en 2D y en 3D</span></label>
          <label class="casilla"><input type="radio" name="accion" value="altura" /><span>Fijarle la altura, en metros</span></label>
        </fieldset>
        <div class="editor-rejilla">
          <label class="campo-form" data-edificio-altura hidden>
            <span>Altura en metros</span>
            <input class="${controls.campo}" type="text" inputmode="decimal" autocomplete="off" name="alturaM" />
            <span class="ayuda">Se usa tal cual, sin redondearla a pisos de 3 m.</span>
          </label>
          <label class="campo-form campo-ancho">
            <span>Por qué se ajusta</span>
            <textarea class="${controls.campo} ${controls.areaTexto}" name="motivo" rows="2" maxlength="200"></textarea>
            <span class="ayuda">Obligatorio: un cambio al mapa sin razón no se puede revisar después.</span>
          </label>
        </div>
      </section>

      <div data-edificio-impacto></div>

      <footer class="editor-pie">
        <div class="problemas" data-problemas role="alert"></div>
        <div class="acciones">
          <button type="submit" class="${controls.base} ${controls.boton} ${controls.secundario}">Ver lo que cambiaría</button>
          <button type="button" class="${controls.base} ${controls.boton} ${controls.secundario}" data-cancelar>Cancelar</button>
        </div>
      </footer>
    </form>`,
  )
  void abrirElMapa()
}

async function abrirElMapa(): Promise<void> {
  const formulario = formularioDeAjuste()
  const caja = formulario?.querySelector<HTMLElement>('[data-edificios-mapa]')
  if (!formulario || !caja || !vista.datos) return
  const aviso = formulario.querySelector<HTMLElement>('[data-edificio-aviso]')
  if (aviso) aviso.textContent = 'Cargando el mapa…'
  try {
    const { abrirMapaDeEdificios } = await import('./edificios-mapa.ts')
    // Mientras se descargaba pudo cerrarse el formulario.
    if (formularioDeAjuste() !== formulario) return
    if (aviso) aviso.textContent = ''
    mapaAbierto = await abrirMapaDeEdificios({
      contenedor: caja,
      plazas: vista.datos.plazas,
      ajustes: vista.datos.edificios?.ajustes ?? [],
      alElegir(edificio) {
        if (formularioDeAjuste() !== formulario) return
        poner(formulario, 'lat', String(edificio.punto.lat))
        poner(formulario, 'lng', String(edificio.punto.lng))
        const resumen = formulario.querySelector<HTMLElement>('[data-edificio-elegido]')
        if (resumen) {
          resumen.textContent = `Edificio elegido: huella de ${edificio.fuente || 'origen desconocido'}${edificio.alturaM !== null ? `, altura estimada ${metros(edificio.alturaM)} m` : ''}. El punto queda a ${metros(edificio.margenM)} m del borde.`
        }
        if (aviso) aviso.textContent = ''
        limpiarImpacto(formulario)
      },
      alRechazar(motivo) {
        if (formularioDeAjuste() === formulario && aviso) aviso.textContent = motivo
      },
    })
    if (formularioDeAjuste() !== formulario) olvidarMapaEdificios()
  } catch {
    if (formularioDeAjuste() !== formulario) return
    if (aviso) {
      aviso.textContent =
        'No se pudo cargar el mapa (¿sin WebGL?). El ajuste se puede hacer igual escribiendo las coordenadas de un punto dentro del edificio.'
    }
  }
}

function poner(formulario: HTMLFormElement, nombre: string, valor: string): void {
  const campo = formulario.elements.namedItem(nombre)
  if (campo instanceof HTMLInputElement) campo.value = valor
}

function limpiarImpacto(formulario: HTMLFormElement): void {
  const zona = zonaImpacto(formulario)
  if (zona && zona.innerHTML !== '') zona.innerHTML = ''
}

interface CuerpoAjuste {
  operacion: 'ajustar'
  punto: Punto
  accion: 'ocultar' | 'altura'
  alturaM?: number
  motivo: string
}

function leerAjuste(formulario: HTMLFormElement): {
  cuerpo: CuerpoAjuste | null
  problemas: string[]
} {
  const valor = (nombre: string) =>
    (
      formulario.elements.namedItem(nombre) as HTMLInputElement | HTMLTextAreaElement | null
    )?.value.trim() ?? ''
  const problemas: string[] = []
  const lat = leerCoordenada(valor('lat'))
  const lng = leerCoordenada(valor('lng'))
  if (lat === null || lng === null) {
    problemas.push(
      'lat: Elige un edificio en el mapa, o escribe la latitud y la longitud de un punto dentro de él.',
    )
  }
  const accion = formulario.querySelector<HTMLInputElement>('input[name="accion"]:checked')?.value
  if (accion !== 'ocultar' && accion !== 'altura') {
    problemas.push('accion: Elige si se oculta o se le fija la altura.')
  }
  const altura = leerCoordenada(valor('alturaM'))
  if (accion === 'altura' && (altura === null || altura < 1 || altura > 120)) {
    problemas.push('alturaM: Escribe la altura en metros, entre 1 y 120.')
  }
  const motivo = valor('motivo')
  if (motivo.length < 3) problemas.push('motivo: Escribe por qué se ajusta.')
  if (problemas.length > 0 || lat === null || lng === null || !accion) {
    return { cuerpo: null, problemas }
  }
  return {
    problemas,
    cuerpo: {
      operacion: 'ajustar',
      punto: { lat, lng },
      accion: accion as 'ocultar' | 'altura',
      ...(accion === 'altura' && altura !== null ? { alturaM: altura } : {}),
      motivo,
    },
  }
}

/** Primer paso: lo que cambiaría, sin guardar nada. */
export async function enviarAjustarEdificio(formulario: HTMLFormElement): Promise<void> {
  if (vista.guardando) return
  mostrarProblemas(formulario, [])
  const { cuerpo, problemas } = leerAjuste(formulario)
  if (!cuerpo) {
    mostrarProblemas(formulario, problemas)
    return
  }
  const resultado = await llamar(formulario, cuerpo)
  const zona = zonaImpacto(formulario)
  if (!resultado?.resumen || !zona) return
  // Mientras llegaba la respuesta pudo cambiarse algo: ese resultado ya no corresponde.
  const ahora = leerAjuste(formulario).cuerpo
  if (!ahora || JSON.stringify(ahora) !== JSON.stringify(cuerpo)) return
  const titulo =
    cuerpo.accion === 'ocultar'
      ? 'Se ocultará este edificio'
      : `Se fijará su altura a ${metros(cuerpo.alturaM ?? 0)} m`
  zona.innerHTML = `<section class="editor-seccion impacto-borrado" aria-labelledby="titulo-ajustar-edificio" tabindex="-1" data-firma="${texto(JSON.stringify(cuerpo))}">
      <h3 id="titulo-ajustar-edificio">${texto(titulo)}</h3>
      <ul class="impacto-lista">${resultado.resumen.avisos.map((aviso) => `<li>${texto(aviso)}</li>`).join('')}</ul>
      <div class="acciones">
        <button type="button" class="${controls.base} ${controls.boton} ${controls.principal}" data-confirmar-edificio>Enviar a la PR</button>
        <button type="button" class="${controls.base} ${controls.boton} ${controls.secundario}" data-edificio-cancelar>Mejor no</button>
      </div>
    </section>`
  zona.querySelector<HTMLElement>('section')?.focus()
}

/** Cualquier cambio en el formulario borra lo que se enseñó, y algunos campos hacen algo más. */
export function alCambiarEdificio(objetivo: HTMLElement): void {
  const formulario = objetivo.closest<HTMLFormElement>('form[data-editor="edificio-ajustar"]')
  if (!formulario || objetivo.closest('[data-edificio-impacto]')) return
  limpiarImpacto(formulario)
  if (objetivo instanceof HTMLInputElement && objetivo.name === 'accion') {
    formulario
      .querySelector<HTMLElement>('[data-edificio-altura]')
      ?.toggleAttribute('hidden', objetivo.value !== 'altura')
  }
  if (objetivo instanceof HTMLSelectElement && objetivo.name === 'plazaCentro') {
    const plaza = vista.datos?.plazas.find((fila) => fila.id === objetivo.value)
    if (plaza) mapaAbierto?.centrarEn(plaza.coordinates)
  }
  if (
    objetivo instanceof HTMLInputElement &&
    (objetivo.name === 'lat' || objetivo.name === 'lng')
  ) {
    const resumen = formulario.querySelector<HTMLElement>('[data-edificio-elegido]')
    if (resumen) {
      resumen.textContent =
        'Coordenadas escritas a mano: no se comprueba que caigan dentro de un edificio hasta el build.'
    }
  }
}
