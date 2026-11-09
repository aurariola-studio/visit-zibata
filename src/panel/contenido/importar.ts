import { MENSAJE_NO_UTF8, noEsUtf8 } from '../../data/utf8.ts'
import controls from '../../styles/controls.module.css'
import { abrirEditor, cerrarEditor, mostrarProblemas } from './editor.ts'
import { numero, plural, texto } from './tipos.ts'
import { vista } from './vista.ts'

/**
 * Carga masiva de locales desde un CSV. En dos pasos, como cualquier escritura del panel:
 *
 *  1. "Ver lo que pasaría" manda el CSV al Worker, que pasa cada fila por las mismas reglas que el formulario
 *     y devuelve el resultado de cada una, sin guardar nada.
 *  2. "Importar" lo manda a la PR en un solo commit. **Confirma exactamente el archivo que se vio**: cualquier
 *     cambio posterior en el cuadro borra la vista y el botón.
 *
 * Todo o nada: si una fila falla no hay botón de importar. Cada fila declara su procedencia con sus columnas
 * `fuentes` y `comprobado`; aquí no hay una casilla para toda la tanda.
 */

const RUTA = '/api/panel/contenido/importar'

interface Fila {
  linea: number
  nombre: string
  ok: boolean
  nuevo: boolean
  problemas: string[]
  avisos: string[]
  afirma: string[]
}

interface Respuesta {
  ok?: boolean
  pr?: { url: string; numero: number; creada: boolean } | null
  mensaje?: string
  problemas?: string[]
  vista?: {
    listo: boolean
    filas: Fila[]
    creados: number
    actualizados: number
    columnasIgnoradas: string[]
  }
}

export function pintarImportar(): void {
  vista.modo = 'negocios'
  vista.formularioActual = {
    id: '',
    nombre: '',
    seleccion: [],
    fotos: [],
    sucio: false,
    consultaGiro: '',
  }
  abrirEditor(
    'Negocios',
    'Importar desde un CSV',
    `<form data-editor="importar" novalidate>
      <section class="editor-seccion">
        <h3>Archivo</h3>
        <p class="ayuda">Hasta 100 filas, con encabezados. Obligatorias: <code>name</code> y <code>plaza</code> (la plaza tiene que existir ya). Un local nuevo exige además <code>giros</code>, <code>description</code> y <code>descriptionEn</code>, <code>active</code> (sí) y su procedencia: <code>fuentes</code> (URL separadas por <code>;</code>) y/o <code>comprobado</code> (sí, si lo comprobaste tú en el lugar). Opcionales: <code>hours</code>, <code>lat</code>, <code>lng</code>, <code>googleMapsUri</code>, <code>website</code>, <code>instagram</code>, <code>facebook</code>, <code>tiktok</code>, <code>whatsapp</code>, <code>phone</code>, <code>rappi</code>, <code>uberEats</code>, <code>didiFood</code>, <code>confianza</code>.</p>
        <p class="ayuda">Un local que ya existe se actualiza (mismo nombre en la misma plaza, o su <code>id</code>): una columna vacía conserva lo que tiene, y un horario cambia solo los días que nombra. Es todo o nada: si una fila falla, no se importa ninguna.</p>
        <div class="campo-form campo-ancho">
          <label class="subir-foto ${controls.base} ${controls.boton} ${controls.secundario}">
            Elegir un archivo CSV
            <input class="visualmente" type="file" accept=".csv,text/csv" data-importar-archivo />
          </label>
        </div>
        <label class="campo-form campo-ancho">
          <span>O pega el contenido</span>
          <textarea class="${controls.campo} ${controls.areaTexto}" name="csv" rows="10" spellcheck="false" placeholder="name,plaza,giros,description,descriptionEn,active,fuentes,comprobado"></textarea>
        </label>
      </section>

      <div data-importar-vista></div>

      <footer class="editor-pie">
        <div class="problemas" data-problemas role="alert"></div>
        <div class="acciones">
          <button type="submit" class="${controls.base} ${controls.boton} ${controls.secundario}">Ver lo que pasaría</button>
          <button type="button" class="${controls.base} ${controls.boton} ${controls.secundario}" data-cancelar>Cancelar</button>
        </div>
      </footer>
    </form>`,
  )
}

