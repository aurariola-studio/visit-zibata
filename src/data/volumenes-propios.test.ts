import { describe, expect, it } from 'vitest'
import { VolumenesPropiosFileSchema } from './volumenes-propios.ts'

const anillo = [
  [-100.3, 20.68],
  [-100.2999, 20.68],
  [-100.2999, 20.6801],
  [-100.3, 20.68],
]

describe('volumenes-propios', () => {
  it('acepta piezas con nombre, altura y anillo', () => {
    const r = VolumenesPropiosFileSchema.safeParse({
      plazas: { intercepta: [{ nombre: 'Cancha 1', height: 0.8, anillo }] },
    })
    expect(r.success).toBe(true)
  })

  it('rechaza una pieza sin anillo cerrado de cuatro posiciones, una altura imposible o una zona vacía', () => {
    const mal = (pieza: object) =>
      VolumenesPropiosFileSchema.safeParse({ plazas: { intercepta: [pieza] } }).success
    expect(mal({ nombre: 'x', height: 1, anillo: anillo.slice(0, 3) })).toBe(false)
    expect(mal({ nombre: 'x', height: 0.1, anillo })).toBe(false)
    expect(mal({ nombre: 'x', height: 99, anillo })).toBe(false)
    expect(VolumenesPropiosFileSchema.safeParse({ plazas: { intercepta: [] } }).success).toBe(false)
  })
})
