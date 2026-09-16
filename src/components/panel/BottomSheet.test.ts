import { describe, expect, it } from 'vitest'
import { collapsedHeightFor, expandedHeightFor } from './BottomSheet.tsx'

describe('alturas de la hoja inferior', () => {
  it('expandida deja visibles la barra superior y una franja de mapa en teléfonos verticales', () => {
    for (const viewport of [667, 812, 844, 915, 932]) {
      expect(viewport - expandedHeightFor(viewport)).toBeGreaterThanOrEqual(192)
      expect(expandedHeightFor(viewport)).toBeGreaterThan(collapsedHeightFor('medium', viewport))
    }
  })

  it('en pantallas muy bajas prioriza espacio legible', () => {
    expect(expandedHeightFor(390)).toBe(Math.round(390 * 0.86))
  })
})
