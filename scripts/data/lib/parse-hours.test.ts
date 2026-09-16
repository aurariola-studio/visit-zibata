// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { HoursSchema } from '../../../src/data/schemas.ts'
import { parseHoursText } from './parse-hours.ts'

describe('parseHoursText', () => {
  it('interpreta rangos de días, listas, cerrado y varios turnos', () => {
    const hours = parseHoursText(
      'lun-vie 8:00-22:00; sáb,dom 09:00-14:00, 17:00-23:30; mié cerrado',
    )
    expect(hours).toEqual({
      mon: ['08:00-22:00'],
      tue: ['08:00-22:00'],
      wed: [],
      thu: ['08:00-22:00'],
      fri: ['08:00-22:00'],
      sat: ['09:00-14:00', '17:00-23:30'],
      sun: ['09:00-14:00', '17:00-23:30'],
    })
    expect(HoursSchema.safeParse(hours).success).toBe(true)
  })

  it('acepta "diario", horas sin minutos, rangos que cruzan medianoche y notas', () => {
    expect(parseHoursText('diario 13-2; nota: Cocina cierra a la 1:00')).toEqual({
      mon: ['13:00-02:00'],
      tue: ['13:00-02:00'],
      wed: ['13:00-02:00'],
      thu: ['13:00-02:00'],
      fri: ['13:00-02:00'],
      sat: ['13:00-02:00'],
      sun: ['13:00-02:00'],
      note: 'Cocina cierra a la 1:00',
    })
  })

  it('admite rangos de días que cruzan el fin de semana', () => {
    expect(Object.keys(parseHoursText('vie-lun 18:00-23:00') ?? {})).toEqual([
      'fri',
      'sat',
      'sun',
      'mon',
    ])
  })

  it('devuelve null para texto vacío', () => {
    expect(parseHoursText('   ')).toBeNull()
  })

  it('lanza errores descriptivos', () => {
    expect(() => parseHoursText('lunes a viernes 8-22')).toThrow(/no reconocid/)
    expect(() => parseHoursText('lun 25:00-26:00')).toThrow(/no válid/)
  })
})
