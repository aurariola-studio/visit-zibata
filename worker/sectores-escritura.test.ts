import { describe, expect, it } from 'vitest'
import categoriasJson from '../data/commercial/categories.json' with { type: 'json' }
import lugaresJson from '../data/commercial/places.json' with { type: 'json' }
import plazasJson from '../data/commercial/plazas.json' with { type: 'json' }
import type { CommercialDataset } from '../src/data/relations.ts'
import { CategoriesFileSchema, PlacesFileSchema, PlazasFileSchema } from '../src/data/schemas.ts'
import { prepararBorradoCategoria } from './borrado-categoria.ts'
import { prepararBorradoGiro } from './borrado-giro.ts'
import { prepararCambioSlug } from './cambio-slug.ts'
import { prepararCategorias } from './categorias.ts'

/**
 * Todo lo que reescribe `categories.json` tiene que dejar intactos los sectores y el `sectorId` de cada categoría:
 * un escritor que arma las filas campo por campo los perdería sin que nada se quejara, y el filtro quedaría sin
 * agrupar. Se prueba con un archivo que sí los declara (el real, más una categoría de tiendas sin locales).
 */

const HOY = '2026-11-10'
const SECTORES = [
  {
    id: 'comida',
    slug: { es: 'comida', en: 'food' },
    label: { es: 'Comida', en: 'Food' },
    icon: 'utensils-crossed',
    order: 10,
  },
  {
    id: 'tiendas',
    slug: { es: 'tiendas', en: 'shops' },
    label: { es: 'Tiendas', en: 'Shops' },
    icon: 'store',
    order: 20,
  },
]
const TIENDAS = {
  id: 'super',
  slug: { es: 'super', en: 'grocery' },
  sectorId: 'tiendas',
  label: { es: 'Súper', en: 'Grocery' },
  icon: 'shopping-cart',
  hue: 210,
  schemaType: 'GroceryStore',
  order: 500,
  synonyms: [],
  giros: [
    {
      id: 'super-general',
      label: { es: 'Súper', en: 'Grocery' },
      icon: 'shopping-cart',
      synonyms: [],
      general: true,
    },
    {
      id: 'super-demo',
      label: { es: 'Súper de prueba', en: 'Test grocery' },
      icon: 'shopping-basket',
      synonyms: [],
    },
  ],
}

const crudoCategorias = {
  ...(categoriasJson as unknown as Record<string, unknown>),
  sectors: SECTORES,
  categories: [
    ...(categoriasJson.categories as Record<string, unknown>[]).map((fila) => {
      const { id, slug, sectorId: _propio, ...resto } = fila
      return { id, slug, sectorId: 'comida', ...resto }
    }),
    TIENDAS,
  ],
}
const crudo = {
  categories: crudoCategorias,
  plazas: plazasJson as unknown as Record<string, unknown>,
  places: lugaresJson as unknown as Record<string, unknown>,
}
const archivo = CategoriesFileSchema.parse(crudoCategorias)
const dataset: CommercialDataset = {
  sectors: archivo.sectors ?? [],
  categories: archivo.categories,
  plazas: PlazasFileSchema.parse(plazasJson).plazas,
  places: PlacesFileSchema.parse(lugaresJson).places,
}

/** Lo que el panel manda: todas las categorías como están, con el cambio que se haga encima. */
const entradaDe = (cambiar: (fila: Record<string, unknown>) => void = () => {}) => ({
  categories: dataset.categories.map((categoria) => {
    const fila: Record<string, unknown> = {
      id: categoria.id,
      label: categoria.label,
      icon: categoria.icon,
      hue: categoria.hue ?? null,
      schemaType: categoria.schemaType ?? null,
      order: categoria.order,
      synonyms: categoria.synonyms,
      giros: categoria.giros.map((giro) => ({ ...giro })),
    }
    cambiar(fila)
    return fila
  }),
})
const sectoresDe = (filas: unknown) =>
  Object.fromEntries(
    (filas as { id: string; sectorId?: string }[]).map((fila) => [fila.id, fila.sectorId]),
  )
const esperados = sectoresDe(crudoCategorias.categories)

