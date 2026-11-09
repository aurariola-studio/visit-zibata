import controls from '../../styles/controls.module.css'
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
    <p class="meta-contenido">Elegir un edificio en el mapa todavía no está disponible: por ahora aquí se ven y se quitan los ajustes. Cada cambio abre o añade una PR; el build comprueba contra los datos de edificios que cada ajuste cae en una sola huella, y si no, la PR no se puede fusionar.</p>`
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
        resultado?.problemas?.length ? resultado.problemas : ['No se pudo quitar el ajuste.'],
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
  const formulario = objetivo.closest<HTMLFormElement>('form[data-editor="edificio-quitar"]')
  if (!formulario) return false
  if (objetivo.closest('[data-confirmar-edificio]')) {
    void confirmar(formulario, recargar)
    return true
  }
  return false
}
