// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { catalogFixture } from '../test/fixtures.ts'
import { tituloDe } from './encabezado.ts'

const catalogo = catalogFixture()
const vacio = {
  infoTopic: null,
  selectedPlaceId: null,
  selectedPlazaId: null,
  activeCategoryId: null,
}
const zona = catalogo.plazas[0]

describe('el título de la pestaña con una zona abierta', () => {
  it('dice qué hay y cómo llegar, igual que el HTML servido', () => {
    expect(tituloDe({ ...vacio, selectedPlazaId: zona?.id ?? null }, catalogo)).toBe(
      `${zona?.name}, qué hay y cómo llegar · Visit Zibatá`,
    )
  })

  it('un local de esa zona conserva su título de siempre', () => {
    const lugar = catalogo.places[0]
    expect(
      tituloDe(
        { ...vacio, selectedPlazaId: zona?.id ?? null, selectedPlaceId: lugar?.id ?? null },
        catalogo,
      ),
    ).toBe(`${lugar?.name} · Visit Zibatá`)
  })
})
