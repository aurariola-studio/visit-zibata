import { describe, expect, it } from 'vitest'
import type { Place, PlaceDetail, PlaceSummary } from '../types/domain.ts'
import {
  PLACE_DETAIL_KEYS,
  PLACE_SUMMARY_KEYS,
  VERIFICATION_DETAIL_KEYS,
  VERIFICATION_NOT_SHIPPED_KEYS,
  VERIFICATION_SUMMARY_KEYS,
} from './placeFields.ts'
import { PlaceSchema, VerificationSchema } from './schemas.ts'

const claves = (esquema: { shape: Record<string, unknown> }) => Object.keys(esquema.shape).sort()

describe('reparto de los campos de un local', () => {
  it('cada campo del esquema está en el resumen o en el detalle, en uno solo', () => {
    const enResumen = new Set<string>(PLACE_SUMMARY_KEYS)
    const enDetalle = new Set<string>([...PLACE_DETAIL_KEYS])
    // `verification` se reparte por dentro y se comprueba aparte.
    const asignadas = [...enResumen, ...enDetalle, 'verification'].sort()
    expect(asignadas).toEqual(claves(PlaceSchema))
    expect([...enResumen].filter((clave) => enDetalle.has(clave))).toEqual([])
  })

  it('cada campo de verification viaja en una pieza, o se declara que no viaja', () => {
    const todas = [
      ...VERIFICATION_SUMMARY_KEYS,
      ...VERIFICATION_DETAIL_KEYS,
      ...VERIFICATION_NOT_SHIPPED_KEYS,
    ].sort()
    expect(todas).toEqual(claves(VerificationSchema))
    expect(new Set(todas).size).toBe(todas.length)
  })

  it('un local entero sirve de resumen y de detalle, y el resumen no trae lo del detalle', () => {
    const lugar = {} as Place
    const resumen: PlaceSummary = lugar
    const detalle: PlaceDetail = lugar
    expect([resumen, detalle]).toHaveLength(2)
    // @ts-expect-error la descripción es del detalle: leerla de un resumen no compila
    const _descripcion = ({} as PlaceSummary).description
    // @ts-expect-error los enlaces son del detalle
    const _enlaces = ({} as PlaceSummary).links
    expect([_descripcion, _enlaces]).toHaveLength(2)
  })
})
