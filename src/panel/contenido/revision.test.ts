import { describe, expect, it } from 'vitest'
import {
  coincidencias,
  contarRevisiones,
  diasEntre,
  pideRevision,
  TOPE_DE_COINCIDENCIAS,
} from './revision.ts'
import type { Negocio, PlazaResumen } from './tipos.ts'

const HOY = '2026-11-09'

const negocio = (extra: Partial<Negocio> = {}): Negocio => ({
  id: 'x',
  slug: 'x',
  name: 'Tienda',
  plazaId: 'p',
  giros: [],
  description: null,
  hours: { mon: ['09:00-18:00'] } as unknown as Negocio['hours'],
  location: null,
  googleMapsUri: null,
  phone: null,
  links: {},
  photos: [],
  active: true,
  verification: {
    status: 'active',
    confidence: 'high',
    lastVerifiedAt: '2026-10-01',
    sources: ['campo:2026-10-01'],
  },
  ...extra,
})

const plaza = (id: string, name: string): PlazaResumen => ({
  id,
  slug: id,
  name,
  description: null,
  address: null,
  coordinates: { lat: 0, lng: 0 },
  active: true,
})

describe('diasEntre', () => {
  it('cuenta días enteros y una fecha ilegible es infinitamente vieja', () => {
    expect(diasEntre('2026-11-01', '2026-11-09')).toBe(8)
    expect(diasEntre('2025-11-09', '2026-11-09')).toBe(365)
    expect(diasEntre('no es fecha', HOY)).toBe(Number.POSITIVE_INFINITY)
  })
})

describe('pideRevision', () => {
  const conVerificacion = (lastVerifiedAt: string) =>
    negocio({
      verification: {
        status: 'active',
        confidence: 'high',
        lastVerifiedAt,
        sources: ['campo:2026-01-01'],
      },
    })

  it('la verificación: 12 meses es el umbral de la metodología y 6 meses el aviso', () => {
    expect(pideRevision('verificacion-12', conVerificacion('2025-11-09'), HOY)).toBe(false)
    expect(pideRevision('verificacion-12', conVerificacion('2025-11-08'), HOY)).toBe(true)
    expect(pideRevision('verificacion-6', conVerificacion('2026-05-10'), HOY)).toBe(false)
    expect(pideRevision('verificacion-6', conVerificacion('2026-05-09'), HOY)).toBe(true)
  })

  it('un local sin registro de verificación se revisa: no se puede saber si está al día', () => {
    expect(pideRevision('verificacion-12', negocio({ verification: undefined }), HOY)).toBe(true)
  })

  it('un cierre temporal pasa a revisión a los 90 días, y uno reciente o ausente no', () => {
    const cierre = (desde: string) => negocio({ cierre: { motivo: 'vacaciones', desde } })
    expect(pideRevision('cierre-90', cierre('2026-08-11'), HOY)).toBe(false)
    expect(pideRevision('cierre-90', cierre('2026-08-01'), HOY)).toBe(true)
    expect(pideRevision('cierre-90', negocio(), HOY)).toBe(false)
  })

  it('sin horario conocido es solo hours null, no un horario con días cerrados', () => {
    expect(pideRevision('sin-horario', negocio({ hours: null }), HOY)).toBe(true)
    expect(
      pideRevision(
        'sin-horario',
        negocio({ hours: { sun: [] } as unknown as Negocio['hours'] }),
        HOY,
      ),
    ).toBe(false)
  })

  it('un local oculto no pide revisión', () => {
    const oculto = negocio({ active: false, hours: null })
    for (const clave of ['verificacion-12', 'verificacion-6', 'cierre-90', 'sin-horario']) {
      expect(pideRevision(clave, oculto, HOY)).toBe(false)
    }
  })

  it('una clave desconocida no marca nada', () => {
    expect(pideRevision('otra', negocio({ hours: null }), HOY)).toBe(false)
  })

  it('contarRevisiones cuenta cada criterio por separado', () => {
    const cuentas = contarRevisiones(
      [negocio({ hours: null }), negocio({ hours: null }), negocio()],
      HOY,
    )
    expect(cuentas.find((cuenta) => cuenta.clave === 'sin-horario')?.total).toBe(2)
    expect(cuentas.find((cuenta) => cuenta.clave === 'verificacion-12')?.total).toBe(0)
  })
})

describe('coincidencias', () => {
  const plazas = [plaza('a', 'Plaza Luna'), plaza('b', 'Centro')]
  const locales = [
    negocio({ id: '1', name: 'OXXO', plazaId: 'a' }),
    negocio({ id: '2', name: 'OXXO', plazaId: 'b' }),
    negocio({ id: '3', name: 'Café de la Plaza', plazaId: 'a' }),
    negocio({ id: '4', name: 'Hoyo 19', plazaId: 'b' }),
  ]

  it('un nombre con acentos y mayúsculas distintas encuentra el local', () => {
    const r = coincidencias('cafe DE LA plaza', locales, plazas)
    expect(r.map((c) => c.negocio.id)).toEqual(['3'])
  })

  it('con varios candidatos los lista todos con su plaza, no elige uno', () => {
    const r = coincidencias('oxxo', locales, plazas)
    expect(r.map((c) => c.plaza)).toEqual(['Plaza Luna', 'Centro'])
  })

  it('el nombre exacto va primero', () => {
    const r = coincidencias(
      'Hoyo',
      [negocio({ id: 'a', name: 'Hoyo 19 Golf' }), negocio({ id: 'b', name: 'Hoyo' })],
      plazas,
    )
    expect(r[0]?.negocio.id).toBe('b')
  })

  it('texto sin palabras con peso no encuentra nada', () => {
    expect(coincidencias('ahí', locales, plazas)).toEqual([])
    expect(coincidencias('zibata', locales, plazas)).toEqual([])
    expect(coincidencias('  ', locales, plazas)).toEqual([])
  })

  it('demasiadas coincidencias es demasiado ambiguo: no ofrece ninguna', () => {
    const muchos = Array.from({ length: TOPE_DE_COINCIDENCIAS + 1 }, (_, i) =>
      negocio({ id: String(i), name: `Café ${i}` }),
    )
    expect(coincidencias('café', muchos, plazas)).toEqual([])
    expect(coincidencias('café', muchos.slice(0, TOPE_DE_COINCIDENCIAS), plazas)).toHaveLength(
      TOPE_DE_COINCIDENCIAS,
    )
  })

  it('un identificador con guiones, como el de la URL, también encuentra el local', () => {
    const r = coincidencias('cafe-de-la-plaza', locales, plazas)
    expect(r.map((c) => c.negocio.id)).toEqual(['3'])
  })
})
