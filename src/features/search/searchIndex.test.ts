import { describe, expect, it } from 'vitest'
import { buildCatalog } from '../../data/catalog.ts'
import { projectDetail } from '../../data/placeParts.ts'
import {
  catalogFixture,
  categoriesFixture,
  makePlace,
  placesFixture,
  plazasFixture,
} from '../../test/fixtures.ts'
import { createSearchIndex } from './searchIndex.ts'

// La descripción llega aparte del catálogo (ver `placeDetails.ts`): el índice la recibe como segundo argumento.
const detalles = new Map(placesFixture.map((lugar) => [lugar.id, projectDetail(lugar)]))
const index = createSearchIndex(catalogFixture(), detalles)

describe('createSearchIndex', () => {
  it('devuelve null con consultas vacías o de una letra', () => {
    expect(index.search('')).toBeNull()
    expect(index.search('  a ')).toBeNull()
    expect(index.search('a b c')).toBeNull()
  })

  it('encuentra por nombre ignorando acentos y mayúsculas', () => {
    expect(index.search('cafe aurora')?.[0]).toBe('cafe-aurora')
    expect(index.search('CAFÉ')).toContain('cafe-aurora')
  })

  it('cualquier giro se busca igual que el primero', () => {
    // Quien busca tacos tiene que encontrar la panadería que además los hace, aunque en la lista el
    // dibujo de delante sea el del pan.
    const propio = createSearchIndex(
      buildCatalog(categoriesFixture, plazasFixture, [
        ...placesFixture,
        makePlace({
          id: 'pan-con-tacos',
          plazaId: 'plaza-norte',
          name: 'Pan con Tacos',
          giros: ['panaderia', 'taqueria'],
        }),
      ]),
    )
    expect(propio.search('taqueria')).toContain('pan-con-tacos')
  })

  it('usa sinónimos de la categoría ("coffee" → café)', () => {
    const results = index.search('coffee')
    expect(results).toContain('cafe-aurora')
    expect(results).toContain('panaderia-trigo')
  })

  it('tolera errores menores de escritura', () => {
    expect(index.search('pizeria')).toContain('pizza-norte')
    expect(index.search('taquria')).toContain('tacos-el-farol')
  })

  it('busca en los giros, la plaza y la descripción', () => {
    expect(index.search('panaderia')).toContain('panaderia-trigo')
    expect(index.search('plaza sur')).toContain('panaderia-trigo')
    expect(index.search('masa madre')).toContain('panaderia-trigo')
  })

  it('mientras el detalle no llega busca por nombre, giro y plaza, y al llegar también por la descripción en los dos idiomas', () => {
    const sinDetalle = createSearchIndex(catalogFixture())
    expect(sinDetalle.search('panaderia')).toContain('panaderia-trigo')
    expect(sinDetalle.search('masa madre') ?? []).not.toContain('panaderia-trigo')
    expect(index.search('masa madre')).toContain('panaderia-trigo')
  })

  it('una palabra que solo está en la descripción en inglés también se encuentra', () => {
    const bilingue = makePlace({
      id: 'pan-de-centeno',
      plazaId: 'plaza-norte',
      name: 'Horno Uno',
      giros: ['panaderia'],
      description: { es: 'Pan artesanal.', en: 'Handmade sourdough bread.' },
    })
    const catalogo = buildCatalog(categoriesFixture, plazasFixture, [...placesFixture, bilingue])
    const sinDetalle = createSearchIndex(catalogo)
    const conDetalle = createSearchIndex(
      catalogo,
      new Map([[bilingue.id, projectDetail(bilingue)]]),
    )
    expect(sinDetalle.search('sourdough') ?? []).not.toContain('pan-de-centeno')
    expect(conDetalle.search('sourdough')).toContain('pan-de-centeno')
  })

  it('con coincidencias literales no añade parecidos lejanos ("pan" no trae "plaza")', () => {
    expect(index.search('pan')).toEqual(['panaderia-trigo'])
    expect(index.search('norte')).toEqual(expect.arrayContaining(['cafe-aurora', 'pizza-norte']))
    expect(index.search('norte')).not.toContain('panaderia-trigo')
  })

  it('prioriza el inicio de palabra sobre la subcadena ("bar" no trae "gastrobar" ni "parrilla")', () => {
    const extra = [
      makePlace({ id: 'golf-bar', plazaId: 'plaza-norte', name: 'Golf Bar' }),
      makePlace({ id: 'gastro', plazaId: 'plaza-norte', name: 'Gastrobar Uno' }),
      makePlace({ id: 'mariscos', plazaId: 'plaza-norte', name: 'Mariscos' }),
    ]
    const extended = createSearchIndex(
      buildCatalog(categoriesFixture, plazasFixture, [...placesFixture, ...extra]),
    )
    expect(extended.search('bar')).toEqual(['golf-bar'])
    // Sin inicio de palabra, cuenta la subcadena literal antes que la aproximación.
    expect(extended.search('isco')).toEqual(['mariscos'])
  })

  it('exige que cada palabra coincida', () => {
    expect(index.search('tacos norte')).toEqual(['tacos-el-farol'])
    expect(index.search('tacos sur')).toEqual([])
  })

  it('ordena por la posición del giro: la primera etiqueta manda sobre la segunda', () => {
    // Es la regla que hace legible una búsqueda por etiqueta: quien busca "café" quiere ver primero
    // los cafés, no los locales que lo llevan de tercer renglón.
    const propio = createSearchIndex(
      buildCatalog(categoriesFixture, plazasFixture, [
        makePlace({
          id: 'cafe-tercero',
          plazaId: 'plaza-norte',
          giros: ['pizza', 'taqueria', 'cafeteria'],
        }),
        makePlace({ id: 'cafe-segundo', plazaId: 'plaza-norte', giros: ['pizza', 'cafeteria'] }),
        makePlace({ id: 'cafe-primero', plazaId: 'plaza-norte', giros: ['cafeteria', 'pizza'] }),
      ]),
    )
    expect(propio.search('cafe')).toEqual(['cafe-primero', 'cafe-segundo', 'cafe-tercero'])
  })

  it('no indexa lugares inactivos', () => {
    expect(index.search('cerrado')).toEqual([])
  })
})
