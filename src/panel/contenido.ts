/**
 * El editor de contenido del panel: negocios, categorías y giros de la guía.
 *
 * Es TypeScript sin framework, igual que el resto del panel. La página importa el mismo paquete de
 * controles que la guía, y aquí solo se compone: los campos, los botones y los estados salen del
 * catálogo, no se dibujan otra vez.
 *
 * Este módulo monta la vista, carga los datos y reparte los eventos. Cada entidad vive en su archivo
 * de `contenido/`: `negocios`, `categorias` y `fotos` pintan y leen sus formularios; `editor` tiene
 * el diálogo y los avisos de campo; `vista` guarda el estado compartido; `tipos` los datos y los
 * ayudantes sin estado.
 *
 * La lista es una tabla con búsqueda y páginas; el formulario se abre en el diálogo de
 * `panel.html` y guarda con un pie fijo, para que la acción no se pierda al bajar por el horario.
 *
 * Lo que se guarda no va a producción: el Worker valida y manda el cambio a una rama con PR. El
 * panel enseña el enlace de esa PR en el rail. En desarrollo, sin testigo de GitHub, valida y avisa
 * de que no se commitea, para poder probar el formulario sin credenciales.
 *
 * Las categorías no se editan aisladas: sus giros los usan los locales, los filtros se ordenan por
 * `order` y las plazas guardan una lista derivada. El formulario enseña a cuántos locales afecta
 * antes de guardar.
 */
import controls from '../styles/controls.module.css'
import { alPulsarBorrarGiro } from './contenido/borrar-giro.ts'
import {
  alCambiarCategoria,
  alEscribirCategoria,
  alPulsarCategoria,
  enviarCategoria,
  pintarCategoria,
  pintarCategorias,
  pintarZonaCategorias,
} from './contenido/categorias.ts'
import {
  alEscribirContorno,
  alPulsarContorno,
  alTeclearContorno,
  olvidarContorno,
} from './contenido/contorno.ts'
import {
  alCambiarDireccion,
  alEscribirDireccion,
  alPulsarDireccion,
  alTeclearDireccion,
} from './contenido/direccion.ts'
import { alPulsarEdificio, pintarEdificios, pintarQuitarEdificio } from './contenido/edificios.ts'
import { cerrarEditor, limpiarErrorDe } from './contenido/editor.ts'
import { alCambiarFoto, alEscribirFoto, alPulsarFoto } from './contenido/fotos.ts'
import {
  alCambiarImportar,
  alPulsarImportar,
  enviarImportar,
  pintarImportar,
} from './contenido/importar.ts'
import {
  actualizarContadores,
  alCambiarNegocio,
  alEscribirNegocio,
  alPulsarNegocio,
  enviarNegocio,
  pintarFormulario,
  pintarNegocios,
  pintarZonaNegocios,
} from './contenido/negocios.ts'
import {
  alCambiarPlazaNueva,
  alPulsarPlazaNueva,
  enviarPlazaNueva,
  pintarPlazaNueva,
} from './contenido/plaza-nueva.ts'
import {
  alCambiarPlaza,
  alPulsarPlaza,
  enviarPlaza,
  pintarPlaza,
  pintarPlazas,
} from './contenido/plazas.ts'
import type { Datos, EstadoContenido, ModoContenido } from './contenido/tipos.ts'
import { texto } from './contenido/tipos.ts'
import { vista } from './contenido/vista.ts'

export type { EstadoContenido, ModoContenido }

/** Monta el editor entre el contenedor de la vista y el diálogo que ya están en `panel.html`. */
export function montarContenido(
  contenedor: HTMLElement,
  editor: HTMLDialogElement,
  alCambiarEstado: (estado: EstadoContenido | null, error?: string | null) => void,
): void {
  vista.raiz = contenedor
  vista.dialogo = editor
  vista.avisarEstado = alCambiarEstado

  const cerrar = vista.dialogo.querySelector<HTMLElement>('[data-editor-cerrar]')
  if (cerrar) {
    cerrar.className = `editor-cerrar ${controls.base} ${controls.boton} ${controls.fantasma}`
  }

  contenedor.addEventListener('click', alPulsar)
  contenedor.addEventListener('input', alEscribir)
  contenedor.addEventListener('change', alFiltrar)
  editor.addEventListener('submit', alEnviar)
  editor.addEventListener('click', alPulsarEditor)
  editor.addEventListener('input', alEscribirEditor)
  editor.addEventListener('keydown', alTeclearDireccion)
  editor.addEventListener('keydown', alTeclearContorno)
  editor.addEventListener('change', alCambiarEditor)
  // Escape con cambios sin guardar: primero se pregunta. Se frena la tecla y no el evento `cancel`,
  // porque el navegador deja de permitir cancelarlo si no hubo un clic o una tecla de activación entre
  // dos Escape seguidos, y el formulario se cerraría sin avisar. `cancel` queda como red para otras
  // salidas (el botón atrás de Android).
  editor.addEventListener('keydown', (evento) => {
    if (evento.key !== 'Escape' || !vista.formularioActual?.sucio) return
    evento.preventDefault()
    cerrarEditor()
  })
  editor.addEventListener('cancel', (evento) => {
    if (!vista.formularioActual?.sucio) return
    evento.preventDefault()
    cerrarEditor()
  })
  // Al cerrar, el foco vuelve a la vista y el formulario deja de existir.
  editor.addEventListener('close', () => {
    vista.formularioActual = null
    olvidarContorno()
    contenedor.focus({ preventScroll: true })
  })

  void cargar()
}

