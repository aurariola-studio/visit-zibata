import { assetUrl } from '../../lib/assets.ts'
import controls from '../../styles/controls.module.css'
import { limpiarErrorDe } from './editor.ts'
import type { Foto } from './tipos.ts'
import { LADO_FOTO, TOPE_FOTO, texto } from './tipos.ts'
import { vista } from './vista.ts'

export function pintarFotosFormulario(): void {
  const zona = vista.dialogo?.querySelector<HTMLElement>('[data-fotos-zona]')
  if (!zona || !vista.formularioActual) return
  const fotos = vista.formularioActual.fotos
  const lista = fotos
    .map(
      (foto, indice) => `<li class="foto-fila" data-foto="${indice}">
        <img class="foto-mini" src="${texto(assetUrl(foto.src))}" alt="" width="96" height="72" loading="lazy" />
        <div class="foto-datos">
          <label class="campo-form">
            <span>Texto alternativo</span>
            <input class="${controls.campo}" type="text" data-alt-foto="${indice}" value="${texto(foto.alt)}" maxlength="300" />
          </label>
          <p class="meta">${indice === 0 ? 'Portada' : `Foto ${indice + 1}`}${foto.credit ? ` · ${texto(foto.credit)}` : ''}</p>
        </div>
        <div class="foto-acciones">
          ${indice > 0 ? `<button type="button" class="${controls.base} ${controls.boton} ${controls.fantasma}" data-foto-portada="${indice}">Portada</button>` : ''}
          ${indice > 0 ? `<button type="button" class="${controls.base} ${controls.boton} ${controls.fantasma}" data-foto-subir="${indice}">Subir</button>` : ''}
          ${indice < fotos.length - 1 ? `<button type="button" class="${controls.base} ${controls.boton} ${controls.fantasma}" data-foto-bajar="${indice}">Bajar</button>` : ''}
          <button type="button" class="${controls.base} ${controls.boton} ${controls.fantasma}" data-foto-quitar="${indice}">Quitar</button>
        </div>
      </li>`,
    )
    .join('')

  const subir = vista.formularioActual.id
    ? `<label class="subir-foto ${controls.base} ${controls.boton} ${controls.secundario}">
        ${vista.subiendoFoto ? 'Subiendo…' : 'Añadir foto'}
        <input class="visualmente" type="file" accept="image/*" multiple data-subir-foto${vista.subiendoFoto ? ' disabled' : ''} />
      </label>`
    : '<p class="ayuda">Guarda el negocio una vez para poder añadir fotos.</p>'

  zona.innerHTML = `
    ${fotos.length > 0 ? `<ul class="fotos-editor">${lista}</ul>` : '<p class="vacio">Todavía no hay fotos: la ficha usa la ilustración de su categoría.</p>'}
    <div class="fotos-subir">
      ${subir}
      <p class="ayuda" data-foto-estado role="status">WebP o JPEG, máximo 1600 px de lado. Se guardan en la PR, no en producción.</p>
    </div>`
}

function moverFoto(indice: number, destino: number): void {
  if (!vista.formularioActual) return
  const fotos = vista.formularioActual.fotos
  if (destino < 0 || destino >= fotos.length) return
  const [foto] = fotos.splice(indice, 1)
  if (!foto) return
  fotos.splice(destino, 0, foto)
  vista.formularioActual.sucio = true
  pintarFotosFormulario()
}

function quitarFoto(indice: number): void {
  if (!vista.formularioActual) return
  vista.formularioActual.fotos.splice(indice, 1)
  vista.formularioActual.sucio = true
  pintarFotosFormulario()
}

