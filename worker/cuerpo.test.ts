import { describe, expect, it } from 'vitest'
import { leerCuerpo } from './cuerpo.ts'

const URL_DE_PRUEBA = 'https://visitzibata.com/api/x'

/** Un cuerpo que sale a trozos, sin `content-length`, y que cuenta cuántos trozos se le pidieron. */
function flujoDe(trozos: number, tamano: number) {
  const estado = { pedidos: 0, cancelado: false }
  const cuerpo = new ReadableStream<Uint8Array>({
    pull(controlador) {
      estado.pedidos++
      if (estado.pedidos > trozos) {
        controlador.close()
        return
      }
      controlador.enqueue(new Uint8Array(tamano).fill(97))
    },
    cancel() {
      estado.cancelado = true
    },
  })
  return { cuerpo, estado }
}

const conFlujo = (cuerpo: ReadableStream<Uint8Array>) =>
  new Request(URL_DE_PRUEBA, {
    method: 'POST',
    body: cuerpo,
    // Obligatorio en Node para un cuerpo en flujo; no pone `content-length`.
    duplex: 'half',
  } as RequestInit)

describe('leerCuerpo', () => {
  it('devuelve el texto de un cuerpo que cabe', async () => {
    const peticion = new Request(URL_DE_PRUEBA, { method: 'POST', body: '{"a":1}' })
    await expect(leerCuerpo(peticion, 100)).resolves.toBe('{"a":1}')
  })

  it('cuenta bytes y no caracteres', async () => {
    // Cuatro letras con tilde son ocho bytes: pasan de un tope de siete aunque "length" sea 4.
    const peticion = new Request(URL_DE_PRUEBA, { method: 'POST', body: 'éééé' })
    await expect(leerCuerpo(peticion, 7)).resolves.toBeNull()
    await expect(
      leerCuerpo(new Request(URL_DE_PRUEBA, { method: 'POST', body: 'éééé' }), 8),
    ).resolves.toBe('éééé')
  })

  it('una petición sin cuerpo da el texto vacío', async () => {
    await expect(leerCuerpo(new Request(URL_DE_PRUEBA, { method: 'POST' }), 100)).resolves.toBe('')
  })

  it('rechaza por la cabecera declarada sin leer el cuerpo', async () => {
    const { cuerpo, estado } = flujoDe(1000, 1024)
    const peticion = new Request(URL_DE_PRUEBA, {
      method: 'POST',
      body: cuerpo,
      headers: { 'content-length': '999999' },
      duplex: 'half',
    } as RequestInit)
    await expect(leerCuerpo(peticion, 4096)).resolves.toBeNull()
    // El flujo precarga un trozo al crearse; lo que importa es que no se siguió leyendo.
    expect(estado.pedidos).toBeLessThanOrEqual(1)
  })

  it('sin content-length corta la lectura cerca del tope y no baja el resto', async () => {
    // Un millón de trozos de un kilobyte (1 GB) que nunca se deberían pedir enteros.
    const { cuerpo, estado } = flujoDe(1_000_000, 1024)
    const peticion = conFlujo(cuerpo)
    expect(peticion.headers.get('content-length')).toBeNull()

    await expect(leerCuerpo(peticion, 4096)).resolves.toBeNull()

    // Cinco trozos pasan de 4096 bytes. El flujo puede precargar un poco, pero nunca acercarse al final.
    expect(estado.pedidos).toBeLessThan(50)
    expect(estado.cancelado).toBe(true)
  })

  it('lee un flujo entero cuando cabe', async () => {
    const { cuerpo } = flujoDe(3, 10)
    await expect(leerCuerpo(conFlujo(cuerpo), 100)).resolves.toBe('a'.repeat(30))
  })
})
