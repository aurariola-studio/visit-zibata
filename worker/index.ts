/**
 * El Worker del sitio. Sirve los mismos archivos de `dist/` que antes y, de paso, cuenta la visita.
 *
 * Hasta la v4.7.0 aquí no había código: era un Worker solo de assets. Esto es lo primero que se
 * ejecuta en el servidor en toda la vida del proyecto, así que conviene dejar escrito lo que **no**
 * hace: no lee el cuerpo de la petición, no pone cookies, no mira la IP, no toca el user agent salvo
 * para descartar robots, y no guarda nada de nadie. Lo único que ocurre es que un contador sube.
 *
 * Y la regla que manda sobre todas: **contar jamás puede romper la página**. La respuesta se obtiene
 * primero y se devuelve igual aunque la base no exista, esté caída o falle a mitad. Por eso el
 * apunte va en `waitUntil`, fuera del camino de la respuesta, y envuelto en un `try`.
 *
 * Solo se ejecuta en las rutas de página (ver `run_worker_first` en wrangler.jsonc). Las teselas,
 * los assets y las imágenes se sirven sin pasar por aquí: así no cuestan invocación ni se cuentan
 * como visitas.
 */
import { APUNTE, visitaDe } from './analitica.ts'

/** Lo mínimo de la plataforma que este Worker usa. */
interface Entorno {
  ASSETS: { fetch(request: Request): Promise<Response> }
  /** La base de visitas. Puede no estar (en desarrollo, o antes de crearla): entonces no se cuenta. */
  ANALITICA?: {
    prepare(sql: string): {
      bind(...valores: unknown[]): { run(): Promise<unknown> }
    }
  }
}

interface Contexto {
  waitUntil(promesa: Promise<unknown>): void
}

async function contar(peticion: Request, respuesta: Response, entorno: Entorno): Promise<void> {
  if (!entorno.ANALITICA) return
  const visita = visitaDe({
    url: peticion.url,
    metodo: peticion.method,
    estado: respuesta.status,
    tipoDeContenido: respuesta.headers.get('content-type'),
    userAgent: peticion.headers.get('user-agent'),
    ahora: new Date(),
  })
  if (!visita) return
  try {
    await entorno.ANALITICA.prepare(APUNTE).bind(visita.fecha, visita.ruta, visita.idioma).run()
  } catch (error) {
    // Un contador perdido no le importa a nadie; una página caída sí. Queda en el registro del
    // Worker por si algún día los números no cuadran.
    console.error('[analitica]', error)
  }
}

export default {
  async fetch(peticion: Request, entorno: Entorno, contexto: Contexto): Promise<Response> {
    const respuesta = await entorno.ASSETS.fetch(peticion)
    contexto.waitUntil(contar(peticion, respuesta, entorno))
    return respuesta
  },
}
