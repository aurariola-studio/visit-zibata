import { describe, expect, it } from 'vitest'
import categoriasJson from '../data/commercial/categories.json' with { type: 'json' }
import lugaresJson from '../data/commercial/places.json' with { type: 'json' }
import plazasJson from '../data/commercial/plazas.json' with { type: 'json' }
import volumenesJson from '../data/geographic/volumenes-plaza.json' with { type: 'json' }
import { PlazasFileSchema } from '../src/data/schemas.ts'
import { prepararEdificio } from './edificios.ts'
import { prepararContorno } from './geometria-plaza.ts'

/**
 * Una plaza con `replaceExisting` descarta sus huellas reales: un ajuste de edificio dentro no cambiaría nada y
 * `map:build` lo da por error. El panel lo rechaza al añadir el ajuste y al mover el contorno, no solo avisa.
 */

const HOY = '2026-11-09'
const plazas = PlazasFileSchema.parse(plazasJson).plazas
const REEMPLAZA = 'paseo-zibata' // en volumenes-plaza.json con replaceExisting: true
const LIBRE = 'plaza-luna' // sin entrada: hereda replaceExisting: false
const reemplaza = plazas.find((plaza) => plaza.id === REEMPLAZA)
const libre = plazas.find((plaza) => plaza.id === LIBRE)
if (!reemplaza || !libre) throw new Error('la prueba necesita paseo-zibata y plaza-luna')
if (!volumenesJson.plazas[REEMPLAZA]?.replaceExisting)
  throw new Error('paseo-zibata ya no reemplaza')

const base = {
  categories: categoriasJson as unknown as Record<string, unknown>,
  plazas: plazasJson as unknown as Record<string, unknown>,
  places: lugaresJson as unknown as Record<string, unknown>,
  volumenesPlaza: volumenesJson as unknown as Record<string, unknown>,
}
const conAjustes = (ajustes: unknown[]) => ({ ...base, ajustesEdificios: { ajustes } })
const dataset = { categories: [], plazas, places: [] }

describe('añadir un ajuste de edificio', () => {
  const ajustar = (punto: { lat: number; lng: number }) => ({
    operacion: 'ajustar',
    accion: 'ocultar',
    punto,
    motivo: 'Demolido en 2026',
  })

  it('se rechaza dentro de una plaza que reemplaza sus huellas, y dice cómo seguir', () => {
    const r = prepararEdificio(conAjustes([]), ajustar(reemplaza.coordinates), HOY, dataset)
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.problemas.join(' ')).toContain(reemplaza.name)
    expect(r.problemas.join(' ')).toContain('Apaga')
  })

  it('se acepta dentro de una plaza que no reemplaza', () => {
    expect(prepararEdificio(conAjustes([]), ajustar(libre.coordinates), HOY, dataset).ok).toBe(true)
  })

  it('si la plaza deja de reemplazar, vuelve a aceptarse', () => {
    const sinReemplazo = {
      ...conAjustes([]),
      volumenesPlaza: { ...volumenesJson, plazas: {} } as unknown as Record<string, unknown>,
    }
    expect(prepararEdificio(sinReemplazo, ajustar(reemplaza.coordinates), HOY, dataset).ok).toBe(
      true,
    )
  })

  it('sin el dataset no se sabe en qué plaza cae: no se comprueba (el build sigue siendo la red)', () => {
    expect(prepararEdificio(conAjustes([]), ajustar(reemplaza.coordinates), HOY).ok).toBe(true)
  })
})

describe('mover el contorno de una plaza que reemplaza', () => {
  const anillo = (reemplaza.geometry as { coordinates: number[][][] }).coordinates[0] ?? []
  const lngs = anillo.map((p) => p[0] ?? 0)
  const lats = anillo.map((p) => p[1] ?? 0)
  const [oeste, este] = [Math.min(...lngs), Math.max(...lngs)]
  const [sur, norte] = [Math.min(...lats), Math.max(...lats)]
  const margen = 0.0003
  const seis = (n: number) => Number(n.toFixed(6))
  /** El rectángulo que contiene al contorno actual, ensanchado hacia el oeste. */
  const ensanchado = {
    type: 'Polygon',
    coordinates: [
      [
        [seis(oeste - margen), seis(sur)],
        [seis(este), seis(sur)],
        [seis(este), seis(norte)],
        [seis(oeste - margen), seis(norte)],
        [seis(oeste - margen), seis(sur)],
      ],
    ],
  }
  const afuera = { lat: seis((sur + norte) / 2), lng: seis(oeste - margen / 2) }
  const ajusteEn = (punto: { lat: number; lng: number }) => ({
    accion: 'ocultar',
    punto,
    motivo: 'Demolido',
    creado: HOY,
  })
  // Sola, para que el rectángulo ensanchado no choque con una vecina (otra regla, ya probada en geometria-plaza).
  const sola = {
    categories: [],
    places: [],
    plazas: [{ ...reemplaza, placeIds: [], categories: [] }],
  }
  const mover = (crudo: ReturnType<typeof conAjustes>) =>
    prepararContorno(sola, crudo, { id: REEMPLAZA, geometria: ensanchado }, HOY)

  it('se rechaza si el contorno nuevo se traga un ajuste que antes caía fuera', () => {
    const r = mover(conAjustes([ajusteEn(afuera)]))
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.problemas.join(' ')).toContain('un ajuste de edificio queda')
  })

  it('sin ajustes por el medio, el mismo contorno pasa', () => {
    const r = mover(conAjustes([]))
    if (!r.ok) throw new Error(`debía pasar: ${r.problemas.join(' | ')}`)
    expect(r.ok).toBe(true)
  })

  it('un ajuste que ya estaba dentro del contorno viejo no se le achaca a este cambio', () => {
    const r = mover(conAjustes([ajusteEn(reemplaza.coordinates)]))
    expect(r.ok).toBe(true)
  })

  it('en una plaza que no reemplaza, el mismo contorno pasa aunque se trague el ajuste', () => {
    const sinReemplazo = {
      ...conAjustes([ajusteEn(afuera)]),
      volumenesPlaza: { ...volumenesJson, plazas: {} } as unknown as Record<string, unknown>,
    }
    expect(mover(sinReemplazo).ok).toBe(true)
  })
})
