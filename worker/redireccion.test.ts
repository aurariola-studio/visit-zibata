import { describe, expect, it } from 'vitest'
import type { Redirect } from '../src/data/schemas.ts'
import {
  type Direcciones,
  redireccionDe,
  redireccionDeLugar,
  redireccionDeZona,
  resolverDirecciones,
} from './redireccion.ts'

// Sin direcciones antiguas: estas pruebas son del prefijo /es y de las categorías, y no deben depender de
// qué locales o zonas de la guía real se hayan borrado o cambiado de dirección desde el panel.
const NINGUNA: Direcciones = { lugares: new Map(), zonas: new Map() }
const aDonde = (direccion: string) => redireccionDe(new URL(direccion), NINGUNA)

describe('nunca redirige a otro sitio', () => {
  it('una ruta que empieza con varias barras no produce un Location relativo al protocolo', () => {
    for (const ruta of [
      '//evil.example/x',
      '///evil.example/x/',
      '//evil.example',
      '//',
      '/\\evil.example/x',
      '//es/lugar/tomassa',
      '//en/',
    ]) {
      const destino = aDonde(`https://visitzibata.com${ruta}`)
      if (destino !== null) {
        expect(destino.startsWith('//')).toBe(false)
        expect(destino.startsWith('/')).toBe(true)
      }
    }
  })

  it('las barras iniciales colapsan en la ruta que quería', () => {
    expect(aDonde('https://visitzibata.com//es/lugar/tomassa')).toBe('/es/lugar/tomassa')
    expect(aDonde('https://visitzibata.com//lugar/tomassa')).toBe('/es/lugar/tomassa')
    expect(aDonde('https://visitzibata.com//')).toBe('/es')
  })
})

describe('las direcciones del español sin prefijo', () => {
  it('pasan a /es en un solo salto, con la consulta intacta', () => {
    expect(aDonde('https://visitzibata.com/')).toBe('/es')
    expect(aDonde('https://visitzibata.com/lugar/tomassa')).toBe('/es/lugar/tomassa')
    expect(aDonde('https://visitzibata.com/zona/condesa')).toBe('/es/zona/condesa')
    expect(aDonde('https://visitzibata.com/categoria/italiana')).toBe('/es/categoria/italiana')
    expect(aDonde('https://visitzibata.com/info/privacidad')).toBe('/es/info/privacidad')
    expect(aDonde('https://visitzibata.com/zona/condesa?categoria=bebidas')).toBe(
      '/es/zona/condesa?categoria=bebidas',
    )
    expect(aDonde('https://visitzibata.com/lugar/tomassa/')).toBe('/es/lugar/tomassa')
  })

  it('no toca lo que ya lleva prefijo ni lo que no es una página', () => {
    expect(aDonde('https://visitzibata.com/es')).toBeNull()
    expect(aDonde('https://visitzibata.com/es/lugar/tomassa')).toBeNull()
    expect(aDonde('https://visitzibata.com/en/place/tomassa')).toBeNull()
    expect(aDonde('https://visitzibata.com/api/panel')).toBeNull()
    expect(aDonde('https://visitzibata.com/map/zibata.pmtiles')).toBeNull()
    expect(aDonde('https://visitzibata.com/robots.txt')).toBeNull()
    expect(aDonde('https://visitzibata.com/sitemap.xml')).toBeNull()
    expect(aDonde('https://visitzibata.com/og-image.png')).toBeNull()
    // Una palabra que solo empieza como un segmento no lo es.
    expect(aDonde('https://visitzibata.com/zonas')).toBeNull()
  })

  it('la barra final sobra: cada ruta es un archivo, no una carpeta', () => {
    expect(aDonde('https://visitzibata.com/es/')).toBe('/es')
    expect(aDonde('https://visitzibata.com/es/lugar/tomassa/')).toBe('/es/lugar/tomassa')
    expect(aDonde('https://visitzibata.com/en/area/condesa/')).toBe('/en/area/condesa')
    expect(aDonde('https://visitzibata.com/en/place/tomassa//')).toBe('/en/place/tomassa')
    // Con consulta, la consulta viaja.
    expect(aDonde('https://visitzibata.com/es/zona/condesa/?categoria=bebidas')).toBe(
      '/es/zona/condesa?categoria=bebidas',
    )
    // Y en un solo salto: el filtro de la portada manda sobre la barra.
    expect(aDonde('https://visitzibata.com/es/?categoria=italiana')).toBe('/es/categoria/italiana')
  })
})

