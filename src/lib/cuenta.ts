/**
 * La cuenta de quien usa la guía, vista desde el navegador.
 *
 * No hay registro, ni correo, ni contraseña: la cuenta se crea sola la primera vez que alguien hace
 * algo que haya que guardar fuera de su dispositivo, y nunca al entrar. Quien solo mira la guía no
 * genera ninguna cuenta, y eso es deliberado.
 *
 * Lo que se guarda aquí es un secreto que este navegador generó y del que en el servidor solo vive
 * su huella. **Quien lo pierde, pierde la cuenta**: es la decisión tomada (ver docs/CUENTAS.md), y la
 * página de privacidad lo dice con esas palabras.
 *
 * Nada de esto puede romper la guía. Si el servidor no responde, si el almacenamiento está bloqueado
 * (modo privado) o si la respuesta viene rara, se devuelve `null` y quien llama sigue con lo local,
 * que es lo que ha funcionado siempre.
 */

import { secretoConPrueba } from './prueba-de-trabajo.ts'

const CLAVE = 'zibata:cuenta'

/** La misma cabecera que lee el Worker (worker/cuenta.ts). */
const CABECERA = 'x-zibata-cuenta'

/** La forma que tiene un secreto válido. Se comprueba al leerlo por si quedó algo viejo o a medias. */
const FORMA = /^[A-Za-z0-9_-]{43}$/

function guardado(): string | null {
  try {
    const valor = window.localStorage.getItem(CLAVE)
    return valor && FORMA.test(valor) ? valor : null
  } catch {
    return null
  }
}

function guardar(secreto: string): void {
  try {
    window.localStorage.setItem(CLAVE, secreto)
  } catch {
    // Sin almacenamiento, la cuenta dura lo que la pestaña. Mejor eso que no poder dar un corazón.
  }
}

/** Una sola alta en vuelo: dos gestos seguidos no deben crear dos cuentas. */
let enCurso: Promise<string | null> | null = null

/**
 * El secreto de esta persona, creando la cuenta si hace falta. `null` si no se pudo.
 *
 * Se llama desde el gesto que necesita cuenta, no al arrancar.
 */
export async function asegurarCuenta(): Promise<string | null> {
  const existente = guardado()
  if (existente) return existente
  if (enCurso) return enCurso

  enCurso = (async () => {
    try {
      /*
       * El secreto lo genera este navegador, no el servidor: la prueba de trabajo consiste
       * precisamente en buscar uno cuya huella empiece por ceros (ver prueba-de-trabajo.ts). Cuesta
       * uno o dos segundos repartidos en trozos, y no bloquea nada porque el corazón ya está puesto.
       */
      const secreto = await secretoConPrueba()
      if (!secreto || !FORMA.test(secreto)) return null
      const respuesta = await fetch('/api/cuenta', {
        method: 'POST',
        headers: { [CABECERA]: secreto },
      })
      // Un 409 es la huella repetida, que con 256 bits de azar no pasa nunca; cualquier fallo deja
      // la guía como estaba y el siguiente gesto vuelve a intentarlo.
      if (!respuesta.ok) return null
      guardar(secreto)
      return secreto
    } catch {
      return null
    } finally {
      enCurso = null
    }
  })()
  return enCurso
}

/** Las cabeceras con las que se identifica una escritura, o `null` si no hay cuenta ni se pudo crear. */
export async function cabecerasDeCuenta(): Promise<Record<string, string> | null> {
  const secreto = await asegurarCuenta()
  return secreto ? { [CABECERA]: secreto } : null
}

/** Si ya hay cuenta en este navegador, sin crear ninguna. Para leer sin provocar un alta. */
export function hayCuenta(): boolean {
  return guardado() !== null
}

/** Olvida la cuenta en este dispositivo. No borra nada del servidor: eso es otra cosa y se pide aparte. */
export function olvidarCuenta(): void {
  try {
    window.localStorage.removeItem(CLAVE)
  } catch {
    // Si no se puede escribir tampoco se pudo guardar, así que no hay nada que olvidar.
  }
}
