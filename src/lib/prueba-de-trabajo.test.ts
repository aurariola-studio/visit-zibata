import { describe, expect, it } from 'vitest'
import { BITS, base64url, cumpleLaPrueba, digestDe, secretoConPrueba } from './prueba-de-trabajo.ts'

/** Una huella de mentira, byte a byte, para poder fijar el límite exacto de la comprobación. */
const huellaQueEmpiezaPor = (...bytes: number[]) =>
  new Uint8Array([...bytes, ...new Array(32 - bytes.length).fill(0xff)])

describe('la comprobación', () => {
  it('cuenta ceros de bit en bit, no de byte en byte', () => {
    // 0x00 0x7f son ocho ceros y luego un cero más: nueve, ni uno más.
    const nueve = huellaQueEmpiezaPor(0x00, 0x7f)
    expect(cumpleLaPrueba(nueve, 9)).toBe(true)
    expect(cumpleLaPrueba(nueve, 10)).toBe(false)
  })

  it('rechaza en cuanto aparece un bit en uno', () => {
    expect(cumpleLaPrueba(huellaQueEmpiezaPor(0x80), 1)).toBe(false)
    expect(cumpleLaPrueba(huellaQueEmpiezaPor(0x40), 1)).toBe(true)
    expect(cumpleLaPrueba(huellaQueEmpiezaPor(0x40), 2)).toBe(false)
  })

  it('con cero bits exigidos vale cualquiera, que es lo que apaga la prueba en desarrollo', () => {
    expect(cumpleLaPrueba(huellaQueEmpiezaPor(0xff), 0)).toBe(true)
  })
})

describe('la búsqueda', () => {
  it('devuelve un secreto cuya huella cumple de verdad', async () => {
    // Con pocos bits para que la prueba dure milisegundos; la dificultad real se fija en BITS.
    const secreto = await secretoConPrueba(8)
    expect(secreto).not.toBeNull()
    expect(cumpleLaPrueba(await digestDe(secreto as string), 8)).toBe(true)
  })

  it('el secreto tiene la forma que el Worker valida', async () => {
    const secreto = await secretoConPrueba(4)
    // base64url, 43 caracteres: la misma que acepta `secretoDe` en worker/cuenta.ts.
    expect(secreto).toMatch(/^[A-Za-z0-9_-]{43}$/)
  })

  it('no repite: cada dispositivo busca el suyo', async () => {
    const muchos = new Set(await Promise.all([1, 2, 3, 4, 5].map(() => secretoConPrueba(4))))
    expect(muchos.size).toBe(5)
  })
})

describe('la dificultad', () => {
  it('es la misma regla en el navegador y en el Worker', () => {
    // Este archivo lo importan los dos. Si alguien lo duplicara, el alta empezaría a fallar en
    // producción y en ningún otro sitio.
    expect(BITS).toBeGreaterThanOrEqual(12)
    expect(BITS).toBeLessThanOrEqual(24)
  })

  it('base64url no mete caracteres que haya que escapar en una cabecera', () => {
    expect(base64url(new Uint8Array([251, 255, 254]))).not.toMatch(/[+/=]/)
  })
})