describe('los enlaces antiguos de categoría', () => {
  it('la portada con una categoría pasa a su página, en cada idioma', () => {
    expect(aDonde('https://visitzibata.com/?categoria=italiana')).toBe('/es/categoria/italiana')
    expect(aDonde('https://visitzibata.com/es?categoria=italiana')).toBe('/es/categoria/italiana')
    expect(aDonde('https://visitzibata.com/en?category=italian')).toBe('/en/category/italian')
    expect(aDonde('https://visitzibata.com/en/?category=italian')).toBe('/en/category/italian')
  })

  it('no toca la zona con su filtro, que sigue siendo un filtro', () => {
    expect(aDonde('https://visitzibata.com/es/zona/condesa?categoria=bebidas')).toBeNull()
    expect(aDonde('https://visitzibata.com/en/area/condesa?category=drinks')).toBeNull()
  })

  it('no redirige a una página que no existe', () => {
    expect(aDonde('https://visitzibata.com/es?categoria=no-existe')).toBeNull()
    expect(aDonde('https://visitzibata.com/es?categoria=')).toBeNull()
    // El slug del otro idioma no vale en este árbol.
    expect(aDonde('https://visitzibata.com/es?categoria=italian')).toBeNull()
    expect(aDonde('https://visitzibata.com/en?category=italiana')).toBeNull()
    // Ni el parámetro de un idioma en el árbol del otro.
    expect(aDonde('https://visitzibata.com/en?categoria=italiana')).toBeNull()
  })

  it('solo con ese parámetro: con otros se sirve como siempre', () => {
    expect(aDonde('https://visitzibata.com/es?categoria=italiana&utm_source=x')).toBeNull()
    expect(aDonde('https://visitzibata.com/es?utm_source=x')).toBeNull()
    expect(aDonde('https://visitzibata.com/es')).toBeNull()
  })
})

/*
 * Datos inventados y con id distinto del slug: en la guía real son iguales, y una prueba así no
 * distinguiría "resolver por id" de "resolver por slug".
 */
const plazas = [
  { id: 'p-uno', slug: 'plaza-uno', active: true },
  { id: 'p-dos', slug: 'plaza-dos', active: false },
  { id: 'p-tres', slug: 'plaza-tres', active: true },
]
const lugares = [
  { id: 'l-nuevo', slug: 'cafe-nuevo', active: true, plazaId: 'p-uno' },
  { id: 'l-oculto', slug: 'oculto-nuevo', active: false, plazaId: 'p-uno' },
  { id: 'l-en-dos', slug: 'en-dos-nuevo', active: true, plazaId: 'p-dos' },
]
const resolver = (filas: Redirect[], plazasVivas = plazas): Direcciones =>
  resolverDirecciones(filas, plazasVivas, lugares)
const aDondeLugar = (d: Direcciones, ruta: string) => redireccionDeLugar(ruta, d.lugares)
const aDondeZona = (d: Direcciones, ruta: string) => redireccionDeZona(ruta, d.zonas)

