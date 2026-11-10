import { describe, expect, it } from 'vitest'
import real from '../../data/geographic/volumenes-plaza.json' with { type: 'json' }
import { ALTURA_MAX_M, ESCALA_MIN } from './rules.ts'
import { leerVolumenes, reglaDeVolumen, VolumenesPlazaFileSchema } from './volumenes-plaza.ts'

const archivo = {
  default: { height: 8, scale: 0.8, replaceExisting: false },
  plazas: { 'plaza-luna': { height: 12 }, 'paseo-zibata': { scale: 0.62, replaceExisting: true } },
}

describe('reglaDeVolumen', () => {
  it('una plaza sin entrada usa la regla general', () => {
    expect(reglaDeVolumen(archivo, 'otra')).toEqual(archivo.default)
  })

  it('lo que la plaza fija gana y lo demás se hereda', () => {
    expect(reglaDeVolumen(archivo, 'plaza-luna')).toEqual({
      height: 12,
      scale: 0.8,
      replaceExisting: false,
    })
    expect(reglaDeVolumen(archivo, 'paseo-zibata')).toEqual({
      height: 8,
      scale: 0.62,
      replaceExisting: true,
    })
  })
})

describe('VolumenesPlazaFileSchema', () => {
  const con = (cambio: object) => VolumenesPlazaFileSchema.safeParse({ ...archivo, ...cambio })

  it('acepta el archivo real del repositorio', () => {
    expect(leerVolumenes(real).valido).toBe(true)
  })

  it('exige la regla general completa', () => {
    expect(con({ default: { height: 8, scale: 0.8 } }).success).toBe(false)
  })

  it('rechaza alturas y escalas fuera de rango, en los dos extremos', () => {
    expect(con({ plazas: { x: { height: ALTURA_MAX_M + 1 } } }).success).toBe(false)
    expect(con({ plazas: { x: { height: 0.5 } } }).success).toBe(false)
    expect(con({ plazas: { x: { scale: ESCALA_MIN - 0.01 } } }).success).toBe(false)
    expect(con({ plazas: { x: { scale: 1.01 } } }).success).toBe(false)
    expect(con({ plazas: { x: { height: ALTURA_MAX_M, scale: ESCALA_MIN } } }).success).toBe(true)
  })

  it('rechaza claves desconocidas y ids que no son slug', () => {
    expect(con({ plazas: { x: { generar: false } } }).success).toBe(false)
    expect(con({ plazas: { 'No Es Slug': { height: 5 } } }).success).toBe(false)
  })
})

describe('leerVolumenes', () => {
  it('un archivo roto no es valido: no se edita', () => {
    expect(leerVolumenes(undefined).valido).toBe(false)
    expect(leerVolumenes({ default: {} }).valido).toBe(false)
  })
})
