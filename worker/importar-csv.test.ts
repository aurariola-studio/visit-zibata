import { describe, expect, it } from 'vitest'
import categoriasJson from '../data/commercial/categories.json' with { type: 'json' }
import lugaresJson from '../data/commercial/places.json' with { type: 'json' }
import plazasJson from '../data/commercial/plazas.json' with { type: 'json' }
import { type CsvRow, filaAEntrada } from '../src/data/csv-negocio.ts'
import type { CommercialDataset } from '../src/data/relations.ts'
import { CategoriesFileSchema, PlacesFileSchema, PlazasFileSchema } from '../src/data/schemas.ts'
import type { Place } from '../src/types/domain.ts'
import { importarFilas } from './importar-csv.ts'

const dataset: CommercialDataset = {
  categories: CategoriesFileSchema.parse(categoriasJson).categories,
  sectors: CategoriesFileSchema.parse(categoriasJson).sectors,
  plazas: PlazasFileSchema.parse(plazasJson).plazas,
  places: PlacesFileSchema.parse(lugaresJson).places,
}
const crudo = {
  categories: categoriasJson as unknown as Record<string, unknown>,
  plazas: plazasJson as unknown as Record<string, unknown>,
  places: lugaresJson as unknown as Record<string, unknown>,
}
const HOY = '2026-11-09'

const plazaA = dataset.plazas.filter((fila) => fila.active)[0]
const plazaB = dataset.plazas.filter((fila) => fila.active)[1]
if (!plazaA || !plazaB) throw new Error('el dataset necesita dos plazas activas')
const giro = dataset.categories[0]?.giros[0]?.id ?? ''

const fila = (extra: CsvRow = {}): CsvRow => ({
  name: `Tienda de prueba ${plazaA.name}`,
  plaza: plazaA.name,
  giros: giro,
  description: 'Una tienda inventada para la prueba.',
  descriptionEn: 'An invented shop for the test.',
  active: 'sí',
  comprobado: 'sí',
  ...extra,
})

const importar = (filas: CsvRow[]) => importarFilas(filas, dataset, crudo, HOY)