const zonaVista = (formulario: HTMLFormElement) =>
  formulario.querySelector<HTMLElement>('[data-importar-vista]')

const leerCsv = (formulario: HTMLFormElement): string =>
  formulario.querySelector<HTMLTextAreaElement>('textarea[name="csv"]')?.value ?? ''

async function llamar(
  formulario: HTMLFormElement,
  csv: string,
  confirmar: boolean,
): Promise<Respuesta | null> {
  try {
    const respuesta = await fetch(RUTA, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ csv, ...(confirmar ? { confirmar: true } : {}) }),
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
    if (respuesta.status === 413) {
      mostrarProblemas(formulario, ['El archivo es demasiado grande. Pártelo en dos.'])
      return null
    }
    if (!respuesta.ok || !resultado?.ok) {
      mostrarProblemas(
        formulario,
        resultado?.problemas?.length ? resultado.problemas : ['No se pudo importar.'],
      )
      return null
    }
    return resultado
  } catch {
    mostrarProblemas(formulario, ['No se pudo hablar con el servidor.'])
    return null
  }
}

function filaHtml(fila: Fila): string {
  const estado = !fila.ok
    ? { marca: 'no', rotulo: 'Error' }
    : fila.nuevo
      ? { marca: 'si', rotulo: 'Nuevo' }
      : { marca: 'cierre', rotulo: 'Actualiza' }
  const detalle = [
    ...fila.problemas.map((problema) => `<li>${texto(problema)}</li>`),
    ...fila.avisos.map((aviso) => `<li>Aviso: ${texto(aviso)}</li>`),
    ...fila.afirma.map((afirma) => `<li>Afirma ${texto(afirma)}</li>`),
  ].join('')
  return `<tr>
    <td class="cifra">${numero(fila.linea)}</td>
    <td class="celda-nombre"><span class="negocio-nombre">${texto(fila.nombre || '(sin nombre)')}</span></td>
    <td class="celda-estado"><span class="marca-estado" data-activo="${estado.marca}">${estado.rotulo}</span></td>
    <td>${detalle ? `<ul class="impacto-lista">${detalle}</ul>` : ''}</td>
  </tr>`
}

/** Primer paso: lo que pasaría con cada fila, sin guardar nada. */
async function pedirVista(formulario: HTMLFormElement): Promise<void> {
  if (vista.guardando) return
  mostrarProblemas(formulario, [])
  const csv = leerCsv(formulario)
  if (!csv.trim()) {
    mostrarProblemas(formulario, ['csv: Elige un archivo o pega su contenido.'])
    return
  }
  const resultado = await llamar(formulario, csv, false)
  const datos = resultado?.vista
  const zona = zonaVista(formulario)
  if (!datos || !zona) return
  // Mientras llegaba la respuesta pudo cambiarse el cuadro: esa vista ya no corresponde.
  if (leerCsv(formulario) !== csv) return

  const malas = datos.filas.filter((fila) => !fila.ok).length
  const titulo = datos.listo
    ? `Se importarían ${plural(datos.filas.length, 'fila', 'filas')}: ${numero(datos.creados)} ${datos.creados === 1 ? 'nuevo' : 'nuevos'} y ${numero(datos.actualizados)} ${datos.actualizados === 1 ? 'actualizado' : 'actualizados'}`
    : `${plural(malas, 'fila tiene', 'filas tienen')} errores: no se importa nada`
  const ignoradas = datos.columnasIgnoradas.length
    ? `<p class="ayuda">Columnas que no se conocen y se ignoran: ${datos.columnasIgnoradas.map((c) => `<code>${texto(c)}</code>`).join(', ')}.</p>`
    : ''
  zona.innerHTML = `<section class="editor-seccion impacto-borrado" aria-labelledby="titulo-importar" tabindex="-1" data-firma="${texto(csv)}">
      <h3 id="titulo-importar">${titulo}</h3>
      ${ignoradas}
      <div class="tabla"><table>
        <thead><tr>
          <th class="cifra">Fila</th>
          <th>Local</th>
          <th>Resultado</th>
          <th>Detalle</th>
        </tr></thead>
        <tbody>${datos.filas.map(filaHtml).join('')}</tbody>
      </table></div>
      <div class="acciones">
        ${datos.listo ? `<button type="button" class="${controls.base} ${controls.boton} ${controls.principal}" data-confirmar-importar>Importar ${plural(datos.filas.length, 'local', 'locales')}</button>` : ''}
        <button type="button" class="${controls.base} ${controls.boton} ${controls.secundario}" data-cancelar-importar>${datos.listo ? 'Mejor no' : 'Cerrar vista'}</button>
      </div>
    </section>`
  zona.querySelector<HTMLElement>('section')?.focus()
}

