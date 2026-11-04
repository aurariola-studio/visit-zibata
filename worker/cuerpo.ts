/**
 * Leer el cuerpo de una petición con un tope en bytes.
 *
 * `peticion.text()` y `peticion.json()` bajan el cuerpo entero a memoria antes de que nadie mire su
 * tamaño, y la cabecera `Content-Length` la manda quien llama: puede faltar (HTTP/2 y `chunked`) o
 * mentir. Aquí se cuentan los bytes que de verdad llegan y se corta la lectura en cuanto pasan del
 * tope, sin bajar el resto.
 */

/** Cuántos bytes admite cada ruta de escritura. Sobre el máximo legítimo, no sobre el típico. */
export const TOPE_POR_DEFECTO = 16 * 1024

/**
 * El cuerpo como texto, o `null` si pasa de `maximo` bytes.
 *
 * Una petición sin cuerpo da el texto vacío, que quien llama rechaza como JSON inválido.
 */
export async function leerCuerpo(peticion: Request, maximo: number): Promise<string | null> {
  const declarado = Number(peticion.headers.get('content-length'))
  // Un valor declarado que ya pasa del tope se rechaza sin tocar el cuerpo. Uno que falta o no es un
  // número (NaN) no dice nada, y entonces manda la cuenta real de abajo.
  if (Number.isFinite(declarado) && declarado > maximo) return null

  const flujo = peticion.body
  if (!flujo) return ''

  const lector = flujo.getReader()
  const trozos: Uint8Array[] = []
  let total = 0
  try {
    for (;;) {
      const { done, value } = await lector.read()
      if (done) break
      total += value.byteLength
      if (total > maximo) {
        // Deja de bajar el resto: sin esto el cuerpo seguiría llegando hasta el final.
        await lector.cancel().catch(() => {})
        return null
      }
      trozos.push(value)
    }
  } finally {
    lector.releaseLock()
  }

  const entero = new Uint8Array(total)
  let posicion = 0
  for (const trozo of trozos) {
    entero.set(trozo, posicion)
    posicion += trozo.byteLength
  }
  return new TextDecoder().decode(entero)
}
