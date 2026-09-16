/**
 * Utilidades de horario. Toda la lógica se evalúa en la zona horaria de Zibatá
 * (Querétaro, sin horario de verano desde 2022), no en la del dispositivo.
 */
import { DAY_KEYS, TIME_RANGE_PATTERN } from '../data/rules.ts'
import type { DayKey, Hours } from '../types/domain.ts'

export const ZIBATA_TIME_ZONE = 'America/Mexico_City'

const MINUTES_PER_DAY = 24 * 60

export interface MinuteRange {
  /** Minutos desde las 00:00 del día al que pertenece el rango. */
  start: number
  /** Puede superar 1440 si el rango cruza la medianoche. */
  end: number
}

export function parseTimeRange(value: string): MinuteRange | null {
  const match = TIME_RANGE_PATTERN.exec(value)
  if (!match) return null
  const [, oh, om, ch, cm] = match
  const start = Number(oh) * 60 + Number(om)
  let end = Number(ch) * 60 + Number(cm)
  if (end > MINUTES_PER_DAY) return null
  if (end <= start) end += MINUTES_PER_DAY
  return { start, end }
}

export function formatMinutes(minutes: number): string {
  const normalized = ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY
  const h = Math.floor(normalized / 60)
  const m = normalized % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** "08:00-22:00" → "08:00–22:00" (guion tipográfico para lectura). */
export function formatRange(value: string): string {
  return value.replace('-', '–')
}

export interface ZonedMoment {
  day: DayKey
  minutes: number
}

const WEEKDAY_TO_KEY: Record<string, DayKey> = {
  Mon: 'mon',
  Tue: 'tue',
  Wed: 'wed',
  Thu: 'thu',
  Fri: 'fri',
  Sat: 'sat',
  Sun: 'sun',
}

export function getZonedMoment(date: Date, timeZone: string = ZIBATA_TIME_ZONE): ZonedMoment {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value
  const day = WEEKDAY_TO_KEY[get('weekday') ?? '']
  if (!day) throw new Error('No se pudo determinar el día de la semana')
  return { day, minutes: Number(get('hour')) * 60 + Number(get('minute')) }
}

function previousDay(day: DayKey): DayKey {
  const index = DAY_KEYS.indexOf(day)
  return DAY_KEYS[(index + DAY_KEYS.length - 1) % DAY_KEYS.length] as DayKey
}

function nextDay(day: DayKey): DayKey {
  const index = DAY_KEYS.indexOf(day)
  return DAY_KEYS[(index + 1) % DAY_KEYS.length] as DayKey
}

function rangesOf(hours: Hours, day: DayKey): MinuteRange[] | undefined {
  const values = hours[day]
  if (values === undefined) return undefined
  return values.map(parseTimeRange).filter((range): range is MinuteRange => range !== null)
}

export function hasAnyHours(hours: Hours | null): hours is Hours {
  return hours !== null && DAY_KEYS.some((day) => hours[day] !== undefined)
}

export type OpenStatus =
  | { state: 'unknown' }
  | { state: 'open'; closesAt: string }
  | { state: 'closed'; opensAt: { day: DayKey; time: string } | null }

export function getOpenStatus(hours: Hours | null, now: ZonedMoment): OpenStatus {
  if (!hasAnyHours(hours)) return { state: 'unknown' }

  const today = rangesOf(hours, now.day)
  const yesterday = rangesOf(hours, previousDay(now.day))

  // Rango de ayer que cruza la medianoche y sigue abierto ahora.
  for (const range of yesterday ?? []) {
    if (range.end > MINUTES_PER_DAY && now.minutes < range.end - MINUTES_PER_DAY) {
      return { state: 'open', closesAt: formatMinutes(range.end) }
    }
  }

  if (today === undefined) return { state: 'unknown' }

  for (const range of today) {
    if (now.minutes >= range.start && now.minutes < range.end) {
      return { state: 'open', closesAt: formatMinutes(range.end) }
    }
  }

  const laterToday = today
    .filter((range) => range.start > now.minutes)
    .sort((a, b) => a.start - b.start)[0]
  if (laterToday) {
    return { state: 'closed', opensAt: { day: now.day, time: formatMinutes(laterToday.start) } }
  }

  let day = now.day
  for (let i = 0; i < DAY_KEYS.length; i++) {
    day = nextDay(day)
    const ranges = rangesOf(hours, day)
    if (ranges === undefined) return { state: 'closed', opensAt: null }
    const first = [...ranges].sort((a, b) => a.start - b.start)[0]
    if (first) return { state: 'closed', opensAt: { day, time: formatMinutes(first.start) } }
  }
  return { state: 'closed', opensAt: null }
}

export interface DaySchedule {
  days: DayKey[]
  /** `null` = sin información; lista vacía = cerrado. */
  ranges: string[] | null
}

/** Agrupa días consecutivos con el mismo horario: Lun–Vie 08:00–22:00, Sáb 09:00–14:00… */
export function groupWeek(hours: Hours): DaySchedule[] {
  const groups: DaySchedule[] = []
  for (const day of DAY_KEYS) {
    const ranges = hours[day] ?? null
    const last = groups.at(-1)
    const same =
      last !== undefined &&
      JSON.stringify(last.ranges) === JSON.stringify(ranges) &&
      last.days.at(-1) === previousDay(day)
    if (same) last.days.push(day)
    else groups.push({ days: [day], ranges })
  }
  return groups
}