/** Segundo paso: va a la PR. Lo que se confirma es el archivo que se vio. */
async function confirmar(
  formulario: HTMLFormElement,
  recargar: () => Promise<void>,
): Promise<void> {
  const zona = zonaVista(formulario)
  const csv = zona?.querySelector<HTMLElement>('[data-firma]')?.dataset.firma
  if (!zona || !csv || vista.guardando) return
  mostrarProblemas(formulario, [])
  const botones = zona.querySelectorAll<HTMLButtonElement>('button')
  for (const boton of botones) boton.disabled = true
  vista.guardando = true
  try {
    const resultado = await llamar(formulario, csv, true)
    if (!resultado) return
    vista.aviso = resultado.pr
      ? `${resultado.mensaje ?? 'Importación enviada.'} ${resultado.pr.creada ? 'PR abierta' : 'Añadido a la PR'} #${resultado.pr.numero}.`
      : (resultado.mensaje ?? 'Validada en desarrollo. No se commitea.')
    vista.modo = 'negocios'
    if (vista.formularioActual) vista.formularioActual.sucio = false
    cerrarEditor(true)
    await recargar()
  } finally {
    vista.guardando = false
    for (const boton of botones) boton.disabled = false
  }
}

export function enviarImportar(formulario: HTMLFormElement): void {
  void pedirVista(formulario)
}

/** Los botones de la vista. Devuelve si lo atendió. */
export function alPulsarImportar(objetivo: HTMLElement, recargar: () => Promise<void>): boolean {
  const formulario = objetivo.closest<HTMLFormElement>('form[data-editor="importar"]')
  if (!formulario) return false
  if (objetivo.closest('[data-confirmar-importar]')) {
    void confirmar(formulario, recargar)
    return true
  }
  if (objetivo.closest('[data-cancelar-importar]')) {
    const zona = zonaVista(formulario)
    if (zona) zona.innerHTML = ''
    return true
  }
  return false
}

/** Cualquier cambio en el cuadro borra lo que se enseñó: no se puede confirmar algo que ya no es lo escrito. */
export function alCambiarImportar(objetivo: HTMLElement): void {
  const formulario = objetivo.closest<HTMLFormElement>('form[data-editor="importar"]')
  if (!formulario || objetivo.closest('[data-importar-vista]')) return
  if (objetivo.matches('[data-importar-archivo]')) {
    const archivo = (objetivo as HTMLInputElement).files?.[0]
    const cuadro = formulario.querySelector<HTMLTextAreaElement>('textarea[name="csv"]')
    if (archivo && cuadro) {
      void archivo.text().then((contenido) => {
        if (noEsUtf8(contenido)) {
          mostrarProblemas(formulario, [MENSAJE_NO_UTF8])
          return
        }
        mostrarProblemas(formulario, [])
        cuadro.value = contenido
        const zona = zonaVista(formulario)
        if (zona) zona.innerHTML = ''
        if (vista.formularioActual) vista.formularioActual.sucio = true
      })
    }
    return
  }
  const zona = zonaVista(formulario)
  if (zona && zona.innerHTML !== '') zona.innerHTML = ''
  if (vista.formularioActual) vista.formularioActual.sucio = true
}
