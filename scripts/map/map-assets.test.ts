import { readFileSync } from 'node:fs'
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
    const missing = plazas.plazas.filter((plaza) => !withVolume.has(plaza.id)).map((p) => p.id)
    expect(missing, 'ejecuta `npm run map:build`').toEqual([])
  })

  it('el mapa no conserva plazas que ya no existen en el dataset', () => {
    // Una plaza borrada desde el panel deja sus edificios horneados hasta el siguiente `map:build`: se
    // dibujan en gris y sin interacción (no se esconden, porque esos edificios no están en los base y
    // quedaría un hueco). Cualquier otro id huérfano sigue siendo un mapa desactualizado.
    const ids = new Set(plazas.plazas.map((plaza) => plaza.id))
    expect([...withVolume].filter((id) => !ids.has(id) && !borradas.has(id))).toEqual([])
  })

  it('una plaza borrada ya no existe en el dataset: si una vive, su huella sobra', () => {
    const vivas = plazas.plazas.map((plaza) => plaza.id).filter((id) => borradas.has(id))
    expect(vivas, 'un id no puede estar a la vez en plazas.json y como borrado').toEqual([])
  })
})
