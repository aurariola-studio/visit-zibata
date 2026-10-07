/**
 * Lo que cuesta crear una cuenta.
 *
 * El navegador busca un secreto cuya huella (SHA-256) empiece por una tirada de ceros. Encontrarlo
 * exige probar miles de secretos; comprobarlo exige un solo hash. Esa asimetría es toda la defensa:
 * una cuenta cuesta trabajo y mil cuestan mil veces ese trabajo, sin que nadie tenga que demostrar
 * nada ni pulsar nada.
 *
 * **Por qué esto y no un captcha.** Antes aquí había Turnstile. Funcionaba para la mayoría, pero su
 * trabajo es rechazar navegadores, y quien usa Tor, un bloqueador duro o una red que filtra dominios
 * se quedaba fuera: su corazón se guardaba en el dispositivo y no contaba nunca, sin avisar y sin
 * nada que pudiera hacer. Esto funciona en cualquier navegador, porque solo usa `crypto.subtle`, y
 * de paso devuelve la política de seguridad a `script-src 'self'`: ni un script de terceros.
 *
 * **Lo que no compra.** Es más débil que un captcha contra alguien decidido: la CPU se alquila, y en
 * código nativo cada intento cuesta una fracción de lo que cuesta aquí. Lo que para de golpe es el
 * bucle de veinte líneas que pide mil cuentas, que es la forma que realmente tiene este problema. El
 * resto lo sostienen las otras defensas (ver worker/favoritos.ts).
 *
 * Este archivo lo comparten el navegador y el Worker a propósito: la dificultad y la comprobación
 * tienen que ser exactamente la misma regla en los dos lados, y dos copias se separan. Es el mismo
 * arreglo que ya usa `url-state.ts` entre la aplicación y el build.
 */

/**
 * Ceros con los que tiene que empezar la huella.
 *
 * 16 bits son 65.536 intentos de media. Medido en un escritorio, 120.000 hashes por segundo: medio
 * segundo. En un teléfono de gama media, dos o tres. Nadie espera a esto, porque el corazón ya está
 * puesto en el dispositivo y lo único que llega detrás es el alta.
 *
 * Es el dial: subirlo encarece cada cuenta para todos por igual, y lo que manda para elegirlo es el
 * peor teléfono que queramos admitir, no el mejor.
 */
export const BITS = 16

/** Hasta aquí se busca. Con 16 bits no llegar es astronómicamente improbable; el tope es por si acaso. */
const INTENTOS_MAXIMOS = 4_000_000

/**
 * Cada cuántos intentos se le devuelve el turno al navegador, para no congelar la interfaz.
 *
 * 2048 y no 512 porque `setTimeout(0)` no son cero: los navegadores lo frenan a unos milisegundos, y
 * ceder cada 512 intentos se comía la mitad del tiempo en esperas. Medido en este escritorio, 64.000
 * hashes por segundo con 512 y 120.000 con 2048; la interfaz sigue respondiendo igual, porque con
 * 2048 todavía se cede unas treinta veces durante una búsqueda.
 */
const TANDA = 2048

export function base64url(bytes: Uint8Array): string {
  let texto = ''
  for (const byte of bytes) texto += String.fromCharCode(byte)
  return btoa(texto).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** La huella en bytes. El Worker la guarda en base64url; aquí hacen falta los bits. */
export async function digestDe(texto: string): Promise<Uint8Array> {
  const datos = new TextEncoder().encode(texto)
  return new Uint8Array(await crypto.subtle.digest('SHA-256', datos))
}

/** ¿Empieza la huella por `bits` ceros? Es la comprobación que hace el servidor, en un solo hash. */
export function cumpleLaPrueba(digest: Uint8Array, bits: number = BITS): boolean {
  let restantes = bits
  for (const byte of digest) {
    if (restantes <= 0) return true
    if (restantes >= 8) {
      if (byte !== 0) return false
      restantes -= 8
    } else {
      return byte >>> (8 - restantes) === 0
    }
  }
  return restantes <= 0
}

/** Un secreto cualquiera: 32 bytes de azar. El que valga será el de esta persona para siempre. */
function candidato(): string {
  return base64url(crypto.getRandomValues(new Uint8Array(32)))
}

/**
 * Busca un secreto que cumpla la prueba, o `null` si no lo encuentra.
 *
 * Devuelve el turno cada tanda para que la guía siga respondiendo mientras tanto: el corazón ya está
 * puesto en el dispositivo y nadie está esperando a esto.
 */
export async function secretoConPrueba(bits: number = BITS): Promise<string | null> {
  for (let intento = 0; intento < INTENTOS_MAXIMOS; intento++) {
    const secreto = candidato()
    if (cumpleLaPrueba(await digestDe(secreto), bits)) return secreto
    if (intento % TANDA === TANDA - 1) await new Promise((sigue) => setTimeout(sigue, 0))
  }
  return null
}