describe('el editor de categorías (worker/categorias.ts)', () => {
  it('guardar sin tocar sectores los conserva todos: la lista y el de cada categoría', () => {
    // El panel no manda `sectorId` aquí: un escritor que lo ignora lo dejaría caer.
    const r = prepararCategorias(
      dataset,
      crudo,
      entradaDe((fila) => {
        if (fila.id === 'bar') fila.synonyms = ['cantina']
      }),
      HOY,
    )
    if (!r.ok) throw new Error(r.problemas.join(' | '))
    expect(r.archivoCategorias.sectors).toEqual(SECTORES)
    expect(sectoresDe(r.archivoCategorias.categories)).toEqual(esperados)
  })

  it('una categoría nueva sin sector se rechaza: no hay valor por omisión', () => {
    const entrada = entradaDe()
    entrada.categories.push({
      label: { es: 'Ferretería', en: 'Hardware' },
      icon: 'store',
      hue: 100,
      order: 600,
      synonyms: [],
      giros: [
        { label: { es: 'Ferretería', en: 'Hardware' }, icon: 'store', synonyms: [], general: true },
      ],
    })
    const r = prepararCategorias(dataset, crudo, entrada, HOY)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.problemas.join(' ')).toContain('Elige el sector')
  })

  it('una categoría nueva con sector la guarda con él, y con uno que no existe se rechaza', () => {
    const nueva = (sectorId: string) => {
      const entrada = entradaDe()
      entrada.categories.push({
        sectorId,
        label: { es: 'Ferretería', en: 'Hardware' },
        icon: 'store',
        hue: 100,
        order: 600,
        synonyms: [],
        giros: [
          {
            label: { es: 'Ferretería', en: 'Hardware' },
            icon: 'store',
            synonyms: [],
            general: true,
          },
        ],
      })
      return prepararCategorias(dataset, crudo, entrada, HOY)
    }
    const buena = nueva('tiendas')
    if (!buena.ok) throw new Error(buena.problemas.join(' | '))
    expect(sectoresDe(buena.archivoCategorias.categories).ferreteria).toBe('tiendas')
    const mala = nueva('no-existe')
    expect(mala.ok).toBe(false)
    if (!mala.ok) expect(mala.problemas.join(' ')).toContain('no existe')
  })

  it('mover una categoría de sector se guarda', () => {
    const r = prepararCategorias(
      dataset,
      crudo,
      entradaDe((fila) => {
        if (fila.id === 'bar') fila.sectorId = 'tiendas'
      }),
      HOY,
    )
    if (!r.ok) throw new Error(r.problemas.join(' | '))
    expect(sectoresDe(r.archivoCategorias.categories).bar).toBe('tiendas')
  })

  it('un archivo que no declara sectores rechaza que se le mande uno', () => {
    const sinSectores = {
      ...crudo,
      categories: { ...(categoriasJson as unknown as Record<string, unknown>) },
    }
    const base = CategoriesFileSchema.parse(sinSectores.categories)
    const datos: CommercialDataset = { ...dataset, categories: base.categories }
    delete datos.sectors
    const entrada = {
      categories: base.categories.map((categoria, i) => ({
        id: categoria.id,
        label: categoria.label,
        icon: categoria.icon,
        hue: categoria.hue ?? null,
        schemaType: categoria.schemaType ?? null,
        order: categoria.order,
        synonyms: categoria.synonyms,
        giros: categoria.giros.map((giro) => ({ ...giro })),
        ...(i === 0 ? { sectorId: 'comida' } : {}),
      })),
    }
    const r = prepararCategorias(datos, sinSectores, entrada, HOY)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.problemas.join(' ')).toContain('todavía no declara sectores')
  })
})

describe('los demás escritores de categories.json conservan los sectores', () => {
  it('borrar una categoría (borrado-categoria.ts)', () => {
    const r = prepararBorradoCategoria(dataset, crudo, { id: 'super' }, HOY)
    if (!r.ok) throw new Error(r.problemas.join(' | '))
    expect(r.categorias.sectors).toEqual(SECTORES)
    const { super: _quitada, ...restantes } = esperados
    expect(sectoresDe(r.categorias.categories)).toEqual(restantes)
  })

  it('borrar un giro (borrado-giro.ts)', () => {
    const r = prepararBorradoGiro(dataset, crudo, { id: 'super-demo' }, HOY)
    if (!r.ok) throw new Error(r.problemas.join(' | '))
    expect(r.categorias.sectors).toEqual(SECTORES)
    expect(sectoresDe(r.categorias.categories)).toEqual(esperados)
  })

  it('cambiar la dirección de una categoría (cambio-slug.ts)', () => {
    const r = prepararCambioSlug(
      'category',
      dataset,
      crudo,
      { id: 'super', slug: 'abarrotes', lang: 'es' },
      HOY,
    )
    if (!r.ok) throw new Error(r.problemas.join(' | '))
    expect(r.archivo.sectors).toEqual(SECTORES)
    expect(sectoresDe(r.archivo.categories)).toEqual(esperados)
  })
})
