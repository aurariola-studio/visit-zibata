// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { displayName } from './classify.ts'

describe('displayName', () => {
  it('pasa a capital inicial los nombres que OSM guarda en mayúsculas', () => {
    expect(displayName('PARQUE NANDÚ')).toBe('Parque Nandú')
    expect(displayName('CIRCUITO PASEO DE LAS PITAHAYAS')).toBe('Circuito Paseo de las Pitahayas')
  })

  it('respeta los nombres que ya traen minúsculas', () => {
    expect(displayName('El Jamadi')).toBe('El Jamadi')
    expect(displayName('Universidad Anáhuac Querétaro')).toBe('Universidad Anáhuac Querétaro')
  })
})