/** El navegador reduce y reorienta la foto antes de que salga del dispositivo. */
async function comprimirFoto(archivo: File): Promise<{
  datos: string
  archivo: string
  ancho: number
  alto: number
  placeholder: string
  alt: string
}> {
  const imagen = await cargarImagen(archivo)
  const anchoBase = 'naturalWidth' in imagen ? imagen.naturalWidth : imagen.width
  const altoBase = 'naturalHeight' in imagen ? imagen.naturalHeight : imagen.height
  if (!anchoBase || !altoBase) throw new Error('No se pudo leer la imagen.')
  const escala = Math.min(1, LADO_FOTO / Math.max(anchoBase, altoBase))
  const ancho = Math.max(1, Math.round(anchoBase * escala))
  const alto = Math.max(1, Math.round(altoBase * escala))
  const lienzo = document.createElement('canvas')
  lienzo.width = ancho
  lienzo.height = alto
  const contexto = lienzo.getContext('2d')
  if (!contexto) throw new Error('El navegador no pudo preparar la imagen.')
  contexto.drawImage(imagen, 0, 0, ancho, alto)
  if ('close' in imagen) imagen.close()

  let blob = await new Promise<Blob | null>((resolver) =>
    lienzo.toBlob(resolver, 'image/webp', 0.82),
  )
  if (!blob || (blob.type !== 'image/webp' && blob.type !== 'image/jpeg')) {
    blob = await new Promise<Blob | null>((resolver) => lienzo.toBlob(resolver, 'image/jpeg', 0.85))
  }
  if (!blob) throw new Error('El navegador no pudo convertir la imagen.')
  if (blob.size > TOPE_FOTO) throw new Error('La foto sigue pesando demasiado; prueba con otra.')

  const mini = document.createElement('canvas')
  mini.width = 1
  mini.height = 1
  const miniContexto = mini.getContext('2d')
  let placeholder = '#f1ebe0'
  if (miniContexto) {
    miniContexto.drawImage(lienzo, 0, 0, 1, 1)
    const [rojo, verde, azul] = miniContexto.getImageData(0, 0, 1, 1).data
    if (rojo !== undefined && verde !== undefined && azul !== undefined) {
      placeholder = `#${[rojo, verde, azul].map((valor) => valor.toString(16).padStart(2, '0')).join('')}`
    }
  }

  const sinExtension = archivo.name.replace(/\.[^.]+$/, '').trim()
  const alt =
    sinExtension.replace(/[-_]+/g, ' ').trim() ||
    `Fotografía de ${vista.formularioActual?.nombre ?? 'el negocio'}`
  const base64 = await base64DeBlob(blob)
  return { datos: base64, archivo: archivo.name, ancho, alto, placeholder, alt }
}

