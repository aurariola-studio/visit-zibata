import controls from '../styles/controls.module.css'
import { numero, plural, texto } from './contenido/tipos.ts'

/**
 * La PR del panel a la vista, dentro del Resumen: en qué estado está, qué contiene y cómo deshacer lo último.
 *
 * Es la cara de `worker/pr.ts`. Ver no pide nada especial; retirar el último cambio y descartar la PR van en
 * dos pasos, enseñando lo que se pierde antes de confirmar. "Retirar" manda la cabeza de la rama que se vio y el
 * Worker rechaza si cambió entre medias.
 */

const RUTA = '/api/panel/contenido/pr'

type Estado =
  | 'verde'
  | 'rojo'
  | 'pendiente'
  | 'conflictos'
  | 'desactualizada'
  | 'calculando'
  | 'sin-clasificar'

interface Cambio {
  sha: string
  mensaje: string
  fecha: string
  delPanel: boolean
}

interface Vista {
  numero: number
  url: string
  titulo: string
  estado: Estado
  estadoDeGithub: string | null
  cabeza: string
  cambios: Cambio[]
  checks: null | {
    correctos: number
    pendientes: number
    fallidos: { nombre: string; url: string | null }[]
  }
}

interface Pierde {
  mensaje: string
  archivos: string[]
  conFoto: boolean
}

interface Respuesta {
  ok?: boolean
  seco?: boolean
  pr?: Vista | null
  problemas?: string[]
  mensaje?: string
  pierde?: Pierde
  cambios?: number
}

const RASGOS: Record<Estado, { marca: 'si' | 'no' | 'cierre'; rotulo: string }> = {
  verde: { marca: 'si', rotulo: 'En verde' },
  rojo: { marca: 'no', rotulo: 'Falló' },
  pendiente: { marca: 'cierre', rotulo: 'En marcha' },
  conflictos: { marca: 'no', rotulo: 'Con conflictos' },
  desactualizada: { marca: 'cierre', rotulo: 'Detrás de main' },
  calculando: { marca: 'cierre', rotulo: 'Calculando' },
  'sin-clasificar': { marca: 'cierre', rotulo: 'Sin clasificar' },
}

function fraseDe(pr: Vista): string {
  switch (pr.estado) {
    case 'verde':
      return 'Todos los checks pasaron: se puede fusionar.'
    case 'rojo':
      return 'Algún check falló. La PR no se puede fusionar así: corrige lo que falló desde el panel, o retira el último cambio si fue ese.'
    case 'pendiente':
      return 'El CI sigue corriendo. Espera a que termine antes de fusionar.'
    case 'conflictos':
      return 'Choca con main (alguien cambió lo mismo). Hay que resolverlo en GitHub: el panel no puede.'
    case 'desactualizada':
      return 'Está detrás de main. GitHub puede actualizarla desde su página.'
    case 'calculando':
      return 'GitHub todavía está calculando si se puede fusionar. Recarga en unos segundos.'
    default:
      return `GitHub la marca como "${pr.estadoDeGithub ?? 'desconocido'}" y el panel no sabe leerlo. Ábrela para ver el motivo.`
  }
}

const formatoFecha = new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Mexico_City',
})

function cuandoDe(fecha: string): string {
  const momento = new Date(fecha)
  return Number.isNaN(momento.getTime()) ? '' : formatoFecha.format(momento)
}

