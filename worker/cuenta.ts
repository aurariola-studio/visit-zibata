/**
 * Identidad sin registro: quién es quien escribe, sin saber quién es.
 *
 * Una cuenta es un identificador aleatorio y nada más. No hay correo, ni nombre, ni IP, ni user
 * agent. Lo único que la liga a un navegador es un secreto que ese navegador guarda, y del que aquí
 * solo vive su huella: si alguien se llevara la base entera, no podría suplantar a nadie.
 *
 * Y una cuenta puede tener **varias credenciales**. Hoy solo la del dispositivo; mañana, la de
 * Google. Esa es la pieza que hace que entrar con Google no cree una cuenta nueva sino que añada una
 * llave a la que ya existe, y por eso nadie pierde su historial el día que llegue (ver
 * docs/CUENTAS.md).
 *
 * Quien pierde el secreto pierde la cuenta. Es la decisión tomada, no un descuido: un código de
 * recuperación sería peor, porque quien tuviera el código sería dueño de los datos.
 */

/**
 * Lo mínimo de D1 que este Worker usa. Escrito a mano y no importado de `@cloudflare/workers-types`
 * para no añadir una dependencia entera por cuatro firmas; si algún día hacen falta más, se trae.
 */
export interface Base {
  prepare(sql: string): Sentencia
  batch(sentencias: Sentencia[]): Promise<unknown>
}

export interface Sentencia {
  bind(...valores: unknown[]): Sentencia
  run(): Promise<unknown>
  first<T>(): Promise<T | null>
  all<T>(): Promise<{ results?: T[] }>
}

/** Cabecera con la que el navegador dice quién es. */
export const CABECERA = 'x-zibata-cuenta'

/** Proveedores de credencial. `google` todavía no existe; el esquema ya lo admite. */
export type Proveedor = 'dispositivo' | 'google'

/**
 * El secreto que se le entrega al navegador: 32 bytes aleatorios en base64url.
 *
 * `crypto.getRandomValues` y no un UUID: un UUID v4 tiene 122 bits de azar y encima un formato
 * reconocible, mientras que esto da 256 y no se parece a nada. No cuesta más y cierra la puerta a
 * adivinarlo.
 */
export function nuevoSecreto(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return base64url(bytes)
}

/**
 * La huella de un secreto, que es lo único que se guarda.
 *
 * SHA-256 a secas, sin sal ni derivación lenta: eso hace falta para contraseñas, que son cortas y
 * adivinables. Un secreto de 256 bits aleatorios no se adivina por fuerza bruta ni con todo el
 * tiempo del mundo, así que una función rápida sobra y evita gastar CPU en cada petición.
 */
export async function huella(secreto: string): Promise<string> {
  const datos = new TextEncoder().encode(secreto)
  return base64url(new Uint8Array(await crypto.subtle.digest('SHA-256', datos)))
}

/** El identificador de una cuenta. Opaco a propósito: no codifica nada de nadie. */
export function nuevaCuenta(): string {
  return base64url(crypto.getRandomValues(new Uint8Array(16)))
}

/**
 * El secreto que viene en una petición, o `null`.
 *
 * Se comprueba la forma antes de ir a la base: así una cabecera inventada se descarta sin gastar una
 * consulta, y nada que no tenga esta pinta llega al SQL.
 */
export function secretoDe(cabeceras: Headers): string | null {
  const valor = cabeceras.get(CABECERA)?.trim()
  if (!valor) return null
  return /^[A-Za-z0-9_-]{43}$/.test(valor) ? valor : null
}

function base64url(bytes: Uint8Array): string {
  let texto = ''
  for (const byte of bytes) texto += String.fromCharCode(byte)
  return btoa(texto).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Alta de una cuenta con su primera credencial, en una sola ida a la base. */
export const ALTA = [
  'INSERT INTO cuenta (id, creada) VALUES (?, ?)',
  'INSERT INTO credencial (proveedor, sujeto, cuenta_id, creada) VALUES (?, ?, ?, ?)',
] as const

/** De una credencial a su cuenta. Es la consulta que corre en cada escritura. */
export const RESOLVER = 'SELECT cuenta_id FROM credencial WHERE proveedor = ? AND sujeto = ?'
