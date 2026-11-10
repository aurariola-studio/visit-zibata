import { texto } from './contenido/tipos.ts'

/**
 * La línea del Resumen que dice si hay una versión de los edificios de Overture más nueva que la del mapa. Solo
 * avisa: lo que decide es el Worker (`worker/mapa.ts`), que compara la versión fijada en `main` con el listado
 * público. Pide una vez por vez que se pinta el Resumen, no con cada guardado.
 */

type Estado = 'al-dia' | 'hay-nueva' | 'fijada-retirada' | 'desconocido'

interface Version {
  estado?: Estado
  fijada?: string | null
  ultima?: string | null
  motivo?: string
}

const NO_SE_PUDO = 'No se pudo comprobar si hay una versión nueva de los edificios de Overture.'

/** El marcado de cada situación. Lo que se avisa va en un bloque; lo demás, en una nota. */
export function frase(v: Version): string {
  const fijada = texto(v.fijada ?? '')
  const ultima = texto(v.ultima ?? '')
  switch (v.estado) {
    case 'hay-nueva':
      return `<div class="pendiente"><p>Hay una versión más nueva de los edificios de Overture: ${ultima}. El mapa usa la ${fijada}. Por ahora se actualiza desde el repositorio.</p></div>`
    case 'fijada-retirada':
      return `<div class="pendiente"><p>Overture ya no publica la versión ${fijada} que usa el mapa (la más nueva es la ${ultima}). El mapa sigue funcionando con su copia guardada, pero no se podría volver a bajar: conviene actualizarlo.</p></div>`
    case 'al-dia':
      return `<p class="ayuda">El mapa usa la versión más reciente de los edificios de Overture (${fijada}).</p>`
    default:
      return `<p class="ayuda">${NO_SE_PUDO}${v.motivo ? ` ${texto(v.motivo)}` : ''}</p>`
  }
}

export async function montarVersionDelMapa(zona: HTMLElement): Promise<void> {
  try {
    const respuesta = await fetch('/api/panel/mapa/version')
    // Sin acceso a GitHub (desarrollo o sin testigo) el Resumen ya lo dice en otro bloque. Un 403 sí se dice: si
    // Access no cubre esta ruta, que la línea desaparezca sin más no se distinguiría de "todo bien".
    if (respuesta.status === 503) {
      zona.innerHTML = ''
      return
    }
    const datos = respuesta.ok ? ((await respuesta.json()) as Version) : null
    zona.innerHTML = datos ? frase(datos) : `<p class="ayuda">${NO_SE_PUDO}</p>`
  } catch {
    zona.innerHTML = `<p class="ayuda">${NO_SE_PUDO}</p>`
  }
}
