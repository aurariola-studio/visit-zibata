import { describe, expect, it } from 'vitest'
import categoriasJson from '../../data/commercial/categories.json' with { type: 'json' }
import lugaresJson from '../../data/commercial/places.json' with { type: 'json' }
import plazasJson from '../../data/commercial/plazas.json' with { type: 'json' }
import type { CommercialDataset } from './relations.ts'
import { validateRelations } from './relations.ts'
import { SCHEMA_TYPES } from './rules.ts'
import {
  CategoriesFileSchema,
  PlacesFileSchema,
  PlazasFileSchema,
  SectorSchema,
} from './schemas.ts'

const base = CategoriesFileSchema.parse(categoriasJson)
const plazas = PlazasFileSchema.parse(plazasJson).plazas
const places = PlacesFileSchema.parse(lugaresJson).places

const sector = (id: string, orden: number) => ({
  id,
  slug: { es: id, en: `${id}-en` },
  label: { es: id, en: id },
  icon: 'store',
  order: orden,
})
const SECTORES = [sector('comida', 10), sector('tiendas', 20)]
const sinSector = base.categories.map(({ sectorId: _s, ...categoria }) => categoria)

/** El dato real, con todas las categorías en el sector "comida" salvo las que se indiquen. */
const conSectores = (
  sectors: CommercialDataset['sectors'] = SECTORES,
  sectorDe: (id: string) => string | undefined = () => 'comida',
): CommercialDataset => ({
  sectors,
  categories: base.categories.map((categoria) => ({
    ...categoria,
    sectorId: sectorDe(categoria.id),
  })),
  plazas,
  places,
})
const errores = (dataset: CommercialDataset) =>
  validateRelations(dataset).filter((i) => i.level === 'error')
const avisos = (dataset: CommercialDataset) =>
  validateRelations(dataset).filter((i) => i.level === 'warning')
const mensajes = (dataset: CommercialDataset) => errores(dataset).map((i) => i.message)

describe('los sectores en validateRelations', () => {
  it('el dato actual, sin sectores, sigue sin errores', () => {
    expect(errores({ categories: sinSector, plazas, places })).toEqual([])
  })

  it('con sectores y todas las categorías en uno, no hay errores; uno vacío es solo un aviso', () => {
    const dataset = conSectores()
    expect(errores(dataset)).toEqual([])
    expect(avisos(dataset).map((i) => i.message)).toContain(
      'El sector "tiendas" no tiene categorías',
    )
  })

  it('una categoría con sectorId en un archivo sin sectores es un error', () => {
    const dataset: CommercialDataset = {
      categories: [
        { ...(base.categories[0] as object), sectorId: 'comida' } as never,
        ...base.categories.slice(1),
      ],
      plazas,
      places,
    }
    expect(mensajes(dataset).join(' ')).toContain('no declara sectores')
  })

  it('con sectores, una categoría sin sector es un error', () => {
    const dataset = conSectores(SECTORES, (id) => (id === 'bar' ? undefined : 'comida'))
    expect(mensajes(dataset)).toContain('La categoría "bar" no tiene sector')
  })

  it('con sectores, una categoría que apunta a un sector que no existe es un error', () => {
    const dataset = conSectores(SECTORES, (id) => (id === 'bar' ? 'fantasma' : 'comida'))
    expect(mensajes(dataset).join(' ')).toContain('apunta al sector "fantasma", que no existe')
  })

  it('id y slug de sector repetidos son errores, el slug dentro de cada idioma', () => {
    const repetidoId = conSectores([sector('comida', 10), sector('comida', 20)])
    expect(mensajes(repetidoId)).toContain('ID de sector duplicado: "comida"')
    const repetidoSlug = conSectores([
      sector('comida', 10),
      { ...sector('tiendas', 20), slug: { es: 'comida', en: 'tiendas-en' } },
    ])
    expect(mensajes(repetidoSlug)).toContain('Slug de sector duplicado en es: "comida"')
  })
})

describe('el esquema de sectores', () => {
  it('un sector necesita las dos lenguas en su slug y en su etiqueta, y rechaza claves de más', () => {
    expect(SectorSchema.safeParse(sector('comida', 10)).success).toBe(true)
    expect(
      SectorSchema.safeParse({ ...sector('comida', 10), slug: { es: 'comida' } }).success,
    ).toBe(false)
    expect(SectorSchema.safeParse({ ...sector('comida', 10), giros: [] }).success).toBe(false)
  })

  it('el archivo actual sigue pasando, con o sin la lista de sectores', () => {
    expect(CategoriesFileSchema.safeParse(categoriasJson).success).toBe(true)
    expect(CategoriesFileSchema.safeParse({ ...categoriasJson, sectors: SECTORES }).success).toBe(
      true,
    )
  })

  it('los tipos de schema.org de tienda son los que existen', () => {
    expect(SCHEMA_TYPES).toContain('GroceryStore')
    expect(SCHEMA_TYPES).toContain('ConvenienceStore')
    expect(SCHEMA_TYPES).not.toContain('Supermarket')
  })
})
