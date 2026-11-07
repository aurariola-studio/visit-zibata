import { describe, expect, it } from 'vitest'
import { redireccionDe, redireccionDeLugarBorrado } from './redireccion.ts'

const aDonde = (direccion: string) => redireccionDe(new URL(direccion))

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

describe('un local borrado desde el panel', () => {
  // Datos inventados: la prueba no depende de qué locales haya en la guía.
  const borrados = new Map([['cafe-viejo', 'plaza-uno']])
  const aDondeBorrado = (ruta: string) => redireccionDeLugarBorrado(ruta, borrados)

  it('su ficha pasa a la página de la plaza, en el mismo idioma', () => {
    expect(aDondeBorrado('/es/lugar/cafe-viejo')).toBe('/es/zona/plaza-uno')
    expect(aDondeBorrado('/en/place/cafe-viejo')).toBe('/en/area/plaza-uno')
  })

  it('la dirección sin prefijo llega en un solo salto', () => {
    expect(aDondeBorrado('/lugar/cafe-viejo')).toBe('/es/zona/plaza-uno')
  })

  it('no toca otros locales, otras rutas ni un segmento de otro idioma', () => {
    expect(aDondeBorrado('/es/lugar/otro')).toBeNull()
    expect(aDondeBorrado('/es/zona/cafe-viejo')).toBeNull()
    expect(aDondeBorrado('/en/lugar/cafe-viejo')).toBeNull()
    expect(aDondeBorrado('/es/lugar/cafe-viejo/mas')).toBeNull()
    expect(aDondeBorrado('/es/lugar')).toBeNull()
    expect(aDondeBorrado('/')).toBeNull()
  })

  it('sin locales borrados no hace nada', () => {
    expect(redireccionDeLugarBorrado('/es/lugar/cafe-viejo', new Map())).toBeNull()
  })

  it('el destino siempre es una ruta propia', () => {
    const destino = aDondeBorrado('/es/lugar/cafe-viejo') ?? ''
    expect(destino.startsWith('/')).toBe(true)
    expect(destino.startsWith('//')).toBe(false)
  })
})