/** La vista de contenido se acaba de abrir. */
export function mostrarContenido(cual: ModoContenido): void {
  vista.visible = true
  if (vista.modo !== cual) {
    vista.modo = cual
    vista.consulta = ''
    vista.filtroEstado = ''
    vista.filtroPlaza = ''
    vista.pagina = 0
    vista.aviso = null
  }
  pintarLista()
  if (!vista.datos && !vista.cargando) void cargar()
}

/** Vuelve a leer el contenido y el estado de la rama (la PR cambió: se retiró un cambio o se cerró). */
export function recargarContenido(): void {
  void cargar()
}

/** Carga el contenido sin pintarlo: el resumen necesita saber si hay una PR esperando revisión. */
export function precargarContenido(): void {
  if (!vista.datos && !vista.cargando) void cargar()
}

/** Se cambió a otra sección del panel: el diálogo no puede quedarse abierto encima. */
export function ocultarContenido(): void {
  vista.visible = false
  if (vista.dialogo?.open) cerrarEditor(true)
}

function estadoDeLaRama(): EstadoContenido | null {
  if (!vista.datos) return null
  return { seco: vista.datos.seco, pr: vista.datos.pr }
}

async function cargar(): Promise<void> {
  if (vista.cargando) return
  vista.cargando = true
  vista.error = null
  if (vista.visible) pintarLista()
  try {
    const respuesta = await fetch('/api/panel/contenido')
    if (respuesta.status === 403) {
      throw new Error('Sin permiso. Revisa la regla de Cloudflare Access de /api/panel.')
    }
    if (respuesta.status === 503) throw new Error('El Worker no tiene configurado GITHUB_TOKEN.')
    if (!respuesta.ok) throw new Error(`El servidor respondió ${respuesta.status}.`)
    vista.datos = (await respuesta.json()) as Datos
    vista.avisarEstado?.(estadoDeLaRama())
  } catch (causa) {
    vista.error = causa instanceof Error ? causa.message : 'No se pudo cargar el contenido.'
    vista.avisarEstado?.(null, vista.error)
  } finally {
    vista.cargando = false
    if (vista.visible) pintarLista()
  }
}

function pintarLista(): void {
  if (!vista.raiz) return
  if (vista.error) {
    vista.raiz.innerHTML = `<p class="estado">${texto(vista.error)}</p>`
    vista.raiz.setAttribute('aria-busy', 'false')
    return
  }
  if (!vista.datos) {
    vista.raiz.innerHTML = '<p class="estado">Cargando contenido…</p>'
    vista.raiz.setAttribute('aria-busy', 'true')
    return
  }
  vista.raiz.setAttribute('aria-busy', 'false')
  if (vista.modo === 'categorias') pintarCategorias()
  else if (vista.modo === 'plazas') pintarPlazas()
  else if (vista.modo === 'edificios') pintarEdificios()
  else pintarNegocios()
}

async function alEnviar(evento: Event): Promise<void> {
  const formulario = (evento.target as HTMLElement | null)?.closest<HTMLFormElement>(
    'form[data-editor]',
  )
  if (!formulario) return
  evento.preventDefault()
  if (formulario.dataset.editor === 'categoria') {
    await enviarCategoria(formulario, cargar)
    return
  }
  if (formulario.dataset.editor === 'plaza') {
    await enviarPlaza(formulario, cargar)
    return
  }
  if (formulario.dataset.editor === 'plaza-nueva') {
    enviarPlazaNueva(formulario)
    return
  }
  if (formulario.dataset.editor === 'importar') {
    enviarImportar(formulario)
    return
  }
  await enviarNegocio(formulario, cargar)
}

