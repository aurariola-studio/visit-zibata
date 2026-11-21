import * as turf from '@turf/turf'
import { describe, expect, it } from 'vitest'
import type { Suelto } from '../../../src/data/volumenes-propios.ts'
import { poligonoDe, problemasDeSueltos } from './sueltos.ts'

/** Un cuadrado de unos 55 m de lado, en un punto inventado. */
const cuadrado = (lng: number, lat: number, lado = 0.0005): Suelto['anillo'] => [
  [lng, lat],
  [lng + lado, lat],
  [lng + lado, lat + lado],
  [lng, lat + lado],
  [lng, lat],
]

const suelto = (extra: Partial<Suelto> = {}): Suelto => ({
  id: 'edificio-de-prueba',
  nombre: 'Edificio de prueba',
  height: 9,
  anillo: cuadrado(-100.5, 20.5),
  fuente: 'Contorno inventado para la prueba, sobre una imagen ficticia del 2026-01-01.',
  alturaNota: 'Estimada para la prueba, sin fuente.',
  creado: '2026-01-01',
  retirarCuando: 'Cuando los datos abiertos traigan su huella.',
  ...extra,
})

const huella = (anillo: Suelto['anillo'], id = 'huella-abierta') =>
  turf.polygon([anillo], { id }) as ReturnType<typeof turf.polygon> & {
    properties: { id: string }
  }

const zona = (id: string, anillo: Suelto['anillo']) => ({ id, shape: turf.polygon([anillo]) })

describe('problemasDeSueltos', () => {
  it('un edificio aislado, sin huella abierta ni zona encima, no tiene problemas', () => {
    expect(
      problemasDeSueltos([suelto()], {
        huellas: [huella(cuadrado(-100.4, 20.4))],
        zonas: [zona('otra-zona', cuadrado(-100.3, 20.3))],
      }),
    ).toEqual([])
  })

  it('falla si una huella abierta lo cubre: es la regla "se retira cuando entre en Overture"', () => {
    const problemas = problemasDeSueltos([suelto()], {
      huellas: [huella(cuadrado(-100.5, 20.5))],
      zonas: [],
    })
    expect(problemas).toHaveLength(1)
    expect(problemas[0]).toContain('ya traen su huella')
    expect(problemas[0]).toContain('huella-abierta')
  })

  it('una huella que apenas lo roza no cuenta como duplicado', () => {
    // Cubre menos del 30 % del edificio.
    const problemas = problemasDeSueltos([suelto()], {
      huellas: [huella(cuadrado(-100.5 + 0.00042, 20.5 + 0.00042))],
      zonas: [],
    })
    expect(problemas).toEqual([])
  })

  it('una huella abierta en varias partes también se detecta', () => {
    const partes = turf.multiPolygon([[cuadrado(-100.5, 20.5)], [cuadrado(-100.2, 20.2)]], {
      id: 'multi',
    })
    const problemas = problemasDeSueltos([suelto()], { huellas: [partes], zonas: [] })
    expect(problemas.join(' ')).toContain('multi')
  })

  it('falla si su centro cae dentro del contorno de una zona, y dice dónde va ese edificio', () => {
    const problemas = problemasDeSueltos([suelto()], {
      zonas: [zona('zona-inventada', cuadrado(-100.5001, 20.4999, 0.002))],
    })
    expect(problemas).toHaveLength(1)
    expect(problemas[0]).toContain('zona-inventada')
    expect(problemas[0]).toContain('plazas')
  })

  it('rechaza un anillo sin cerrar, un contorno diminuto y un identificador repetido', () => {
    const abierto = suelto({ anillo: cuadrado(-100.5, 20.5).slice(0, 4) })
    expect(problemasDeSueltos([abierto], { zonas: [] })[0]).toContain('no está cerrado')

    const diminuto = suelto({ anillo: cuadrado(-100.5, 20.5, 0.00001) })
    expect(problemasDeSueltos([diminuto], { zonas: [] })[0]).toContain('demasiado pequeño')

    const repetidos = problemasDeSueltos([suelto(), suelto({ anillo: cuadrado(-100.1, 20.1) })], {
      zonas: [],
    })
    expect(repetidos.join(' ')).toContain('repetido')
  })

  it('sin huellas abiertas (data:validate) solo comprueba lo que no las necesita', () => {
    expect(problemasDeSueltos([suelto()], { zonas: [] })).toEqual([])
  })
})

describe('poligonoDe', () => {
  it('devuelve el polígono con el mismo contorno', () => {
    const poligono = poligonoDe(suelto())
    expect(poligono.type).toBe('Polygon')
    expect(Math.round(turf.area(poligono))).toBe(
      Math.round(turf.area(turf.polygon([cuadrado(-100.5, 20.5)]))),
    )
  })
})
