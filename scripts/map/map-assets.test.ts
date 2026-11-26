import { readFileSync } from 'node:fs'
import * as turf from '@turf/turf'
import type { Polygon } from 'geojson'
import { describe, expect, it } from 'vitest'

/**
 * El mapa (public/map) se genera aparte del dataset (`npm run map:build`). Si se añade una plaza y no se
 * regenera, aparece en la lista pero en el mapa es un polígono plano sin volumen (Plaza Luna, 2026-09).
 */
const read = <T>(path: string): T =>
  JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8')) as T
const plazas = read<{ plazas: { id: string }[] }>('../../data/commercial/plazas.json')
/** Las plazas que el panel borró a propósito: su huella queda en `redirects.json`. */
const borradas = new Set(
  read<{ redirects: { kind: string; id: string }[] }>(
    '../../data/commercial/redirects.json',
  ).redirects.flatMap((fila) => (fila.kind === 'plaza' ? [fila.id] : [])),
)

describe('mapa generado al día con el dataset', () => {
  const buildings = read<{ features: { properties: { plazaId: string } }[] }>(
    '../../public/map/plaza-buildings.geojson',
  )
  const withVolume = new Set(buildings.features.map((feature) => feature.properties.plazaId))

  it('cada plaza tiene volumen en el mapa (real o generado)', () => {
    // Un punto de interés no tiene volumen: es un solo negocio, sin contorno.
    const missing = (plazas.plazas as { id: string; tipo?: string }[])
      .filter((plaza) => plaza.tipo !== 'punto' && !withVolume.has(plaza.id))
      .map((p) => p.id)
    expect(missing, 'ejecuta `npm run map:build`').toEqual([])
  })

  it('el mapa no conserva plazas que ya no existen en el dataset', () => {
    // Una plaza borrada desde el panel deja sus edificios horneados hasta el siguiente `map:build`: se
    // dibujan en gris y sin interacción (no se esconden, porque esos edificios no están en los base y
    // quedaría un hueco). Cualquier otro id huérfano sigue siendo un mapa desactualizado.
    const ids = new Set(plazas.plazas.map((plaza) => plaza.id))
    expect([...withVolume].filter((id) => !ids.has(id) && !borradas.has(id))).toEqual([])
  })

  it('cada edificio suelto (volumenes-propios.json) está en los edificios base: teselas, mallas y árboles lo ven', () => {
    const propios = read<{
      sueltos?: { id: string; height: number; anillo: [number, number][] }[]
    }>('../../data/geographic/volumenes-propios.json')
    const base = read<{
      features: { properties: { src: string; height: number }; geometry: Polygon }[]
    }>('../../data/geographic/raw/edificios-base.geojson')
    const propiosEnElMapa = base.features.filter((f) => f.properties.src === 'propio')
    const sueltos = propios.sueltos ?? []
    // Ni uno de menos (se perdería en silencio) ni uno de más (un fantasma de una versión anterior).
    expect(propiosEnElMapa, 'ejecuta `npm run map:build`').toHaveLength(sueltos.length)
    for (const suelto of sueltos) {
      const centro = turf.centroid(turf.polygon([suelto.anillo]))
      const enElMapa = propiosEnElMapa.find((f) => turf.booleanPointInPolygon(centro, f.geometry))
      expect(enElMapa, `"${suelto.id}" no está en edificios-base.geojson`).toBeDefined()
      expect(enElMapa?.properties.height, suelto.id).toBe(suelto.height)
    }
  })

  it('un edificio suelto no es una zona: ninguna zona lleva su identificador', () => {
    const propios = read<{ sueltos?: { id: string }[] }>(
      '../../data/geographic/volumenes-propios.json',
    )
    const ids = new Set(plazas.plazas.map((plaza) => plaza.id))
    expect((propios.sueltos ?? []).filter((suelto) => ids.has(suelto.id))).toEqual([])
  })

  it('una plaza borrada ya no existe en el dataset: si una vive, su huella sobra', () => {
    const vivas = plazas.plazas.map((plaza) => plaza.id).filter((id) => borradas.has(id))
    expect(vivas, 'un id no puede estar a la vez en plazas.json y como borrado').toEqual([])
  })
})
