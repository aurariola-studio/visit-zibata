import { describe, expect, it } from 'vitest'
import { INITIAL_CAMERA, INITIAL_CAMERA_COMPACT } from '../../config/map.ts'
import { overviewBearing, overviewMargin } from './camera.ts'

describe('encuadre general', () => {
  it('gira el eje largo de Zibatá a vertical solo si el área libre es vertical', () => {
    expect(overviewBearing(true, 390, 520)).toBe(INITIAL_CAMERA_COMPACT.bearing)
    // Teléfono en horizontal: área libre apaisada, rumbo de escritorio.
    expect(overviewBearing(true, 812, 130)).toBe(INITIAL_CAMERA.bearing)
    expect(overviewBearing(false, 900, 1200)).toBe(INITIAL_CAMERA.bearing)
  })

  it('reduce el margen en pantallas bajas para que el encuadre quepa', () => {
    const margin = overviewMargin(844, 390, { top: 165, bottom: 120, left: 16, right: 16 })
    expect(margin.top).toBeLessThanOrEqual(16)
    expect(overviewMargin(1440, 900, { top: 176, bottom: 40, left: 40, right: 88 }).top).toBe(56)
  })
})