function pintar(zona: HTMLElement, pr: Vista): void {
  const rasgo = RASGOS[pr.estado]
  const fallidos = pr.checks?.fallidos ?? []
  const detalleDeChecks = pr.checks
    ? `<p class="ayuda">${numero(pr.checks.correctos)} ${pr.checks.correctos === 1 ? 'check correcto' : 'checks correctos'}${pr.checks.pendientes > 0 ? `, ${numero(pr.checks.pendientes)} en marcha` : ''}${fallidos.length > 0 ? `, ${numero(fallidos.length)} ${fallidos.length === 1 ? 'fallido' : 'fallidos'}` : ''}.</p>
      ${
        fallidos.length > 0
          ? `<ul class="impacto-lista">${fallidos
              .map(
                (fallo) =>
                  `<li>${fallo.url?.startsWith('https://') ? `<a class="${controls.enlace ?? ''}" href="${texto(fallo.url)}" target="_blank" rel="noopener noreferrer">${texto(fallo.nombre)}</a>` : texto(fallo.nombre)}</li>`,
              )
              .join('')}</ul>`
          : ''
      }`
    : '<p class="ayuda">Para ver qué check falla y cuáles siguen en marcha, el token de GitHub necesita el permiso "Checks: lectura".</p>'

  const cambios = pr.cambios
    .map(
      (cambio, indice) =>
        `<li>${texto(cambio.mensaje)}${cambio.fecha ? ` <span class="ayuda">${texto(cuandoDe(cambio.fecha))}</span>` : ''}${indice === 0 ? ' <span class="ayuda">(el último)</span>' : ''}</li>`,
    )
    .join('')

  const ultimo = pr.cambios[0]
  const puedeRetirar = pr.cambios.length > 1 && ultimo?.delPanel === true
  const motivoSinRetirar =
    pr.cambios.length <= 1
      ? 'Es el único cambio: para quitarlo usa "Descartar la PR".'
      : 'El último commit no lo hizo el panel: no se retira desde aquí.'

  zona.innerHTML = `<section class="editor-seccion impacto-borrado" aria-labelledby="titulo-pr">
      <h3 id="titulo-pr">PR #${numero(pr.numero)} <span class="marca-estado" data-activo="${rasgo.marca}">${rasgo.rotulo}</span></h3>
      <p>${texto(fraseDe(pr))}</p>
      ${detalleDeChecks}
      <p class="ayuda">${plural(pr.cambios.length, 'cambio', 'cambios')} esperando fusionarse, del más reciente al más viejo:</p>
      <ul class="impacto-lista">${cambios}</ul>
      <div class="acciones">
        <button type="button" class="${controls.base} ${controls.boton} ${controls.secundario}" data-pr-retirar${puedeRetirar ? '' : ' disabled'}>Retirar el último cambio</button>
        <button type="button" class="${controls.base} ${controls.boton} ${controls.secundario}" data-pr-descartar>Descartar la PR</button>
      </div>
      ${puedeRetirar ? '' : `<p class="ayuda">${texto(motivoSinRetirar)}</p>`}
      <p class="ayuda">Un cambio del medio no se retira con un botón: se corrige editándolo otra vez desde el panel.</p>
      <div data-pr-impacto role="status"></div>
    </section>`
}

async function llamar(
  ruta: string,
  cuerpo: Record<string, unknown> | null,
): Promise<{ respuesta: Respuesta | null; estado: number }> {
  try {
    const respuesta = await fetch(ruta, {
      method: cuerpo ? 'POST' : 'GET',
      ...(cuerpo
        ? { headers: { 'content-type': 'application/json' }, body: JSON.stringify(cuerpo) }
        : {}),
    })
    return {
      respuesta: (await respuesta.json().catch(() => null)) as Respuesta | null,
      estado: respuesta.status,
    }
  } catch {
    return { respuesta: null, estado: 0 }
  }
}

const zonaImpacto = (zona: HTMLElement) => zona.querySelector<HTMLElement>('[data-pr-impacto]')

function avisar(zona: HTMLElement, mensajes: string[]): void {
  const caja = zonaImpacto(zona)
  if (caja)
    caja.innerHTML = mensajes.map((mensaje) => `<p role="alert">${texto(mensaje)}</p>`).join('')
}

function problemasDe(estado: number, respuesta: Respuesta | null): string[] {
  if (estado === 403) return ['Sin permiso. Revisa la regla de Access.']
  if (estado === 0) return ['No se pudo hablar con el servidor.']
  return respuesta?.problemas?.length ? respuesta.problemas : ['No se pudo completar.']
}

/** Primer paso de retirar: lo que se perdería. */
async function pedirRetirar(zona: HTMLElement, vista: Vista): Promise<void> {
  const { respuesta, estado } = await llamar(`${RUTA}/retirar`, { cabeza: vista.cabeza })
  if (!respuesta?.ok || !respuesta.pierde) return avisar(zona, problemasDe(estado, respuesta))
  const { pierde } = respuesta
  const caja = zonaImpacto(zona)
  if (!caja) return
  caja.innerHTML = `<div class="editor-seccion" data-cabeza="${texto(vista.cabeza)}">
      <h3>Se retiraría: ${texto(pierde.mensaje)}</h3>
      <ul class="impacto-lista">
        <li>Archivos que dejan de cambiar: ${pierde.archivos.map((ruta) => `<code>${texto(ruta)}</code>`).join(', ') || 'ninguno'}.</li>
        ${pierde.conFoto ? '<li>Este cambio sube una foto: se va con él.</li>' : ''}
        <li>La PR sigue abierta con los demás cambios. Lo retirado queda en el historial de git.</li>
      </ul>
      <div class="acciones">
        <button type="button" class="${controls.base} ${controls.boton} ${controls.principal}" data-pr-confirmar-retirar>Retirar este cambio</button>
        <button type="button" class="${controls.base} ${controls.boton} ${controls.secundario}" data-pr-cancelar>Mejor no</button>
      </div>
    </div>`
}