async function cargarImagen(archivo: File): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(archivo, { imageOrientation: 'from-image' })
    } catch {
      // Safari antiguo o un formato que el decodificador rápido no entiende.
    }
  }
  const url = URL.createObjectURL(archivo)
  try {
    return await new Promise<HTMLImageElement>((resolver, rechazar) => {
      const imagen = new Image()
      imagen.onload = () => resolver(imagen)
      imagen.onerror = () => rechazar(new Error('No se pudo leer la imagen.'))
      imagen.src = url
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

async function base64DeBlob(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binario = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binario += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(binario)
}

async function subirFotos(archivos: FileList): Promise<void> {
  if (!vista.formularioActual?.id || vista.subiendoFoto || vista.guardando) return
  vista.subiendoFoto = true
  pintarFotosFormulario()
  let mensajeFinal = ''
  const avisoLocal = vista.dialogo?.querySelector<HTMLElement>('[data-foto-estado]')
  try {
    for (const archivo of [...archivos]) {
      if (avisoLocal) avisoLocal.textContent = `Preparando ${archivo.name}…`
      const preparada = await comprimirFoto(archivo)
      if (avisoLocal) avisoLocal.textContent = `Subiendo ${archivo.name}…`
      const respuesta = await fetch('/api/panel/contenido/foto', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          id: vista.formularioActual.id,
          archivo: preparada.archivo,
          alt: preparada.alt,
          ancho: preparada.ancho,
          alto: preparada.alto,
          placeholder: preparada.placeholder,
          datos: preparada.datos,
        }),
      })
      const resultado = (await respuesta.json().catch(() => null)) as {
        ok?: boolean
        seco?: boolean
        mensaje?: string
        problemas?: string[]
        error?: string
        foto?: Foto | null
      } | null
      if (respuesta.status === 403) throw new Error('Sin permiso. Revisa la regla de Access.')
      if (respuesta.status === 503) throw new Error('Falta GITHUB_TOKEN en el Worker.')
      if (respuesta.status === 413) {
        throw new Error('La foto es demasiado grande; el navegador no pudo reducirla.')
      }
      if (!respuesta.ok || !resultado?.ok) {
        throw new Error(
          resultado?.problemas?.join(' ') ?? resultado?.error ?? 'No se pudo subir la foto.',
        )
      }
      if (resultado.seco || !resultado.foto) {
        mensajeFinal = resultado.mensaje ?? 'En desarrollo no se guarda.'
        continue
      }
      vista.formularioActual.fotos.push(resultado.foto)
      const negocio = vista.datos?.places.find((fila) => fila.id === vista.formularioActual?.id)
      if (negocio) negocio.photos = [...negocio.photos, resultado.foto]
      mensajeFinal = 'Foto añadida a la PR. Ajusta el texto si hace falta.'
    }
  } catch (causa) {
    mensajeFinal = causa instanceof Error ? causa.message : 'No se pudo subir la foto.'
  } finally {
    vista.subiendoFoto = false
    pintarFotosFormulario()
    const estadoFinal = vista.dialogo?.querySelector<HTMLElement>('[data-foto-estado]')
    if (estadoFinal && mensajeFinal) estadoFinal.textContent = mensajeFinal
  }
}

/** Clics dentro del diálogo que son de las fotos. Devuelve si lo atendió. */
export function alPulsarFoto(objetivo: HTMLElement): boolean {
  const portada = objetivo.closest<HTMLElement>('[data-foto-portada]')
  if (portada?.dataset.fotoPortada) {
    moverFoto(Number(portada.dataset.fotoPortada), 0)
    return true
  }
  const subirFoto = objetivo.closest<HTMLElement>('[data-foto-subir]')
  if (subirFoto?.dataset.fotoSubir) {
    const indice = Number(subirFoto.dataset.fotoSubir)
    moverFoto(indice, indice - 1)
    return true
  }
  const bajarFoto = objetivo.closest<HTMLElement>('[data-foto-bajar]')
  if (bajarFoto?.dataset.fotoBajar) {
    const indice = Number(bajarFoto.dataset.fotoBajar)
    moverFoto(indice, indice + 1)
    return true
  }
  const quitarFotoBoton = objetivo.closest<HTMLElement>('[data-foto-quitar]')
  if (quitarFotoBoton?.dataset.fotoQuitar) {
    quitarFoto(Number(quitarFotoBoton.dataset.fotoQuitar))
    return true
  }
  return false
}

/** El texto alternativo de una foto. Devuelve si lo atendió. */
export function alEscribirFoto(objetivo: HTMLElement): boolean {
  if (!objetivo.matches('[data-alt-foto]') || !vista.formularioActual) return false
  const indice = Number((objetivo as HTMLInputElement).dataset.altFoto)
  const foto = vista.formularioActual.fotos[indice]
  if (foto) {
    foto.alt = (objetivo as HTMLInputElement).value
    vista.formularioActual.sucio = true
  }
  limpiarErrorDe(objetivo)
  return true
}

/** La carga de archivos. Devuelve si lo atendió. */
export function alCambiarFoto(objetivo: HTMLElement): boolean {
  const archivos = objetivo.closest<HTMLInputElement>('[data-subir-foto]')
  if (!archivos?.files?.length) return false
  void subirFotos(archivos.files)
  return true
}
