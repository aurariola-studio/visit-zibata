import { describe, expect, it } from 'vitest'
import categoriasJson from '../../data/commercial/categories.json' with { type: 'json' }
import lugaresJson from '../../data/commercial/places.json' with { type: 'json' }
import plazasJson from '../../data/commercial/plazas.json' with { type: 'json' }
import { type CommercialDataset, validateRedirects } from './relations.ts'
import {
  CategoriesFileSchema,
  PlacesFileSchema,
  PlazasFileSchema,
  type Redirect,
} from './schemas.ts'

/*
 * El dataset real con UN local y UNA plaza que ya cambiaron de dirección. Así el id deja de ser igual al
 * slug (en la guía lo son todos), que es justo donde un renombre puede esconder un fallo.
 */
const real: CommercialDataset = {
  categories: CategoriesFileSchema.parse(categoriasJson).categories,
  plazas: PlazasFileSchema.parse(plazasJson).plazas,
  places: PlacesFileSchema.parse(lugaresJson).places,
}
const lugar = real.places[0]
const plaza = real.plazas[0]
if (!lugar || !plaza) throw new Error('el dataset necesita un local y una plaza')
const slugDelLugar = lugar.slug
const slugDeLaPlaza = plaza.slug

const dataset: CommercialDataset = {
  ...real,
  places: real.places.map((fila) =>
    fila.id === lugar.id ? { ...fila, slug: 'direccion-nueva-del-local' } : fila,
  ),
  plazas: real.plazas.map((fila) =>
    fila.id === plaza.id ? { ...fila, slug: 'direccion-nueva-de-la-plaza' } : fila,
  ),
}
const mensajes = (filas: Redirect[], datos = dataset) =>
  validateRedirects(filas, datos)
    .map((asunto) => asunto.message)
    .join(' | ')

describe('un cambio de dirección', () => {
  it('el slug antiguo puede ser el id del propio local: los ids no cambian', () => {
    // Antes del renombre id y slug eran el mismo texto. Es el caso normal y no puede ser un error.
    expect(slugDelLugar).toBe(lugar.id)
    expect(
      mensajes([
        { kind: 'place-slug', id: lugar.id, slug: slugDelLugar },
        { kind: 'plaza-slug', id: plaza.id, slug: slugDeLaPlaza },
      ]),
    ).toBe('')
  })

  it('el slug antiguo no puede ser el actual de nadie: el 301 taparía la ficha', () => {
    expect(
      mensajes([{ kind: 'place-slug', id: lugar.id, slug: 'direccion-nueva-del-local' }]),
    ).toMatch(/Hay un local con ese slug/)
    expect(
      mensajes([{ kind: 'plaza-slug', id: plaza.id, slug: 'direccion-nueva-de-la-plaza' }]),
    ).toMatch(/Hay una plaza con ese slug/)
    // Volver a la dirección de antes sin quitar su fila es justo este caso.
    expect(mensajes([{ kind: 'place-slug', id: lugar.id, slug: slugDelLugar }], real)).toMatch(
      /Hay un local con ese slug/,
    )
  })

  it('el id tiene que existir, vivo o borrado desde el panel', () => {
    expect(mensajes([{ kind: 'place-slug', id: 'no-existe', slug: 'antes' }])).toMatch(
      /no existe ni se borró/,
    )
    expect(mensajes([{ kind: 'plaza-slug', id: 'no-existe', slug: 'antes' }])).toMatch(
      /no existe ni se borró/,
    )
    // Un local borrado después de cambiar de dirección: su fila de borrado da fe del id.
    expect(
      mensajes([
        { kind: 'place-slug', id: 'borrado', slug: 'antes' },
        { kind: 'place', id: 'borrado', slug: 'despues', plazaId: plaza.id, giros: ['g'] },
      ]),
    ).toBe('')
    expect(
      mensajes([
        { kind: 'plaza-slug', id: 'borrada', slug: 'antes' },
        { kind: 'plaza', id: 'borrada', slug: 'despues' },
      ]),
    ).toBe('')
  })

  it('una fila de borrado y una de cambio no comparten slug en el mismo espacio', () => {
    expect(
      mensajes([
        { kind: 'place-slug', id: 'x', slug: 'repetido' },
        { kind: 'place', id: 'x', slug: 'repetido', plazaId: plaza.id, giros: ['g'] },
      ]),
    ).toMatch(/repetido/)
    expect(
      mensajes([
        { kind: 'plaza-slug', id: 'y', slug: 'repetida' },
        { kind: 'plaza', id: 'y', slug: 'repetida' },
      ]),
    ).toMatch(/repetido/)
  })

  it('dos cambios con el mismo slug antiguo se rechazan; un slug igual en otra familia, no', () => {
    expect(
      mensajes([
        { kind: 'place-slug', id: lugar.id, slug: 'x-antiguo' },
        { kind: 'place-slug', id: lugar.id, slug: 'x-antiguo' },
      ]),
    ).toMatch(/repetido/)
    // /lugar/x y /zona/x son direcciones distintas.
    expect(
      mensajes([
        { kind: 'place-slug', id: lugar.id, slug: 'compartido' },
        { kind: 'plaza-slug', id: plaza.id, slug: 'compartido' },
      ]),
    ).toBe('')
  })

  it('el borrado sigue siendo más estricto: ni su slug ni su id pueden ser el slug o el id de uno vivo', () => {
    const borrado = (id: string, slug: string): Redirect => ({
      kind: 'place',
      id,
      slug,
      plazaId: plaza.id,
      giros: ['g'],
    })
    // El id vivo, el slug vivo (distinto del id: justo el caso que solo existe tras un renombre), y los dos
    // cruzados: el id de un borrado que coincide con un slug vivo, y su slug con un id vivo.
    expect(mensajes([borrado('x', lugar.id)])).toMatch(/Hay un local con ese slug o id/)
    expect(mensajes([borrado('x', 'direccion-nueva-del-local')])).toMatch(
      /Hay un local con ese slug o id/,
    )
    expect(mensajes([borrado('direccion-nueva-del-local', 'otro')])).toMatch(
      /Hay un local con ese slug o id/,
    )
    expect(mensajes([borrado(lugar.id, 'otro')])).toMatch(/Hay un local con ese slug o id/)
    expect(mensajes([borrado('x', 'libre')])).toBe('')
  })
})