async function pedirDescartar(zona: HTMLElement, vista: Vista): Promise<void> {
  const { respuesta, estado } = await llamar(`${RUTA}/descartar`, { numero: vista.numero })
  if (!respuesta?.ok) return avisar(zona, problemasDe(estado, respuesta))
  const caja = zonaImpacto(zona)
  if (!caja) return
  caja.innerHTML = `<div class="editor-seccion" data-numero="${vista.numero}">
      <h3>Se cerraría la PR #${numero(vista.numero)}</h3>
      <ul class="impacto-lista">
        <li>Se descartan ${plural(respuesta.cambios ?? vista.cambios.length, 'cambio', 'cambios')}: dejan de esperar fusión.</li>
        <li>La guía publicada no cambia. Los commits siguen en la PR cerrada, por si hay que recuperarlos.</li>
        <li>El siguiente guardado del panel empieza de cero desde main.</li>
      </ul>
      <div class="acciones">
        <button type="button" class="${controls.base} ${controls.boton} ${controls.principal}" data-pr-confirmar-descartar>Cerrar la PR</button>
        <button type="button" class="${controls.base} ${controls.boton} ${controls.secundario}" data-pr-cancelar>Mejor no</button>
      </div>
    </div>`
}

/**
 * Pinta la tarjeta de la PR en `zona` y atiende sus botones. `alCambiar` se llama cuando la PR cambió (se retiró
 * un cambio o se cerró), para que el resumen vuelva a leer su estado.
 */
export async function montarPr(zona: HTMLElement, alCambiar: () => void): Promise<void> {
  const { respuesta, estado } = await llamar(RUTA, null)
  if (!respuesta?.ok) {
    zona.innerHTML = `<p class="ayuda">${texto(problemasDe(estado, respuesta).join(' '))}</p>`
    return
  }
  const pr = respuesta.pr
  if (!pr) {
    zona.innerHTML = ''
    return
  }
  pintar(zona, pr)
  // Un solo manejador por zona, y con la PR que se acaba de pintar: `pintar` reescribe el interior.
  zona.onclick = (evento) => alPulsar(evento, zona, pr, alCambiar)
}

async function confirmar(
  zona: HTMLElement,
  ruta: string,
  cuerpo: Record<string, unknown>,
  alCambiar: () => void,
): Promise<void> {
  const botones = zona.querySelectorAll<HTMLButtonElement>('[data-pr-impacto] button')
  for (const boton of botones) boton.disabled = true
  const { respuesta, estado } = await llamar(ruta, { ...cuerpo, confirmar: true })
  if (!respuesta?.ok) {
    avisar(zona, problemasDe(estado, respuesta))
    return
  }
  alCambiar()
}

function alPulsar(evento: Event, zona: HTMLElement, pr: Vista, alCambiar: () => void): void {
  const objetivo = evento.target as HTMLElement | null
  if (!objetivo) return
  if (objetivo.closest('[data-pr-retirar]')) {
    void pedirRetirar(zona, pr)
    return
  }
  if (objetivo.closest('[data-pr-descartar]')) {
    void pedirDescartar(zona, pr)
    return
  }
  if (objetivo.closest('[data-pr-cancelar]')) {
    const caja = zonaImpacto(zona)
    if (caja) caja.innerHTML = ''
    return
  }
  if (objetivo.closest('[data-pr-confirmar-retirar]')) {
    const cabeza = zonaImpacto(zona)?.querySelector<HTMLElement>('[data-cabeza]')?.dataset.cabeza
    if (cabeza) void confirmar(zona, `${RUTA}/retirar`, { cabeza }, alCambiar)
    return
  }
  if (objetivo.closest('[data-pr-confirmar-descartar]')) {
    void confirmar(zona, `${RUTA}/descartar`, { numero: pr.numero }, alCambiar)
  }
}
