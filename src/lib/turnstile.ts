/**
 * El desafío de Turnstile, que solo se pide al crear una cuenta.
 *
 * Es la única pieza de terceros que corre en el navegador de esta guía, y por eso se carga tarde: el
 * script de Cloudflare no se descarga al abrir la página, sino la primera vez que alguien hace algo
 * que necesita cuenta. Quien solo lee no le pide nada a nadie, que es justo lo que dice la página de
 * privacidad y lo que el servidor da por supuesto (ver src/lib/cuenta.ts).
 *
 * Con `interaction-only` el widget no se ve. Solo aparece si Cloudflare decide que esta visita tiene
 * algo que demostrar, y entonces se dibuja centrado sobre la página; para la inmensa mayoría no hay
 * nada que pulsar y el primer corazón no se entera.
 *
 * Sin clave pública configurada no hay desafío y se devuelve `null`: eso es desarrollo y pruebas. En
 * producción la clave está, y sin ficha el servidor no entrega cuenta (ver worker/api.ts).
 */

/**
 * Clave pública del widget. Es pública de verdad, no un secreto a medias: viaja en el HTML de toda
 * página que lo use. La secreta, la que verifica la ficha, vive solo en el Worker.
 */
const CLAVE = import.meta.env.VITE_TURNSTILE_SITEKEY?.trim() ?? ''

const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

/**
 * Pasado esto se deja de esperar, y el reloj cubre **también la descarga del script**. Hace falta que
 * lo cubra: una red que no responde (portal cautivo, proxy que traga la conexión) no dispara ni
 * `load` ni `error`, y sin un límite por encima la promesa se queda colgada para siempre. El corazón
 * ya está puesto en el dispositivo; lo único que se pierde es que cuente para el número público, y
 * eso no justifica dejar nada esperando.
 */
const PACIENCIA_MS = 20_000

interface Api {
  render(contenedor: HTMLElement, opciones: Record<string, unknown>): string | undefined
  remove(id: string): void
}

declare global {
  interface Window {
    turnstile?: Api
  }
}

/** ¿Está configurado el desafío? Lo usan las pruebas y la documentación, no la interfaz. */
export const hayDesafio = (): boolean => CLAVE.length > 0

/** Una sola carga del script por pestaña, pase lo que pase con las fichas. */
let carga: Promise<Api | null> | null = null

function cargar(): Promise<Api | null> {
  if (carga) return carga
  carga = new Promise<Api | null>((resolver) => {
    if (window.turnstile) {
      resolver(window.turnstile)
      return
    }
    const etiqueta = document.createElement('script')
    etiqueta.src = SCRIPT
    etiqueta.async = true
    etiqueta.onload = () => resolver(window.turnstile ?? null)
    // Si el script no carga (red caída, bloqueador), no hay ficha y ya está. No se reintenta.
    etiqueta.onerror = () => resolver(null)
    document.head.append(etiqueta)
  })
  return carga
}

/**
 * Pide una ficha, o `null` si no hay desafío configurado, el script no carga, la persona no lo
 * resuelve o se acaba la paciencia. Nunca lanza: quien llama tiene que poder seguir sin ella.
 */
export function fichaDeDesafio(): Promise<string | null> {
  if (!CLAVE) return Promise.resolve(null)

  return new Promise<string | null>((resolver) => {
    let cerrado = false
    let api: Api | null = null
    let id: string | undefined
    let contenedor: HTMLElement | null = null
    let reloj: ReturnType<typeof setTimeout>

    const terminar = (ficha: string | null) => {
      if (cerrado) return
      cerrado = true
      clearTimeout(reloj)
      if (api && id !== undefined) {
        try {
          api.remove(id)
        } catch {
          // Si el widget ya se fue solo, mejor.
        }
      }
      contenedor?.remove()
      resolver(ficha)
    }

    // El reloj arranca antes que nada, para que cubra la descarga del script y no solo el desafío.
    reloj = setTimeout(() => terminar(null), PACIENCIA_MS)

    void (async () => {
      api = await cargar()
      if (cerrado) return
      if (!api) {
        terminar(null)
        return
      }

      contenedor = document.createElement('div')
      /*
       * El estilo va por CSSOM y no en una hoja: son cinco declaraciones para un elemento que vive
       * unos segundos como mucho, y asignar `style.x` desde JavaScript no choca con `style-src
       * 'self'` (lo que la política bloquea son los atributos y las etiquetas `<style>` del HTML).
       */
      Object.assign(contenedor.style, {
        position: 'fixed',
        insetInlineStart: '50%',
        insetBlockStart: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: '1000',
      })
      document.body.append(contenedor)

      try {
        id = api.render(contenedor, {
          sitekey: CLAVE,
          appearance: 'interaction-only',
          callback: (ficha: string) => terminar(ficha),
          'error-callback': () => terminar(null),
          'timeout-callback': () => terminar(null),
        })
      } catch {
        terminar(null)
      }
    })()
  })
}
