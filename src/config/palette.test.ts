import { describe, expect, it } from 'vitest'
import categories from '../../data/commercial/categories.json'
import plazas from '../../data/commercial/plazas.json'
import { categoryTone, DEFAULT_PLAZA_TONE, NEUTRAL_CATEGORY_TONE, plazaTones } from './palette.ts'

/** Luminancia relativa (WCAG), para comprobar que las dos familias viven en registros distintos. */
function luminance(hex: string): number {
  const value = Number.parseInt(hex.slice(1), 16)
  const channels = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map((part) => {
    const scaled = part / 255
    return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

const activePlazaIds = plazas.plazas.filter((plaza) => plaza.active).map((plaza) => plaza.id)

describe('tonos de plaza', () => {
  it('da un color distinto a cada plaza activa del dataset', () => {
    const tones = plazaTones(activePlazaIds)
    expect(tones.size).toBe(activePlazaIds.length)
    const accents = new Set([...tones.values()].map((tone) => tone.accent))
    expect(accents.size).toBe(activePlazaIds.length)
  })

  it('no cambia el color de las plazas existentes al añadir una al final', () => {
    const before = plazaTones(activePlazaIds)
    const after = plazaTones([...activePlazaIds, 'plaza-futura'])
    for (const id of activePlazaIds) {
      expect(after.get(id), id).toEqual(before.get(id))
    }
  })

  it('la primera plaza conserva el verde de marca', () => {
    expect(plazaTones(activePlazaIds).get(activePlazaIds[0] as string)).toEqual(DEFAULT_PLAZA_TONE)
  })
})

describe('tonos de categoría', () => {
  it('cubre todas las categorías publicadas ("Otros" usa el neutro a propósito)', () => {
    for (const category of categories.categories) {
      if (category.id === 'otros') continue
      expect(categoryTone(category), category.id).not.toEqual(NEUTRAL_CATEGORY_TONE)
    }
  })

  it('una categoría sin tono declarado usa el neutro en vez de romper', () => {
    expect(categoryTone({})).toEqual(NEUTRAL_CATEGORY_TONE)
    expect(categoryTone(undefined)).toEqual(NEUTRAL_CATEGORY_TONE)
  })

  // Una plaza y una categoría no significan lo mismo: aunque compartan familia de color, el tinte de
  // categoría siempre es más claro que cualquier superficie de plaza, así que no se confunden.
  it('los tintes de categoría son más claros que cualquier color de plaza', () => {
    const tones = plazaTones(activePlazaIds)
    const lightestPlaza = Math.max(...[...tones.values()].map((tone) => luminance(tone.site)))
    for (const category of categories.categories) {
      expect(luminance(categoryTone(category).soft), category.id).toBeGreaterThan(lightestPlaza)
    }
  })
})
