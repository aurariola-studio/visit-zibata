import { describe, expect, it } from 'vitest'
import { leerCoordenada } from './contorno.ts'

describe('leerCoordenada', () => {
  it('entiende el punto y la coma decimal', () => {
    expect(leerCoordenada('-100.35')).toBe(-100.35)
    expect(leerCoordenada('-100,35')).toBe(-100.35)
    expect(leerCoordenada('  20.69 ')).toBe(20.69)
    expect(leerCoordenada('20')).toBe(20)
  })

  it('rechaza lo que no es un número, en vez de convertirlo en NaN', () => {
    for (const malo of [
      '',
      'abc',
      '20.',
      '.5',
      '1.2.3',
      '1,2,3',
      '--1',
      '1e5',
      '20 69',
      '20,69,',
    ]) {
      expect(leerCoordenada(malo), malo).toBeNull()
    }
  })
})
