import controls from '../../styles/controls.module.css'
import { leerCoordenada } from './contorno.ts'
import { abrirEditor, cerrarEditor, mostrarProblemas } from './editor.ts'
import { texto } from './tipos.ts'
import { vista } from './vista.ts'

/**
 * Crear una plaza. **Sin fuente no se añade una plaza** (docs/DATOS.md): el formulario pide la procedencia como
 * campos obligatorios, no la rellena sola. Mismo patrón que Plaza Luna y Xenica: al menos una URL de fuente, una
 * frase de qué evidencia respalda la ubicación, la confianza que elige quien la crea, y `campo:AAAA-MM-DD`
 * solo si declara en una casilla que lo comprobó en el lugar.
 *
 * Nace inactiva y con un cuadrado provisional de 60 m alrededor del marcador; el contorno se ajusta después
 * con la sección Contorno de su formulario. En dos pasos, como cualquier escritura del panel:
 *
 *  1. "Ver lo que se guardará" pide al Worker el registro, sin guardar nada.
 *  2. "Crear plaza" lo manda a la PR. **Confirma exactamente lo que se vio**: cualquier cambio posterior en
 *     el formulario borra la vista y el botón.
 */

const RUTA = '/api/panel/contenido/plaza/nueva'

interface Cuerpo {
  nombre: string
  direccion: string
  googleMapsUri: string
  descripcionEs: string
  descripcionEn: string
  lat: number
  lng: number
  fuentes: string[]
  evidencia: string
  aportadoPorMi: boolean
  confianza: string
  proximamente: boolean
}

interface Respuesta {
  ok?: boolean
  pr?: { url: string; numero: number; creada: boolean } | null
  mensaje?: string
  problemas?: string[]
  resumen?: {
    id: string
    nombre: string
    estado: string
    confianza: string
    locationSource: string
    fuentes: string[]
    areaProvisional: number
    avisos: string[]
  }
}

const ESTADO = {
  uncertain: 'sin verificar',
  coming_soon: 'próximamente (confirmada y en construcción)',
} as const
const CONFIANZA = { low: 'baja', medium: 'media', high: 'alta' } as const

