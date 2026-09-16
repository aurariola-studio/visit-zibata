/**
 * Horario en texto compacto (columna `hours` del CSV) → objeto `Hours`.
 *
 *   "lun-vie 08:00-22:00; sáb 09:00-14:00, 17:00-23:00; dom cerrado"
 *   "diario 13:00-23:00"
 *
 * Días: lun, mar, mie, jue, vie, sab, dom (con o sin acentos), rangos "lun-vie" y listas "sab,dom".
 * Los días no mencionados quedan sin información.
 */
import { DAY_KEYS, TIME_RANGE_PATTERN } from '../../../src/data/schemas.ts'
import { normalizeText } from '../../../src/lib/text.ts'
import type { DayKey, Hours } from '../../../src/types/domain.ts'

const DAY_ALIASES: Record<string, DayKey> = {
  lun: 'mon',
  lunes: 'mon',
  mar: 'tue',
  martes: 'tue',
  mie: 'wed',
  miercoles: 'wed',
  jue: 'thu',
  jueves: 'thu',
  vie: 'fri',
  viernes: 'fri',
  sab: 'sat',
  sabado: 'sat',
  dom: 'sun',
  domingo: 'sun',
}

function parseDays(token: string): DayKey[] {
  if (token === 'diario' || token === 'todos') return [...DAY_KEYS]
  const days = new Set<DayKey>()
  for (const part of token.split(',')) {
    const [from, to] = part.split('-').map((d) => DAY_ALIASES[d.trim()])
    if (!from) throw new Error(`Día no reconocido: "${part}"`)
    if (to === undefined && part.includes('-'))
      throw new Error(`Rango de días no reconocido: "${part}"`)
    const start = DAY_KEYS.indexOf(from)
    const end = to ? DAY_KEYS.indexOf(to) : start
    for (let i = start; ; i = (i + 1) % DAY_KEYS.length) {
      days.add(DAY_KEYS[i] as DayKey)
      if (i === end) break
    }
  }
  return [...days]
}

function normalizeTime(value: string): string {
  const match = /^(\d{1,2})(?::(\d{2}))?$/.exec(value.trim())
  if (!match) throw new Error(`Hora no válida: "${value}"`)
  return `${match[1]?.padStart(2, '0')}:${match[2] ?? '00'}`
}

export function parseHoursText(text: string): Hours | null {
  if (!normalizeText(text)) return null
  const hours: Hours = {}

  for (const original of text.split(';')) {
    const segment = normalizeText(original)
    if (!segment) continue
    if (segment.startsWith('nota:')) {
      hours.note = original.slice(original.indexOf(':') + 1).trim()
      continue
    }
    const match = /^([a-z,\s-]+?)\s+(cerrado|\d.*)$/.exec(segment)
    if (!match?.[1] || !match[2]) throw new Error(`Segmento de horario no reconocido: "${segment}"`)
    const days = parseDays(match[1].replace(/\s+/g, ''))
    const ranges =
      match[2] === 'cerrado'
        ? []
        : match[2].split(',').map((range) => {
            const [open, close] = range.split('-')
            if (!open || !close) throw new Error(`Rango horario no válido: "${range}"`)
            const value = `${normalizeTime(open)}-${normalizeTime(close)}`
            if (!TIME_RANGE_PATTERN.test(value))
              throw new Error(`Rango horario no válido: "${range}"`)
            return value
          })
    for (const day of days) hours[day] = ranges
  }
  return hours
}
