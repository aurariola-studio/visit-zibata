import { describe, expect, it } from 'vitest'
import categoriasJson from '../../data/commercial/categories.json' with { type: 'json' }

/*
 * Cada giro tiene su propio icono. Un local puede llevar hasta tres giros y la tarjeta dibuja uno por
 * giro: con dos iguales seguidos (Dentista y Ortodoncia, los dos con el mismo diente) parece un error de
 * la guía. Lo decidió el propietario, y esta prueba es la que lo fija: añadir un giro con un icono que ya
 * existe pone en rojo el catálogo, en vez de que la tarjeta lo disimule.
 */
const { categories } = categoriasJson as {
  categories: { id: string; giros: { id: string; icon: string }[] }[]
}

describe('los iconos de los giros', () => {
  it('no se repite ninguno, ni dentro de una categoría ni entre categorías', () => {
    const usados = new Map<string, string[]>()
    for (const categoria of categories) {
      for (const giro of categoria.giros) {
        usados.set(giro.icon, [...(usados.get(giro.icon) ?? []), `${categoria.id}/${giro.id}`])
      }
    }
    const repetidos = [...usados].filter(([, giros]) => giros.length > 1)
    expect(repetidos.map(([icono, giros]) => `${icono}: ${giros.join(', ')}`)).toEqual([])
  })
})