describe('importar un CSV pasa por prepararNegocio', () => {
  it('un local nuevo con "comprobado" se crea active, con campo de hoy, y la fila lo dice', () => {
    const r = importar([fila()])
    expect(r.ok).toBe(true)
    expect(r.creados).toBe(1)
    const nuevo = r.dataset.places.find((place) => place.name.startsWith('Tienda de prueba'))
    expect(nuevo?.verification).toMatchObject({
      status: 'active',
      lastVerifiedAt: HOY,
      sources: [`campo:${HOY}`],
    })
    expect(r.filas[0]?.afirma.join(' ')).toContain(`campo:${HOY}`)
    expect(r.archivos?.lugares).toBeTruthy()
  })

  it('un local nuevo sin procedencia se rechaza: ni el CSV sella solo', () => {
    const r = importar([fila({ comprobado: '', fuentes: '' })])
    expect(r.ok).toBe(false)
    expect(r.filas[0]?.problemas.join(' ')).toMatch(/evidencia nueva/)
    expect(r.archivos).toBeNull()
  })

  it('con una fuente oficial y sin la casilla nace likely_active, y OpenStreetMap solo no basta', () => {
    const buena = importar([
      fila({ comprobado: '', fuentes: 'https://www.instagram.com/una-tienda/' }),
    ])
    expect(buena.ok).toBe(true)
    expect(
      buena.dataset.places.find((place) => place.name.startsWith('Tienda de prueba'))?.verification
        ?.status,
    ).toBe('likely_active')
    const mala = importar([
      fila({ comprobado: '', fuentes: 'https://www.openstreetmap.org/node/3139369680' }),
    ])
    expect(mala.ok).toBe(false)
    expect(mala.filas[0]?.problemas.join(' ')).toMatch(/OpenStreetMap o de apps de reparto/)
  })

  it('no asigna un giro ni "active" por omisión en un local nuevo', () => {
    const sinGiro = importar([fila({ giros: '' })])
    expect(sinGiro.ok).toBe(false)
    expect(sinGiro.filas[0]?.problemas.join(' ')).toMatch(/Falta al menos un giro/)
    const sinActivo = importar([fila({ active: '' })])
    expect(sinActivo.ok).toBe(false)
    expect(sinActivo.filas[0]?.problemas.join(' ')).toMatch(/Indica "active"/)
  })

  it('importa los enlaces de reparto y TikTok', () => {
    const r = importar([
      fila({
        rappi: 'https://www.rappi.com.mx/tiendas/1-prueba',
        uberEats: 'https://www.ubereats.com/mx/store/prueba/x',
        didiFood: 'https://www.didi-food.com/es-MX/store/prueba',
        tiktok: '@tienda.de.prueba',
      }),
    ])
    expect(r.ok).toBe(true)
    const links = r.dataset.places.find((place) => place.name.startsWith('Tienda de prueba'))?.links
    expect(links).toMatchObject({
      rappi: 'https://www.rappi.com.mx/tiendas/1-prueba',
      uberEats: 'https://www.ubereats.com/mx/store/prueba/x',
      didiFood: 'https://www.didi-food.com/es-MX/store/prueba',
      tiktok: 'https://www.tiktok.com/@tienda.de.prueba',
    })
  })

  describe('un local que ya existe', () => {
    const existente = dataset.places.find(
      (place) => place.active && place.links.rappi && place.links.instagram && place.hours,
    ) as Place
    const plazaDe = dataset.plazas.find((otra) => otra.id === existente.plazaId)
    const solo = (extra: CsvRow = {}): CsvRow => ({
      name: existente.name,
      plaza: plazaDe?.name,
      ...extra,
    })

    it('con las columnas vacías no cambia nada de lo que tiene, y su verificación queda idéntica', () => {
      const r = importar([solo()])
      expect(r.ok, r.filas[0]?.problemas.join(' | ')).toBe(true)
      expect(r.actualizados).toBe(1)
      const despues = r.dataset.places.find((place) => place.id === existente.id)
      expect(despues).toEqual(existente)
    })

    it('un campo con valor lo cambia y los demás se conservan', () => {
      const r = importar([solo({ rappi: 'https://www.rappi.com.mx/tiendas/9-nuevo' })])
      expect(r.ok).toBe(true)
      const despues = r.dataset.places.find((place) => place.id === existente.id)
      expect(despues?.links.rappi).toBe('https://www.rappi.com.mx/tiendas/9-nuevo')
      expect(despues?.links.instagram).toBe(existente.links.instagram)
      expect(despues?.hours).toEqual(existente.hours)
      expect(despues?.verification).toEqual(existente.verification)
    })

    it('un id que no existe se rechaza en vez de crear otro local', () => {
      const r = importar([solo({ id: 'no-existe-este-id' })])
      expect(r.ok).toBe(false)
      expect(r.filas[0]?.problemas.join(' ')).toMatch(/id no encontrado/)
    })
  })

  it('importar sin cambiar nada no reescribe los archivos: ni un byte distinto', () => {
    // Una fila en blanco (solo nombre y plaza) por cada local, como un CSV que no trae nada nuevo.
    const filas = dataset.places.map((place) => ({
      name: place.name,
      plaza: dataset.plazas.find((otra) => otra.id === place.plazaId)?.name,
    }))
    const r = importar(filas)
    expect(r.ok, r.filas.flatMap((f) => f.problemas).join(' | ')).toBe(true)
    // Comparar el texto, no los objetos: un toEqual no ve el orden de las claves ni un `undefined`.
    const lugares = (r.archivos?.lugares as { places: unknown[] } | undefined)?.places
    const plazas = (r.archivos?.plazas as { plazas: unknown[] } | undefined)?.plazas
    expect(JSON.stringify(lugares)).toBe(
      JSON.stringify((lugaresJson as { places: unknown[] }).places),
    )
    expect(JSON.stringify(plazas)).toBe(
      JSON.stringify((plazasJson as { plazas: unknown[] }).plazas),
    )
  })

  it('un horario parcial cambia los días que nombra y deja los demás', () => {
    const conHorario = dataset.places.find(
      (place) => place.active && place.hours?.mon && place.hours.tue && place.hours.wed,
    ) as Place
    const plazaDe = dataset.plazas.find((otra) => otra.id === conHorario.plazaId)
    const r = importar([{ name: conHorario.name, plaza: plazaDe?.name, hours: 'mie 07:00-08:00' }])
    expect(r.ok, r.filas[0]?.problemas.join(' | ')).toBe(true)
    const despues = r.dataset.places.find((place) => place.id === conHorario.id)
    expect(despues?.hours?.wed).toEqual(['07:00-08:00'])
    expect(despues?.hours?.mon).toEqual(conHorario.hours?.mon)
    expect(despues?.hours?.tue).toEqual(conHorario.hours?.tue)
  })

  describe('las filas se ven entre sí', () => {
    it('el mismo nombre dos veces en la misma plaza: la segunda se rechaza', () => {
      const r = importar([fila(), fila()])
      expect(r.ok).toBe(false)
      expect(r.filas[0]?.ok).toBe(true)
      expect(r.filas[1]?.ok).toBe(false)
      expect(r.archivos).toBeNull()
    })

    it('"Café X" y "Cafe X" son el mismo local: la segunda fila se rechaza', () => {
      const r = importar([fila({ name: 'Café Doble' }), fila({ name: 'Cafe Doble' })])
      expect(r.ok).toBe(false)
      expect(r.filas[1]?.ok).toBe(false)
    })

    it('el mismo nombre en dos plazas se acepta si los títulos distintos caben', () => {
      const r = importar([
        fila({ name: 'Tienda Repetida', plaza: plazaA.name, description: 'Una tienda en A.' }),
        fila({ name: 'Tienda Repetida', plaza: plazaB.name, description: 'Una tienda en B.' }),
      ])
      expect(r.ok, r.filas.flatMap((f) => f.problemas).join(' | ')).toBe(true)
      expect(r.creados).toBe(2)
      const ids = r.dataset.places.filter((place) => place.name === 'Tienda Repetida')
      expect(new Set(ids.map((place) => place.id)).size).toBe(2)
    })

    it('todo o nada: si una fila falla, no se devuelve ningún archivo', () => {
      const r = importar([fila(), fila({ name: 'Otra tienda', plaza: 'Plaza que no existe' })])
      expect(r.ok).toBe(false)
      expect(r.filas[0]?.ok).toBe(true)
      expect(r.archivos).toBeNull()
    })
  })
})

