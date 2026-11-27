import { describe, expect, it } from 'vitest'
import { pagesFor } from '../../scripts/build/prerender.ts'
import { resolverDirecciones } from '../../worker/redireccion.ts'
import { categoriesFixture, makePlace, makePlaza, plazasFixture } from '../test/fixtures.ts'
import type { Place, Plaza } from '../types/domain.ts'
import { buildCatalog } from './catalog.ts'
import { validateRelations } from './relations.ts'
import { validatePlazas } from './runtimeValidation.ts'

/** Un punto de interés inventado y su único negocio. */
const punto = (cambios: Partial<Plaza> = {}): Plaza => ({
  ...makePlaza({ id: 'punto-prueba', placeIds: ['suelto'], categories: ['pizza'] }),
  tipo: 'punto',
  geometry: undefined,
  ...cambios,
})
const suelto: Place = makePlace({ id: 'suelto', plazaId: 'punto-prueba', name: 'Suelto' })

const erroresDe = (plaza: Plaza, places: Place[] = [suelto]) =>
  validateRelations({ categories: categoriesFixture, plazas: [plaza], places })
    .filter((issue) => issue.level === 'error')
    .map((issue) => issue.message)
    .join(' | ')

describe('reglas de un punto de interés', () => {
  it('uno bien formado no da errores', () => {
    expect(erroresDe(punto())).toBe('')
  })

  it('no lleva contorno, no pasa de un local y no comparte id con él', () => {
    expect(erroresDe(punto({ geometry: makePlaza({ id: 'x' }).geometry }))).toContain('contorno')
    const otro = makePlace({ id: 'otro', plazaId: 'punto-prueba' })
    expect(erroresDe(punto({ placeIds: ['suelto', 'otro'] }), [suelto, otro])).toContain(
      'un solo local',
    )
    const mismoId = makePlace({ id: 'punto-prueba', plazaId: 'punto-prueba' })
    expect(erroresDe(punto({ placeIds: ['punto-prueba'] }), [mismoId])).toContain('compartir su id')
  })

  it('una zona sin contorno sí es un error', () => {
    expect(erroresDe(punto({ tipo: undefined }))).toContain('Una zona necesita contorno')
  })

  it('el navegador conserva el punto sin contorno y omite la zona sin él', () => {
    const zonaRota = { ...punto({ id: 'rota', slug: 'rota' }), tipo: undefined }
    const { valid } = validatePlazas([punto(), zonaRota])
    expect(valid.map((plaza) => plaza.id)).toEqual(['punto-prueba'])
  })
})

describe('un punto de interés fuera de las zonas', () => {
  const catalogo = buildCatalog(
    categoriesFixture,
    [...plazasFixture, punto(), punto({ id: 'apagado', slug: 'apagado', active: false })],
    [suelto],
  )

  it('el catálogo lo guarda aparte: se encuentra por id, no por dirección ni en las listas', () => {
    expect(catalogo.puntos.map((plaza) => plaza.id)).toEqual(['punto-prueba'])
    expect(catalogo.plazaById.has('punto-prueba')).toBe(true)
    expect(catalogo.plazaBySlug.has('punto-prueba')).toBe(false)
    expect(catalogo.plazas.map((plaza) => plaza.id)).not.toContain('punto-prueba')
  })

  it('no tiene página de zona y su ficha no dice que esté dentro de ninguna', () => {
    const paginas = pagesFor(
      'es',
      { categories: categoriesFixture, plazas: [...plazasFixture, punto()], places: [suelto] },
      '/',
      (href) => `https://ejemplo.test${href}`,
    )
    expect(paginas.map((pagina) => pagina.href)).not.toContain('/es/zona/punto-prueba')
    const ficha = paginas.find((pagina) => pagina.href === '/es/lugar/suelto')
    expect(ficha).toBeDefined()
    expect(JSON.stringify(ficha)).not.toContain('containedInPlace')
    expect(JSON.stringify(ficha)).not.toContain('/es/zona/punto-prueba')
  })

  it('una dirección vieja de un local suyo va a la portada, no a una zona que no existe', () => {
    const direcciones = resolverDirecciones(
      [{ kind: 'place', id: 'ido', slug: 'ido', plazaId: 'punto-prueba', giros: ['pizza'] }],
      [punto()],
      [],
    )
    expect(direcciones.lugares.get('ido')).toBeNull()
  })
})
