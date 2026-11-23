import { describe, expect, it } from 'vitest'
import { PLAZA_ADDRESS } from '../data/rules.ts'
import { en } from '../i18n/en.ts'
import { es } from '../i18n/es.ts'
import { direccionDeLocal } from './direccion.ts'

const CALLE = 'Av. Paseo de las Pitahayas 55'
const traductor = (catalogo: Record<string, unknown>) => (clave: string) => String(catalogo[clave])
const enEs = traductor(es)
const enEn = traductor(en)

describe('la dirección de un local', () => {
  it('sin interior es la de su plaza', () => {
    expect(direccionDeLocal(CALLE, undefined, enEs, 'es')).toBe(CALLE)
  })

  it('suma edificio, planta y locales, en ese orden, sin zona ni localidad', () => {
    expect(
      direccionDeLocal(
        CALLE,
        { edificio: 'A', planta: 'baja', locales: ['137', '138'] },
        enEs,
        'es',
      ),
    ).toBe('Av. Paseo de las Pitahayas 55, Edificio A, Planta Baja, Locales 137 y 138')
  })

  it('un solo local va en singular y los de tres se unen con coma y "y"', () => {
    expect(direccionDeLocal(CALLE, { locales: ['226'] }, enEs, 'es')).toBe(
      'Av. Paseo de las Pitahayas 55, Local 226',
    )
    expect(direccionDeLocal(CALLE, { locales: ['29', '30', '31'] }, enEs, 'es')).toBe(
      'Av. Paseo de las Pitahayas 55, Locales 29, 30 y 31',
    )
  })

  it('el edificio puede ser un nombre, y una isla se dice con o sin número', () => {
    const calle = 'Circuito Universidades I km 7'
    expect(direccionDeLocal(calle, { edificio: 'Liderazgo' }, enEs, 'es')).toBe(
      'Circuito Universidades I km 7, Edificio Liderazgo',
    )
    expect(direccionDeLocal(calle, { isla: true }, enEs, 'es')).toBe(
      'Circuito Universidades I km 7, Isla',
    )
    expect(direccionDeLocal(CALLE, { isla: '5' }, enEs, 'es')).toBe(
      'Av. Paseo de las Pitahayas 55, Isla 5',
    )
    expect(direccionDeLocal(calle, { edificio: 'Liderazgo' }, enEn, 'en')).toBe(
      'Circuito Universidades I km 7, Building Liderazgo',
    )
  })

  it('en inglés se dice con las palabras del inglés', () => {
    expect(
      direccionDeLocal(CALLE, { planta: 'alta', locales: ['110-A', 'L-131'] }, enEn, 'en'),
    ).toBe('Av. Paseo de las Pitahayas 55, Upper floor, Units 110-A and L-131')
  })

  it('sin dirección de plaza no hay dirección de local', () => {
    expect(direccionDeLocal(null, { locales: ['226'] }, enEs, 'es')).toBeNull()
  })
})

describe('la dirección de una plaza', () => {
  it.each([
    'Av. Paseo de las Pitahayas 55',
    'Av. Paseo de las Pitahayas 9-B',
    'Av. Paseo de las Pitahayas 6A',
    'Av. Paseo de las Pitahayas 1-66',
    'Circuito Universidades I km 7',
    'Av. Paseo de las Pitahayas s/n',
  ])('acepta "%s"', (direccion) => {
    expect(PLAZA_ADDRESS.test(direccion)).toBe(true)
  })

  it.each([
    'Cerro del Huizache 49, Zibatá',
    'Cerro del Huizache 49, 76269 Zibatá, Qro.',
    'Av. Paseo de las Pitahayas 24, locales 22 y 23',
    'Circuito Ceiba, Condesa II',
    'Av. Paseo de las Pitahayas',
    'Av. Paseo de las Pitahayas 55 Zibatá',
    'Av. Paseo de las Pitahayas 55 Querétaro',
    'Av. Paseo de las Pitahayas 55 76269',
  ])('rechaza "%s"', (direccion) => {
    expect(PLAZA_ADDRESS.test(direccion)).toBe(false)
  })
})
