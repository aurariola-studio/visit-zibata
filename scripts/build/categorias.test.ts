import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Category, Place } from '../../src/types/domain.ts'
import { categoriasDe, conCantidad } from './categorias.ts'

const leer = <T>(archivo: string): T =>
  JSON.parse(readFileSync(`data/commercial/${archivo}`, 'utf8')) as T
const categorias = leer<{ categories: Category[] }>('categories.json').categories
const lugares = leer<{ places: Place[] }>('places.json').places
const deGiro = new Map(categorias.flatMap((c) => c.giros.map((g) => [g.id, c] as const)))

describe('la pertenencia a una categoría', () => {
  it('un local con dos giros de categorías distintas está en las dos, sin repetirse', () => {
    const conDos = lugares.find((p) =>
      p.giros.some((g) => deGiro.get(g)?.id !== deGiro.get(p.giros[0] ?? '')?.id),
    ) as Place
    const ids = categoriasDe(conDos, deGiro).map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.length).toBeGreaterThan(1)
  })
})

describe('las cantidades', () => {
  it('usan el singular y el plural del idioma', () => {
    const mensaje = { one: '{count} lugar', other: '{count} lugares' }
    expect(conCantidad(mensaje, 1, 'es')).toBe('1 lugar')
    expect(conCantidad(mensaje, 26, 'es')).toBe('26 lugares')
  })
})