describe('un local borrado desde el panel', () => {
  const borrado: Redirect = {
    kind: 'place',
    id: 'l-viejo',
    slug: 'cafe-viejo',
    plazaId: 'p-uno',
    giros: ['g'],
  }
  const d = resolver([borrado])

  it('su ficha pasa a la página de la plaza, en el mismo idioma', () => {
    expect(aDondeLugar(d, '/es/lugar/cafe-viejo')).toBe('/es/zona/plaza-uno')
    expect(aDondeLugar(d, '/en/place/cafe-viejo')).toBe('/en/area/plaza-uno')
  })

  it('la dirección sin prefijo llega en un solo salto', () => {
    expect(aDondeLugar(d, '/lugar/cafe-viejo')).toBe('/es/zona/plaza-uno')
  })

  it('no toca otros locales, otras rutas ni un segmento de otro idioma', () => {
    expect(aDondeLugar(d, '/es/lugar/otro')).toBeNull()
    expect(aDondeLugar(d, '/es/zona/cafe-viejo')).toBeNull()
    expect(aDondeLugar(d, '/en/lugar/cafe-viejo')).toBeNull()
    expect(aDondeLugar(d, '/es/lugar/cafe-viejo/mas')).toBeNull()
    expect(aDondeLugar(d, '/es/lugar')).toBeNull()
    expect(aDondeLugar(d, '/')).toBeNull()
  })

  it('si su plaza no tiene página (inactiva o borrada), va a la portada y no a un 404', () => {
    const enInactiva = resolver([{ ...borrado, plazaId: 'p-dos' }])
    expect(aDondeLugar(enInactiva, '/es/lugar/cafe-viejo')).toBe('/es')
    expect(aDondeLugar(enInactiva, '/en/place/cafe-viejo')).toBe('/en')
    const enBorrada = resolver([
      { ...borrado, plazaId: 'p-vieja' },
      { kind: 'plaza', id: 'p-vieja', slug: 'plaza-vieja' },
    ])
    expect(aDondeLugar(enBorrada, '/lugar/cafe-viejo')).toBe('/es')
  })

  it('el punto de entrada real lo resuelve, también con barra final y con la consulta', () => {
    const real = (direccion: string) => redireccionDe(new URL(direccion), d)
    expect(real('https://visitzibata.com/es/lugar/cafe-viejo')).toBe('/es/zona/plaza-uno')
    expect(real('https://visitzibata.com/es/lugar/cafe-viejo/')).toBe('/es/zona/plaza-uno')
    expect(real('https://visitzibata.com//lugar/cafe-viejo?x=1')).toBe('/es/zona/plaza-uno')
    expect(real('https://visitzibata.com/en/place/cafe-viejo/')).toBe('/en/area/plaza-uno')
    expect(real('https://visitzibata.com/es/lugar/otro')).toBeNull()
  })

  it('sin filas no hace nada', () => {
    expect(aDondeLugar(resolver([]), '/es/lugar/cafe-viejo')).toBeNull()
  })

  it('el destino siempre es una ruta propia', () => {
    const destino = aDondeLugar(d, '/es/lugar/cafe-viejo') ?? ''
    expect(destino.startsWith('/')).toBe(true)
    expect(destino.startsWith('//')).toBe(false)
  })
})

describe('una plaza borrada desde el panel', () => {
  const d = resolver([{ kind: 'plaza', id: 'p-vieja', slug: 'plaza-vieja' }])

  it('su página va a la portada del mismo idioma, con o sin prefijo', () => {
    expect(aDondeZona(d, '/es/zona/plaza-vieja')).toBe('/es')
    expect(aDondeZona(d, '/en/area/plaza-vieja')).toBe('/en')
    expect(aDondeZona(d, '/zona/plaza-vieja')).toBe('/es')
  })

  it('no toca otras plazas, otras familias de ruta ni un segmento de otro idioma', () => {
    expect(aDondeZona(d, '/es/zona/otra')).toBeNull()
    expect(aDondeZona(d, '/es/lugar/plaza-vieja')).toBeNull()
    expect(aDondeZona(d, '/en/zona/plaza-vieja')).toBeNull()
    expect(aDondeZona(d, '/es/zona/plaza-vieja/mas')).toBeNull()
    expect(aDondeZona(d, '/es/zona')).toBeNull()
  })

  it('el punto de entrada real lo resuelve en un salto, con barra final y con la consulta', () => {
    const real = (direccion: string) => redireccionDe(new URL(direccion), d)
    expect(real('https://visitzibata.com/es/zona/plaza-vieja')).toBe('/es')
    expect(real('https://visitzibata.com/es/zona/plaza-vieja/')).toBe('/es')
    expect(real('https://visitzibata.com/zona/plaza-vieja?categoria=bebidas')).toBe('/es')
    expect(real('https://visitzibata.com/en/area/plaza-vieja')).toBe('/en')
    expect(real('https://visitzibata.com/es/zona/otra')).toBeNull()
  })

  it('sin plazas borradas no hace nada', () => {
    expect(aDondeZona(resolver([]), '/es/zona/plaza-vieja')).toBeNull()
  })
})

