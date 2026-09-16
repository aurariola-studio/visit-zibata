import { describe, expect, it } from 'vitest'
import type { Hours } from '../types/domain.ts'
import {
  formatMinutes,
  getOpenStatus,
  getZonedMoment,
  groupWeek,
  hasAnyHours,
  parseTimeRange,
} from './hours.ts'

const at = (day: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun', time: string) => {
  const [h, m] = time.split(':').map(Number)
  return { day, minutes: (h ?? 0) * 60 + (m ?? 0) }
}

describe('parseTimeRange', () => {
  it('convierte a minutos y detecta rangos que cruzan medianoche', () => {
    expect(parseTimeRange('08:00-22:30')).toEqual({ start: 480, end: 1350 })
    expect(parseTimeRange('18:00-02:00')).toEqual({ start: 1080, end: 1560 })
    expect(parseTimeRange('09:00-24:00')).toEqual({ start: 540, end: 1440 })
    expect(parseTimeRange('9-10')).toBeNull()
  })

  it('formatea minutos', () => {
    expect(formatMinutes(1560)).toBe('02:00')
    expect(formatMinutes(0)).toBe('00:00')
  })
})

describe('getZonedMoment', () => {
  it('usa la zona horaria de Querétaro, no la del dispositivo', () => {
    // 2026-09-14 03:30 UTC = domingo 13 de septiembre, 21:30 en Ciudad de México (UTC-6).
    expect(getZonedMoment(new Date('2026-09-14T03:30:00Z'))).toEqual({
      day: 'sun',
      minutes: 21 * 60 + 30,
    })
  })
})

describe('getOpenStatus', () => {
  const hours: Hours = {
    mon: ['08:00-14:00', '17:00-22:00'],
    tue: ['08:00-22:00'],
    wed: [],
    fri: ['18:00-02:00'],
  }

  it('sin datos es desconocido', () => {
    expect(getOpenStatus(null, at('mon', '10:00'))).toEqual({ state: 'unknown' })
    expect(getOpenStatus({ note: 'Consultar' }, at('mon', '10:00'))).toEqual({ state: 'unknown' })
    expect(hasAnyHours({ note: 'x' })).toBe(false)
  })

  it('abierto dentro de un turno', () => {
    expect(getOpenStatus(hours, at('mon', '13:59'))).toEqual({ state: 'open', closesAt: '14:00' })
  })

  it('cerrado entre turnos indica la próxima apertura del día', () => {
    expect(getOpenStatus(hours, at('mon', '15:00'))).toEqual({
      state: 'closed',
      opensAt: { day: 'mon', time: '17:00' },
    })
  })

  it('cerrado todo el día: busca el siguiente día con horario, saltando días cerrados', () => {
    const week: Hours = { mon: ['09:00-17:00'], tue: [], wed: ['10:00-18:00'] }
    expect(getOpenStatus(week, at('mon', '18:00'))).toEqual({
      state: 'closed',
      opensAt: { day: 'wed', time: '10:00' },
    })
    expect(getOpenStatus(week, at('tue', '12:00'))).toEqual({
      state: 'closed',
      opensAt: { day: 'wed', time: '10:00' },
    })
  })

  it('si el siguiente día no tiene información, no inventa la próxima apertura', () => {
    expect(getOpenStatus(hours, at('wed', '12:00'))).toEqual({ state: 'closed', opensAt: null })
    expect(getOpenStatus(hours, at('tue', '23:00'))).toEqual({ state: 'closed', opensAt: null })
  })

  it('un turno que cruza la medianoche sigue abierto al día siguiente', () => {
    expect(getOpenStatus(hours, at('sat', '01:30'))).toEqual({ state: 'open', closesAt: '02:00' })
    expect(getOpenStatus(hours, at('fri', '23:00'))).toEqual({ state: 'open', closesAt: '02:00' })
  })

  it('día sin información es desconocido', () => {
    expect(getOpenStatus(hours, at('thu', '12:00'))).toEqual({ state: 'unknown' })
  })
})

describe('groupWeek', () => {
  it('agrupa días consecutivos con el mismo horario', () => {
    const groups = groupWeek({
      mon: ['09:00-18:00'],
      tue: ['09:00-18:00'],
      wed: ['09:00-18:00'],
      thu: ['09:00-20:00'],
      sat: [],
      sun: [],
    })
    expect(groups).toEqual([
      { days: ['mon', 'tue', 'wed'], ranges: ['09:00-18:00'] },
      { days: ['thu'], ranges: ['09:00-20:00'] },
      { days: ['fri'], ranges: null },
      { days: ['sat', 'sun'], ranges: [] },
    ])
  })
})
