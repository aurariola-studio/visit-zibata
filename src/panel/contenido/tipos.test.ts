import { describe, expect, it } from 'vitest'
import { plural } from './tipos.ts'

describe('plural', () => {
  it('uno va en singular y todo lo demás, incluido cero, en plural', () => {
    expect(plural(1, 'local', 'locales')).toBe('1 local')
    expect(plural(0, 'local', 'locales')).toBe('0 locales')
    expect(plural(2, 'plaza', 'plazas')).toBe('2 plazas')
  })

  it('agrupa los miles como el resto del panel', () => {
    expect(plural(1200, 'visita', 'visitas')).toBe('1,200 visitas')
  })
})