export function pintarPlazaNueva(): void {
  vista.modo = 'plazas'
  vista.formularioActual = {
    id: '',
    nombre: '',
    seleccion: [],
    fotos: [],
    sucio: false,
    consultaGiro: '',
  }
  abrirEditor(
    'Plazas',
    'Nueva plaza',
    `<form data-editor="plaza-nueva" novalidate>
      <section class="editor-seccion">
        <h3>Identidad</h3>
        <div class="editor-rejilla">
          <label class="campo-form campo-ancho">
            <span>Nombre</span>
            <input class="${controls.campo}" type="text" name="nombre" maxlength="120" required />
            <span class="ayuda">Da su dirección web: se escribe sola a partir del nombre.</span>
          </label>
          <label class="campo-form campo-ancho">
            <span>Dirección <span class="ayuda">si la conoces</span></span>
            <input class="${controls.campo}" type="text" name="direccion" maxlength="200" />
          </label>
          <label class="campo-form campo-ancho">
            <span>Enlace de Google Maps <span class="ayuda">si lo tienes</span></span>
            <input class="${controls.campo}" type="url" name="googleMapsUri" placeholder="https://maps.app.goo.gl/…" />
          </label>
        </div>
      </section>

      <section class="editor-seccion">
        <h3>Descripción</h3>
        <p class="ayuda">Opcional. Si no la escribes, queda sin descripción: no se inventa una.</p>
        <div class="editor-rejilla">
          <label class="campo-form campo-ancho"><span>Español</span><textarea class="${controls.campo} ${controls.areaTexto}" name="descripcionEs" rows="2" maxlength="600"></textarea></label>
          <label class="campo-form campo-ancho"><span>Inglés</span><textarea class="${controls.campo} ${controls.areaTexto}" name="descripcionEn" rows="2" maxlength="600"></textarea></label>
        </div>
      </section>

      <section class="editor-seccion">
        <h3>Ubicación</h3>
        <div class="editor-rejilla">
          <label class="campo-form"><span>Latitud</span><input class="${controls.campo}" type="text" inputmode="decimal" autocomplete="off" name="lat" required /></label>
          <label class="campo-form"><span>Longitud</span><input class="${controls.campo}" type="text" inputmode="decimal" autocomplete="off" name="lng" required /></label>
        </div>
        <p class="ayuda">El punto donde se dibujará el nombre de la plaza, en grados y con punto decimal. En Google Maps: pulsa con el botón derecho sobre el sitio y copia las coordenadas. Tiene que caer dentro de Zibatá y no sobre otra plaza.</p>
      </section>

      <section class="editor-seccion">
        <h3>De dónde sale la ubicación</h3>
        <p class="ayuda">Obligatorio: sin una fuente verificable no se añade una plaza.</p>
        <div class="editor-rejilla">
          <label class="campo-form campo-ancho">
            <span>Fuentes <span class="ayuda">una URL por línea</span></span>
            <textarea class="${controls.campo} ${controls.areaTexto}" name="fuentes" rows="3" placeholder="https://…" required></textarea>
            <span class="ayuda">Un enlace de Google Maps, OpenStreetMap, el sitio del desarrollo o el de la propia plaza.</span>
          </label>
          <label class="campo-form campo-ancho">
            <span>Qué evidencia respalda la ubicación</span>
            <textarea class="${controls.campo} ${controls.areaTexto}" name="evidencia" rows="2" maxlength="400" required></textarea>
            <span class="ayuda">Una frase. Por ejemplo: "Punto del enlace de Google Maps de un local de la plaza, que me pasó el dueño". Se guarda tal cual.</span>
          </label>
          <div class="campo-form campo-ancho">
            <span>Verificación en el lugar</span>
            <label class="casilla"><input type="checkbox" name="aportadoPorMi" /><span>Lo comprobé yo en el lugar</span></label>
            <span class="ayuda">Si la marcas se anota "campo:" con la fecha de hoy, que afirma esa verificación. Si no la marcas, no se afirma.</span>
          </div>
          <label class="campo-form">
            <span>Confianza en la ubicación</span>
            <select class="${controls.campo}" name="confianza">
              <option value="low" selected>Baja: aproximada</option>
              <option value="medium">Media: de un enlace o un plano</option>
              <option value="high">Alta: comprobada</option>
            </select>
          </label>
        </div>
      </section>

      <section class="editor-seccion">
        <h3>Estado</h3>
        <div class="campo-form">
          <label class="casilla"><input type="checkbox" name="proximamente" /><span>Plaza confirmada y en construcción (Próximamente)</span></label>
          <span class="ayuda">Una plaza nueva <strong>nace inactiva</strong>: sin página, sin su nombre en el mapa y fuera del sitemap hasta que la actives. <strong>Pero su contorno sí se dibuja en el mapa público</strong>, en gris y sin interacción: los edificios que haya dentro o, si no hay ninguno, un volumen generado a partir de un cuadrado provisional de 60 m alrededor del marcador. Se ajusta en su formulario, en la sección Contorno.</span>
        </div>
      </section>

      <div data-plaza-nueva-impacto></div>

      <footer class="editor-pie">
        <div class="problemas" data-problemas role="alert"></div>
        <div class="acciones">
          <button type="submit" class="${controls.base} ${controls.boton} ${controls.secundario}">Ver lo que se guardará</button>
          <button type="button" class="${controls.base} ${controls.boton} ${controls.secundario}" data-cancelar>Cancelar</button>
        </div>
      </footer>
    </form>`,
  )
}

/** Lo escrito en el formulario, leído. `null` más los problemas si algo no se puede leer. */
function leer(formulario: HTMLFormElement): { cuerpo: Cuerpo | null; problemas: string[] } {
  const campo = (nombre: string) =>
    (formulario.elements.namedItem(nombre) as HTMLInputElement | HTMLTextAreaElement | null)
      ?.value ?? ''
  const marca = (nombre: string) =>
    (formulario.elements.namedItem(nombre) as HTMLInputElement | null)?.checked ?? false
  const lat = leerCoordenada(campo('lat'))
  const lng = leerCoordenada(campo('lng'))
  const problemas: string[] = []
  if (lat === null) problemas.push('lat: Escribe la latitud como número, por ejemplo 20.69.')
  if (lng === null) problemas.push('lng: Escribe la longitud como número, por ejemplo -100.35.')
  if (problemas.length > 0 || lat === null || lng === null) return { cuerpo: null, problemas }
  return {
    problemas,
    cuerpo: {
      nombre: campo('nombre'),
      direccion: campo('direccion'),
      googleMapsUri: campo('googleMapsUri'),
      descripcionEs: campo('descripcionEs'),
      descripcionEn: campo('descripcionEn'),
      lat,
      lng,
      // Una URL por línea; también se aceptan comas o espacios entre ellas.
      fuentes: campo('fuentes')
        .split(/[\s,]+/)
        .map((fuente) => fuente.trim())
        .filter(Boolean),
      evidencia: campo('evidencia'),
      aportadoPorMi: marca('aportadoPorMi'),
      confianza: campo('confianza'),
      proximamente: marca('proximamente'),
    },
  }
}

async function llamar(
  formulario: HTMLFormElement,
  cuerpo: Cuerpo & { confirmar?: boolean },
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
        resultado?.problemas?.length ? resultado.problemas : ['No se pudo crear la plaza.'],
      )
      return null
    }
    return resultado
  } catch {
    mostrarProblemas(formulario, ['No se pudo hablar con el servidor.'])
    return null
  }
}

