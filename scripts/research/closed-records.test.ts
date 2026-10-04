// @vitest-environment node
import { describe, expect, it } from 'vitest'
import places from '../../data/commercial/places.json' with { type: 'json' }
import closed from '../../data/research/closed.json' with { type: 'json' }

/**
 * Un negocio cerrado se conserva con su evidencia (para no volver a investigarlo y para poder
 * revertirlo si reabre), pero nunca llega a la guía. Estas dos reglas son las que hacen mantenible el
 * archivo: quien lo edite a mano (persona o máquina) sabe qué no puede romper.
 */
describe('data/research/closed.json', () => {
  const published = new Set(places.places.map((place) => place.id))

  it('ningún registro cerrado se publica en la guía', () => {
    const leaked = closed.records.filter((record) => published.has(record.id))
    expect(leaked.map((record) => record.id)).toEqual([])
    expect(closed.records.every((record) => record.publishedInApp === false)).toBe(true)
  })

  it('cada registro dice por qué está cerrado, desde cuándo y con qué evidencia', () => {
    for (const record of closed.records) {
      expect(record.id, `${record.name}: sin id`).toMatch(/^[a-z0-9-]+$/)
      expect(record.status, `${record.id}: estado inesperado`).toMatch(/^(closed|removed)$/)
      expect(record.reason?.length ?? 0, `${record.id}: sin motivo`).toBeGreaterThan(0)
      expect(record.lastVerifiedAt, `${record.id}: sin fecha`).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(record.sources.length, `${record.id}: sin fuentes`).toBeGreaterThan(0)
    }
  })
})
