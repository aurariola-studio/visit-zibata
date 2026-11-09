import type { Polygon } from 'geojson'
import { describe, expect, it } from 'vitest'
import {
  type AjusteEdificio,
  AjusteEdificioSchema,
  AjustesEdificiosFileSchema,
} from '../../../src/data/ajustes-edificios.ts'
import { Ajustador } from './ajustes.ts'

/** Un cuadrado de ~22 m de lado con la esquina suroeste en (lng, lat). */
const cuadrado = (lng: number, lat: number): Polygon => ({
  type: 'Polygon',
  coordinates: [
    [
      [lng, lat],
      [lng + 0.0002, lat],
      [lng + 0.0002, lat + 0.0002],
      [lng, lat + 0.0002],
      [lng, lat],
    ],
  ],
})

const A = cuadrado(-100.35, 20.69)
const B = cuadrado(-100.349, 20.69)
const dentroDeA = { lat: 20.6901, lng: -100.3499 }

const ocultar = (punto = dentroDeA, extra: Partial<AjusteEdificio> = {}): AjusteEdificio =>
  ({
    accion: 'ocultar',
    punto,
    motivo: 'Ya no existe',
    creado: '2026-11-09',
    ...extra,
  }) as AjusteEdificio
const altura = (alturaM: number, punto = dentroDeA): AjusteEdificio => ({
  accion: 'altura',
  alturaM,
  punto,
  motivo: 'Medida en el sitio',
  creado: '2026-11-09',
})

/** Pasa las huellas por el ajustador como lo hace build-map y devuelve lo que decidió y los problemas. */
function correr(ajustes: AjusteEdificio[], huellas = { a: A, b: B }) {
  const ajustador = new Ajustador(ajustes)
  const decisiones = Object.fromEntries(
    Object.entries(huellas).map(([id, geometria]) => [id, ajustador.para(geometria, id)]),
  )
  return { decisiones, problemas: ajustador.problemas() }
}

describe('aplicar ajustes a las huellas', () => {
  it('oculta solo la huella que contiene el punto', () => {
    const { decisiones, problemas } = correr([ocultar()])
    expect(decisiones.a).toEqual({ ocultar: true })
    expect(decisiones.b).toBeNull()
    expect(problemas).toEqual([])
  })

  it('fija la altura en metros, tal cual, sin ocultar', () => {
    const { decisiones, problemas } = correr([altura(9)])
    expect(decisiones.a).toEqual({ ocultar: false, alturaFijaM: 9 })
    expect(decisiones.b).toBeNull()
    expect(problemas).toEqual([])
  })

  it('sin ajustes no toca nada', () => {
    const { decisiones, problemas } = correr([])
    expect(decisiones).toEqual({ a: null, b: null })
    expect(problemas).toEqual([])
  })

  it('un punto que no cae en ninguna huella es un error, no un salto silencioso', () => {
    const { decisiones, problemas } = correr([ocultar({ lat: 20.7, lng: -100.3 })])
    expect(decisiones).toEqual({ a: null, b: null })
    expect(problemas.join(' ')).toMatch(/no cae dentro de ninguna huella/)
  })

  it('un punto en dos huellas solapadas es un error', () => {
    const solapada = cuadrado(-100.34995, 20.69)
    const { problemas } = correr([ocultar()], { a: A, b: solapada } as never)
    expect(problemas.join(' ')).toMatch(/cae en 2 huellas/)
  })

  it('el id de Overture esperado se comprueba: si el crudo cambió, falla', () => {
    expect(correr([ocultar(dentroDeA, { overtureId: 'a' })]).problemas).toEqual([])
    expect(correr([ocultar(dentroDeA, { overtureId: 'otra' })]).problemas.join(' ')).toMatch(
      /la huella hallada es a, no otra/,
    )
  })

  it('dos ajustes sobre la misma huella son un error', () => {
    const { problemas } = correr([ocultar(), altura(12)])
    expect(problemas.join(' ')).toMatch(/2 ajustes sobre la misma huella/)
  })

  it('una huella con varios polígonos (un MultiPolygon) cuenta como una', () => {
    const ajustador = new Ajustador([ocultar()])
    ajustador.para(A, 'multi')
    ajustador.para(B, 'multi')
    expect(ajustador.problemas()).toEqual([])
  })
})

describe('el esquema del archivo de ajustes', () => {
  const base = { punto: dentroDeA, motivo: 'Ya no existe', creado: '2026-11-09' }

  it('acepta ocultar y fijar altura, y redondea el punto a 6 decimales', () => {
    const ok = AjusteEdificioSchema.parse({
      ...base,
      accion: 'ocultar',
      punto: { lat: 20.69012345678, lng: -100.3499 },
    })
    expect(ok.punto.lat).toBe(20.690123)
    expect(AjusteEdificioSchema.safeParse({ ...base, accion: 'altura', alturaM: 9 }).success).toBe(
      true,
    )
  })

  it('exige la altura en la acción altura, y la prohíbe en ocultar', () => {
    expect(AjusteEdificioSchema.safeParse({ ...base, accion: 'altura' }).success).toBe(false)
    expect(AjusteEdificioSchema.safeParse({ ...base, accion: 'ocultar', alturaM: 9 }).success).toBe(
      false,
    )
  })

  it('rechaza alturas absurdas, un motivo vacío y campos desconocidos', () => {
    for (const alturaM of [0, 0.5, 121, Number.NaN]) {
      expect(
        AjusteEdificioSchema.safeParse({ ...base, accion: 'altura', alturaM }).success,
        String(alturaM),
      ).toBe(false)
    }
    expect(
      AjusteEdificioSchema.safeParse({ ...base, accion: 'ocultar', motivo: ' ' }).success,
    ).toBe(false)
    expect(
      AjusteEdificioSchema.safeParse({ ...base, accion: 'ocultar', nombre: 'x' }).success,
    ).toBe(false)
    expect(AjusteEdificioSchema.safeParse({ ...base, accion: 'borrar' }).success).toBe(false)
  })

  it('el archivo vacío vale y el real también', async () => {
    expect(AjustesEdificiosFileSchema.safeParse({ ajustes: [] }).success).toBe(true)
    const real = (
      await import('../../../data/geographic/ajustes-edificios.json', { with: { type: 'json' } })
    ).default
    expect(AjustesEdificiosFileSchema.safeParse(real).success).toBe(true)
  })
})