const zonaImpacto = (formulario: HTMLFormElement) =>
  formulario.querySelector<HTMLElement>('[data-plaza-nueva-impacto]')

/** Primer paso: lo que se guardaría, sin guardar nada. */
async function pedirImpacto(formulario: HTMLFormElement): Promise<void> {
  if (vista.guardando) return
  mostrarProblemas(formulario, [])
  const { cuerpo, problemas } = leer(formulario)
  if (!cuerpo) {
    mostrarProblemas(formulario, problemas)
    return
  }
  const resultado = await llamar(formulario, cuerpo)
  const resumen = resultado?.resumen
  const zona = zonaImpacto(formulario)
  if (!resumen || !zona) return
  const ahora = leer(formulario).cuerpo
  // Mientras llegaba la respuesta pudo cambiarse algo: ese resultado ya no corresponde.
  if (!ahora || JSON.stringify(ahora) !== JSON.stringify(cuerpo)) return
  zona.innerHTML = `<section class="editor-seccion impacto-borrado" aria-labelledby="titulo-plaza-nueva" tabindex="-1" data-firma="${texto(JSON.stringify(cuerpo))}">
      <h3 id="titulo-plaza-nueva">Se creará la plaza "${texto(resumen.nombre)}"</h3>
      <ul class="impacto-lista">
        <li>Dirección web: <code>${texto(resumen.id)}</code> (no existe hasta que se active).</li>
        <li>Estado: inactiva, ${texto(ESTADO[resumen.estado as keyof typeof ESTADO] ?? resumen.estado)}. Confianza ${texto(CONFIANZA[resumen.confianza as keyof typeof CONFIANZA] ?? resumen.confianza)}.</li>
        <li>Procedencia de la ubicación, tal como se guardará: <em>${texto(resumen.locationSource)}</em></li>
        <li>Fuentes: ${resumen.fuentes.map((fuente) => `<code>${texto(fuente)}</code>`).join(', ')}.</li>
      </ul>
      <ul class="impacto-lista">${resumen.avisos.map((aviso) => `<li>${texto(aviso)}</li>`).join('')}</ul>
      <div class="acciones">
        <button type="button" class="${controls.base} ${controls.boton} ${controls.principal}" data-confirmar-plaza-nueva>Crear plaza</button>
        <button type="button" class="${controls.base} ${controls.boton} ${controls.secundario}" data-cancelar-plaza-nueva>Mejor no</button>
      </div>
    </section>`
  zona.querySelector<HTMLElement>('section')?.focus()
}

/** Segundo paso: va a la PR. Lo que se confirma es lo que se vio, no lo que haya ahora en los campos. */
async function confirmar(
  formulario: HTMLFormElement,
  recargar: () => Promise<void>,
): Promise<void> {
  const zona = zonaImpacto(formulario)
  const firma = zona?.querySelector<HTMLElement>('[data-firma]')?.dataset.firma
  if (!zona || !firma || vista.guardando) return
  let cuerpo: Cuerpo
  try {
    cuerpo = JSON.parse(firma) as Cuerpo
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
      ? `${resultado.mensaje ?? 'Plaza creada.'} ${resultado.pr.creada ? 'PR abierta' : 'Añadido a la PR'} #${resultado.pr.numero}.`
      : (resultado.mensaje ?? 'Validada en desarrollo. No se commitea.')
    vista.modo = 'plazas'
    cerrarEditor(true)
    await recargar()
  } finally {
    vista.guardando = false
    for (const boton of botones) boton.disabled = false
  }
}

/** Enviar el formulario (Intro incluido) pide lo que se guardaría; guardar es otro botón. */
export function enviarPlazaNueva(formulario: HTMLFormElement): void {
  void pedirImpacto(formulario)
}

/** Los botones del impacto. Devuelve si lo atendió. */
export function alPulsarPlazaNueva(objetivo: HTMLElement, recargar: () => Promise<void>): boolean {
  const formulario = objetivo.closest<HTMLFormElement>('form[data-editor="plaza-nueva"]')
  if (!formulario) return false
  if (objetivo.closest('[data-confirmar-plaza-nueva]')) {
    void confirmar(formulario, recargar)
    return true
  }
  if (objetivo.closest('[data-cancelar-plaza-nueva]')) {
    const zona = zonaImpacto(formulario)
    if (zona) zona.innerHTML = ''
    return true
  }
  return false
}

/** Cualquier cambio en el formulario borra lo que se enseñó: no se puede confirmar algo que ya no es lo escrito. */
export function alCambiarPlazaNueva(objetivo: HTMLElement): void {
  const formulario = objetivo.closest<HTMLFormElement>('form[data-editor="plaza-nueva"]')
  if (!formulario || objetivo.closest('[data-plaza-nueva-impacto]')) return
  const zona = zonaImpacto(formulario)
  if (zona && zona.innerHTML !== '') zona.innerHTML = ''
}
