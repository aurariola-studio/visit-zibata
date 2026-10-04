import { describe, expect, it } from 'vitest'
import categories from '../../../data/commercial/categories.json'
import places from '../../../data/commercial/places.json'
import plazas from '../../../data/commercial/plazas.json'
import { hasCategoryIcon } from '../../components/icons/CategoryIcon.tsx'
import { buildCatalog } from '../../data/catalog.ts'
import type { Category, Place, Plaza } from '../../types/domain.ts'
import { allGiroIds, placeIconName } from './placeIcon.ts'

const catalog = buildCatalog(
  categories.categories as Category[],
  plazas.plazas as Plaza[],
  places.places as Place[],
)
const place = (id: string) => catalog.placeById.get(id) as Place

describe('iconos y taxonomía del dataset publicado', () => {
  it('cada icono de categoría y de giro tiene dibujo propio (sin caer en el genérico)', () => {
    const names = catalog.categories.flatMap((category) => [
      category.icon,
      ...category.giros.map((giro) => giro.icon),
    ])
    for (const name of names) expect(hasCategoryIcon(name), name).toBe(true)
  })

  it('ningún dibujo se repite entre dos giros distintos', () => {
    const vistos = new Map<string, string>()
    for (const category of catalog.categories) {
      for (const giro of category.giros) {
        // El giro general comparte dibujo con su categoría a propósito: son la misma idea.
        if (giro.general) {
          expect(giro.icon, giro.id).toBe(category.icon)
          continue
        }
        expect(vistos.has(giro.icon), `${giro.icon}: ${vistos.get(giro.icon)} y ${giro.id}`).toBe(
          false,
        )
        vistos.set(giro.icon, giro.id)
      }
    }
  })

  it('el icono de un local es el de su primer giro', () => {
    expect(placeIconName(place('honu-sushi'), catalog)).toBe('nigiri')
    expect(placeIconName(place('la-marmota'), catalog)).toBe('drumstick')
    expect(placeIconName(place('boba-station'), catalog)).toBe('boba')
    // Ensaladas, poke y tortas siguen sin compartir dibujo.
    expect(
      new Set(
        ['escarola', 'pio-poke-house', 'tortas-fifthy-fifthy'].map((id) =>
          placeIconName(place(id), catalog),
        ),
      ).size,
    ).toBe(3)
  })

  it('cada local tiene de uno a tres giros entre los dos niveles y todos existen', () => {
    for (const entry of catalog.places) {
      expect(entry.giros.length, entry.id).toBeGreaterThan(0)
      expect(entry.giros.length + entry.secundarios.length, entry.id).toBeLessThanOrEqual(3)
      for (const giro of allGiroIds(entry)) expect(catalog.giroById.has(giro), giro).toBe(true)
      // Un giro no puede estar en los dos niveles a la vez.
      for (const giro of entry.secundarios) expect(entry.giros, entry.id).not.toContain(giro)
    }
  })

  it('el icono de donde solo cabe uno sale de los principales, nunca de un secundario', () => {
    for (const entry of catalog.places) {
      if (entry.secundarios.length === 0) continue
      const nombre = placeIconName(entry, catalog)
      const dibujosSecundarios = entry.secundarios.map((id) => catalog.giroById.get(id)?.icon)
      const dibujosPrincipales = entry.giros.map((id) => catalog.giroById.get(id)?.icon)
      expect(dibujosPrincipales, entry.id).toContain(nombre)
      if (!dibujosPrincipales.includes(dibujosSecundarios[0]))
        expect(dibujosSecundarios, entry.id).not.toContain(nombre)
    }
  })

  it('una cocina entera es el giro general de su estante, nunca un giro suelto', () => {
    // Un giro que abarca una cocina completa es tan ancho como el estante: si cuelga de uno con
    // nombre de plato, el estante promete menos de lo que sirve el local. Por eso la cocina
    // italiana es el general de "Italiana", como la mexicana lo es de "Mexicana".
    for (const category of catalog.categories) {
      for (const giro of category.giros) {
        if (!giro.id.startsWith('cocina-')) continue
        expect(giro.general, `${giro.id} en ${category.id}`).toBe(true)
      }
    }
  })
})