describe('filaAEntrada', () => {
  it('un horario con nota avisa de que la nota no se importa', () => {
    const r = filaAEntrada(fila({ hours: 'lun 09:00-18:00; nota: cierra en festivos' }), dataset)
    expect(r.entrada).not.toBeNull()
    expect(r.avisos.join(' ')).toMatch(/nota del horario/)
  })

  it('un horario mal escrito se rechaza con el motivo', () => {
    const r = filaAEntrada(fila({ hours: 'siempre abierto' }), dataset)
    expect(r.entrada).toBeNull()
    expect(r.problemas.join(' ')).toMatch(/Horario/)
  })

  it('"fuentes" de un local existente se suman a las que tenía, no las reemplazan', () => {
    const existente = dataset.places.find((place) =>
      place.verification?.sources.some((fuente) => fuente.startsWith('https://')),
    ) as Place
    const plazaDe = dataset.plazas.find((otra) => otra.id === existente.plazaId)
    const r = filaAEntrada(
      { name: existente.name, plaza: plazaDe?.name, fuentes: 'https://ejemplo.test/nueva' },
      dataset,
    )
    const fuentes = (r.entrada?.verificacion as { fuentes: string[] } | undefined)?.fuentes ?? []
    expect(fuentes).toContain('https://ejemplo.test/nueva')
    for (const previa of existente.verification?.sources.filter((f) => f.startsWith('https://')) ??
      []) {
      expect(fuentes).toContain(previa)
    }
  })

  it('una confianza que no existe se rechaza', () => {
    const r = filaAEntrada(fila({ confianza: 'altísima' }), dataset)
    expect(r.entrada).toBeNull()
    expect(r.problemas.join(' ')).toMatch(/confianza no reconocida/)
  })
})