function alPulsar(evento: Event): void {
  const objetivo = evento.target as HTMLElement | null
  if (!objetivo) return

  if (objetivo.closest('[data-quitar-filtros]')) {
    vista.consulta = ''
    vista.filtroEstado = ''
    vista.filtroPlaza = ''
    vista.pagina = 0
    pintarLista()
    // El botón que se pulsó desaparece al repintar: el foco vuelve al buscador, no a la página.
    vista.raiz?.querySelector<HTMLInputElement>('[data-buscar]')?.focus()
    return
  }

  const nuevaPagina = objetivo.closest<HTMLButtonElement>('[data-pagina]')
  if (nuevaPagina?.dataset.pagina) {
    vista.pagina += nuevaPagina.dataset.pagina === 'siguiente' ? 1 : -1
    if (vista.modo === 'categorias') pintarZonaCategorias()
    else pintarZonaNegocios()
    return
  }

  const quitarEdificio = objetivo.closest<HTMLElement>('[data-quitar-edificio]')
  if (quitarEdificio?.dataset.quitarEdificio) {
    pintarQuitarEdificio(quitarEdificio.dataset.quitarEdificio)
    return
  }
  if (objetivo.closest('[data-nueva-plaza]')) {
    pintarPlazaNueva()
    return
  }
  if (objetivo.closest('[data-importar]')) {
    pintarImportar()
    return
  }
  if (objetivo.closest('[data-nueva-categoria]')) {
    pintarCategoria(null)
    return
  }
  const editarCategoria = objetivo.closest<HTMLElement>('[data-editar-categoria]')
  if (editarCategoria && vista.datos) {
    const categoria = vista.datos.categories.find(
      (fila) => fila.id === editarCategoria.dataset.editarCategoria,
    )
    if (categoria) pintarCategoria(categoria)
    return
  }

  const editarPlaza = objetivo.closest<HTMLElement>('[data-editar-plaza]')
  if (editarPlaza && vista.datos) {
    const plaza = vista.datos.plazas.find((fila) => fila.id === editarPlaza.dataset.editarPlaza)
    if (plaza) pintarPlaza(plaza)
    return
  }

  const editar = objetivo.closest<HTMLElement>('[data-editar]')
  if (editar && vista.datos) {
    const negocio = vista.datos.places.find((fila) => fila.id === editar.dataset.editar)
    if (negocio) pintarFormulario(negocio)
    return
  }
  if (objetivo.closest('[data-nuevo]')) pintarFormulario(null)
}

function alEscribir(evento: Event): void {
  const buscar = (evento.target as HTMLElement | null)?.closest<HTMLInputElement>('[data-buscar]')
  if (!buscar) return
  vista.consulta = buscar.value
  vista.pagina = 0
  if (vista.modo === 'categorias') pintarZonaCategorias()
  else pintarZonaNegocios()
}

function alFiltrar(evento: Event): void {
  const filtro = (evento.target as HTMLElement | null)?.closest<HTMLSelectElement>('[data-filtro]')
  if (!filtro) return
  if (filtro.dataset.filtro === 'estado') vista.filtroEstado = filtro.value
  else vista.filtroPlaza = filtro.value
  vista.pagina = 0
  pintarZonaNegocios()
}

function alPulsarEditor(evento: Event): void {
  const objetivo = evento.target as HTMLElement | null
  if (!objetivo) return
  // El clic en el fondo del diálogo llega con el propio <dialog> como destino.
  if (objetivo === vista.dialogo) {
    cerrarEditor()
    return
  }
  if (objetivo.closest('[data-editor-cerrar], [data-cancelar]')) {
    cerrarEditor()
    return
  }
  if (alPulsarCategoria(objetivo, cargar)) return
  // Antes de la guarda de abajo: el formulario de una categoría no tiene `formularioActual`.
  if (alPulsarDireccion(objetivo, cargar)) return
  if (alPulsarBorrarGiro(objetivo, cargar)) return
  if (!vista.formularioActual) return
  if (alPulsarContorno(objetivo, cargar)) return
  if (alPulsarEdificio(objetivo, cargar)) return
  if (alPulsarPlazaNueva(objetivo, cargar)) return
  if (alPulsarImportar(objetivo, cargar)) return
  if (alPulsarPlaza(objetivo, cargar)) return
  if (alPulsarNegocio(objetivo, cargar)) return
  alPulsarFoto(objetivo)
}

function alEscribirEditor(evento: Event): void {
  const objetivo = evento.target as HTMLElement | null
  if (!objetivo) return
  alCambiarPlazaNueva(objetivo)
  alCambiarImportar(objetivo)

  if (alEscribirDireccion(objetivo)) return
  if (alEscribirContorno(objetivo)) return
  if (alEscribirNegocio(objetivo)) return
  if (alEscribirCategoria(objetivo)) return
  if (alEscribirFoto(objetivo)) return
  if (vista.formularioActual) {
    vista.formularioActual.sucio = true
    actualizarContadores()
    limpiarErrorDe(objetivo)
  }
}

function alCambiarEditor(evento: Event): void {
  const objetivo = evento.target as HTMLElement | null
  if (!objetivo) return
  alCambiarPlazaNueva(objetivo)
  alCambiarImportar(objetivo)

  if (alCambiarDireccion(objetivo)) return
  if (alCambiarFoto(objetivo)) return
  if (alCambiarCategoria(objetivo)) return
  if (alCambiarPlaza(objetivo)) return
  alCambiarNegocio(objetivo)
}
