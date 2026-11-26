import { describe, expect, it } from 'vitest'
import { type Caja, circuloPisa, colocarPuntos, type PorColocar } from './colocarPuntos.ts'

const VISTA: Caja = { left: 0, right: 400, top: 0, bottom: 800 }
const COMPACTO = 14.3
const punto = (extra: Partial<PorColocar> = {}): PorColocar => ({
  id: 'uno',
  x: 200,
  y: 400,
  ancho: 90,
  elegido: false,
  ...extra,
})
const colocar = (puntos: PorColocar[], zoom: number, zonas: Caja[] = []) =>
  colocarPuntos(puntos, zonas, zoom, VISTA, COMPACTO)

describe('colocación de los puntos de interés', () => {
  it('círculo en la vista completa, pin en la intermedia y con nombre de cerca', () => {
    expect(colocar([punto()], 13).get('uno')).toBe('circulo')
    expect(colocar([punto()], 15).get('uno')).toBe('pin')
    expect(colocar([punto()], 16).get('uno')).toBe('derecha')
  })

  it('el nombre busca el lado libre: derecha, izquierda y debajo', () => {
    const aLaDerecha = { left: 215, right: 320, top: 360, bottom: 400 }
    expect(colocar([punto()], 16, [aLaDerecha]).get('uno')).toBe('izquierda')
    // Una zona justo encima, de lado a lado: solo queda colgar, y el pin tampoco cabe arriba.
    const encima = { left: 0, right: 400, top: 340, bottom: 380 }
    expect(colocar([punto()], 16, [encima]).get('uno')).toBe('abajo-derecha')
  })

  it('manda la zona: el punto encimado baja a círculo y, si ni así cabe, no se ve', () => {
    const sobreElPin = { left: 150, right: 250, top: 350, bottom: 390 }
    expect(colocar([punto()], 15, [sobreElPin]).get('uno')).toBe('circulo')
    const sobreElPunto = { left: 150, right: 250, top: 380, bottom: 420 }
    expect(colocar([punto()], 15, [sobreElPunto]).get('uno')).toBe('oculto')
  })

  it('en la vista completa el círculo se queda en su sitio, por debajo de la zona', () => {
    const sobreElPunto = { left: 150, right: 250, top: 380, bottom: 420 }
    expect(colocar([punto()], 13, [sobreElPunto]).get('uno')).toBe('circulo')
    expect(circuloPisa(punto(), [sobreElPunto])).toBe(true)
    expect(circuloPisa(punto({ y: 500 }), [sobreElPunto])).toBe(false)
  })

  it('de dos puntos encimados se ve uno, y ningún nombre tapa a otro punto', () => {
    const juntos = [punto(), punto({ id: 'dos', x: 203 })]
    expect([...colocar(juntos, 13).values()]).toEqual(['circulo', 'oculto'])
    const cercanos = colocar([punto(), punto({ id: 'dos', x: 240 })], 16)
    expect(cercanos.get('uno')).toBe('izquierda')
    expect(cercanos.get('dos')).toBe('derecha')
  })

  it('un punto fuera de la vista no se dibuja a ninguna distancia', () => {
    for (const zoom of [13, 15, 16]) {
      expect(colocar([punto({ x: 900 })], zoom).get('uno')).toBe('oculto')
    }
  })

  it('el elegido lleva nombre a cualquier distancia, aunque no haya sitio', () => {
    expect(colocar([punto({ elegido: true })], 13).get('uno')).toBe('derecha')
    const todo = { left: 0, right: 400, top: 0, bottom: 800 }
    expect(colocar([punto({ elegido: true })], 13, [todo]).get('uno')).toBe('derecha')
  })
})