describe('un local con otra dirección', () => {
  const renombre = (slug: string, id = 'l-nuevo'): Redirect => ({ kind: 'place-slug', id, slug })

  it('la dirección antigua va a la de hoy de ese id, no a un slug escrito en la fila', () => {
    const d = resolver([renombre('cafe-antiguo')])
    expect(aDondeLugar(d, '/es/lugar/cafe-antiguo')).toBe('/es/lugar/cafe-nuevo')
    expect(aDondeLugar(d, '/en/place/cafe-antiguo')).toBe('/en/place/cafe-nuevo')
    expect(aDondeLugar(d, '/lugar/cafe-antiguo')).toBe('/es/lugar/cafe-nuevo')
  })

  it('una cadena lleva de cada dirección antigua directo a la actual, sin saltos', () => {
    const d = resolver([renombre('primero'), renombre('segundo')])
    expect(aDondeLugar(d, '/es/lugar/primero')).toBe('/es/lugar/cafe-nuevo')
    expect(aDondeLugar(d, '/es/lugar/segundo')).toBe('/es/lugar/cafe-nuevo')
    // El destino ya no figura como antiguo: no hay segundo salto.
    expect(aDondeLugar(d, '/es/lugar/cafe-nuevo')).toBeNull()
  })

  it('no confunde dos locales: cada id lleva a su propio slug', () => {
    const d = resolver([renombre('a-1'), renombre('b-1', 'l-en-dos')])
    expect(aDondeLugar(d, '/es/lugar/a-1')).toBe('/es/lugar/cafe-nuevo')
    // El local de la plaza inactiva no tiene ficha: baja a la portada, no a una página que no existe.
    expect(aDondeLugar(d, '/es/lugar/b-1')).toBe('/es')
  })

  it('si luego se oculta, baja a la zona; si la zona también se oculta, a la portada', () => {
    const d = resolver([renombre('oculto-antes', 'l-oculto')])
    expect(aDondeLugar(d, '/es/lugar/oculto-antes')).toBe('/es/zona/plaza-uno')
    const sinZona = resolver(
      [renombre('oculto-antes', 'l-oculto')],
      plazas.map((plaza) => ({ ...plaza, active: false })),
    )
    expect(aDondeLugar(sinZona, '/es/lugar/oculto-antes')).toBe('/es')
  })

  it('si luego se borra, la dirección antigua termina donde termina la del borrado', () => {
    const d = resolver([
      renombre('viejo-a', 'l-viejo'),
      { kind: 'place', id: 'l-viejo', slug: 'viejo-b', plazaId: 'p-uno', giros: ['g'] },
    ])
    expect(aDondeLugar(d, '/es/lugar/viejo-a')).toBe('/es/zona/plaza-uno')
    expect(aDondeLugar(d, '/es/lugar/viejo-b')).toBe('/es/zona/plaza-uno')
    expect(aDondeLugar(d, '/en/place/viejo-a')).toBe('/en/area/plaza-uno')
  })

  it('un id que ya no existe en ningún sitio lleva a la portada, no a un 404', () => {
    const d = resolver([renombre('huerfano', 'l-fantasma')])
    expect(aDondeLugar(d, '/es/lugar/huerfano')).toBe('/es')
  })

  it('no toca las zonas: cada familia tiene su propio espacio de direcciones', () => {
    const d = resolver([renombre('compartido')])
    expect(aDondeZona(d, '/es/zona/compartido')).toBeNull()
  })
})

describe('una plaza con otra dirección', () => {
  const renombre = (slug: string, id = 'p-uno'): Redirect => ({ kind: 'plaza-slug', id, slug })

  it('la zona antigua va a la de hoy de ese id', () => {
    const d = resolver([renombre('zona-antigua')])
    expect(aDondeZona(d, '/es/zona/zona-antigua')).toBe('/es/zona/plaza-uno')
    expect(aDondeZona(d, '/en/area/zona-antigua')).toBe('/en/area/plaza-uno')
    expect(aDondeZona(d, '/zona/zona-antigua')).toBe('/es/zona/plaza-uno')
  })

  it('una cadena lleva de cada dirección antigua directo a la actual', () => {
    const d = resolver([renombre('primera'), renombre('segunda')])
    expect(aDondeZona(d, '/es/zona/primera')).toBe('/es/zona/plaza-uno')
    expect(aDondeZona(d, '/es/zona/segunda')).toBe('/es/zona/plaza-uno')
  })

  it('si la plaza se desactiva o se borra después, va a la portada', () => {
    expect(aDondeZona(resolver([renombre('antes', 'p-dos')]), '/es/zona/antes')).toBe('/es')
    const borrada = resolver([
      renombre('antes', 'p-vieja'),
      { kind: 'plaza', id: 'p-vieja', slug: 'plaza-vieja' },
    ])
    expect(aDondeZona(borrada, '/es/zona/antes')).toBe('/es')
    expect(aDondeZona(borrada, '/es/zona/plaza-vieja')).toBe('/es')
  })

  it('no toca las fichas: cada familia tiene su propio espacio de direcciones', () => {
    const d = resolver([renombre('compartido')])
    expect(aDondeLugar(d, '/es/lugar/compartido')).toBeNull()
  })
})
