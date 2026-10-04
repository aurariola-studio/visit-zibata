/**
 * Normaliza lo que el propietario captura en el formulario de verificación: texto pegado de las redes
 * del negocio (con emojis, letras decorativas y saltos de línea), teléfonos en cinco formatos distintos
 * y horarios en prosa. La guía publica un solo formato, así que se unifica aquí, en el pipeline, y no
 * en la interfaz.
 */
import type { Hours } from '../../../src/types/domain.ts'

/** Como máximo cuatro líneas (tres saltos): más largo, la ficha deja de leerse de un vistazo. */
export const MAX_DESCRIPTION_LINES = 4

/**
 * Letras decorativas (matemáticas, anchas) a letras normales y viñetas fuera. Los emojis se conservan
 * tal cual los escribió el negocio, y también sus saltos de línea: son parte de cómo se presenta.
 * A partir de la cuarta línea el resto se une con " · " para que la descripción no crezca sin límite.
 */
export function cleanDescription(raw: string | null | undefined): string | null {
  if (!raw) return null
  const lines = raw
    .normalize('NFKC')
    // NFKC parte el acento agudo suelto de "D´Lu": se recompone como apóstrofo.
    .replace(/ ́/g, '’')
    .split(/\r?\n/)
    .map((line) =>
      line
        .replace(/^[\s•·⇥|>-]+/, '')
        .replace(/[\s•·⇥|]+$/, '')
        .replace(/[^\S\n]{2,}/g, ' ')
        .replace(/\s+([.,;:!?])/g, '$1')
        .trim(),
    )
    .filter(Boolean)
  if (lines.length === 0) return null
  // Una línea que ya termina en puntuación no necesita separador al absorber las siguientes.
  const kept = lines.slice(0, MAX_DESCRIPTION_LINES - 1)
  const rest = lines.slice(MAX_DESCRIPTION_LINES - 1)
  const last = rest.reduce<string>(
    (joined, line) => (joined ? `${joined}${/[.!?:]$/.test(joined) ? '' : ' ·'} ${line}` : line),
    '',
  )
  if (last) kept.push(last)
  return kept.join('\n')
}

/** Teléfono mexicano en E.164 (+52…). Devuelve null si no se reconoce: mejor vacío que mal. */
export function cleanPhone(raw: string | null | undefined): string | null {
  if (!raw) return null
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 10) return `+52${digits}`
  if (digits.length === 12 && digits.startsWith('52')) return `+${digits}`
  // Escritos como +52 1 442… (formato viejo, con el 1 de celular).
  if (digits.length === 13 && digits.startsWith('521')) return `+52${digits.slice(3)}`
  return null
}

export const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
type Day = (typeof DAYS)[number]

const DAY_NAMES: [RegExp, Day][] = [
  [/^(lun|lunes|l|mon)$/, 'mon'],
  [/^(mar|martes|m|tue)$/, 'tue'],
  [/^(mi[eé]|mi[eé]r|mi[eé]rc|mi[eé]rcoles|x|wed)$/, 'wed'],
  [/^(jue|jueves|j|thu)$/, 'thu'],
  [/^(vie|viernes|v|fri)$/, 'fri'],
  [/^(sab|sáb|s[aá]bados?|s|sat)$/, 'sat'],
  [/^(dom|domingos?|d|sun)$/, 'sun'],
]

function dayOf(word: string): Day | null {
  const key = word.toLowerCase().replace(/[.:]/g, '').trim()
  return DAY_NAMES.find(([pattern]) => pattern.test(key))?.[1] ?? null
}

/** "lunes a viernes" / "L-D" → los días que abarca. */
function dayRange(from: Day, to: Day): Day[] {
  const start = DAYS.indexOf(from)
  const end = DAYS.indexOf(to)
  const days: Day[] = []
  for (let i = 0; i < 7; i++) {
    const day = DAYS[(start + i) % 7] as Day
    days.push(day)
    if (day === DAYS[end]) break
  }
  return days
}

const TIME = /(\d{1,2})(?::(\d{2}))?\s*(a\.?\s?m\.?|p\.?\s?m\.?)?/i

function toMinutes(hour: number, minute: number, meridiem: string | null): number | null {
  let value = hour
  // "21:00 pm" es un 24 h con el meridiano de adorno: manda la hora.
  if (meridiem === 'pm' && value < 12) value += 12
  if (meridiem === 'am' && value === 12) value = 0
  if (value > 24 || minute > 59) return null
  return (value % 24) * 60 + minute
}

const meridiemOf = (raw: string | undefined): string | null => {
  if (!raw) return null
  const key = raw.toLowerCase().replace(/[.\s]/g, '')
  return key === 'am' || key === 'pm' ? key : null
}

const hhmm = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

/**
 * Un rango ("2–11:30 p.m.", "9:00am - 2:00 pm", "12:00–22:00"). El meridiano puede venir solo al final:
 * se hereda hacia atrás, como lo escribe Google. Sin meridiano y con horas ≤ 12 es ambiguo: se rechaza.
 */
export function parseRange(raw: string): { text: string; ambiguous?: true } | null {
  const parts = raw.split(/\s*(?:–|—|-|\ba\b|\bhasta\b)\s*/i).filter((part) => /\d/.test(part))
  if (parts.length !== 2) return null
  const start = TIME.exec(parts[0] as string)
  const end = TIME.exec(parts[1] as string)
  if (!start || !end) return null
  const endMeridiem = meridiemOf(end[3])
  const startMeridiem =
    meridiemOf(start[3]) ??
    (endMeridiem === 'pm' && Number(start[1]) > Number(end[1]) ? 'am' : endMeridiem)
  const looks24h = /\b(1[3-9]|2[0-4])(:\d{2})?\b/.test(raw)
  if (!startMeridiem && !endMeridiem && !looks24h) return { text: '', ambiguous: true }
  const from = toMinutes(Number(start[1]), Number(start[2] ?? 0), startMeridiem)
  const to = toMinutes(Number(end[1]), Number(end[2] ?? 0), endMeridiem)
  if (from === null || to === null || from === to) return null
  return { text: `${hhmm(from)}-${hhmm(to)}` }
}

const CLOSED = /\b(cerrado|closed|descanso)\b/i

/** Todos los rangos de un texto de día: "9 a.m.–1 p.m., 6–10 p.m." son dos turnos. */
function parseRanges(raw: string): string[] | null | 'ambiguous' {
  if (!/\d/.test(raw)) return CLOSED.test(raw) ? [] : null
  const chunks = raw.split(/\s*(?:,|;|\by\b|\/)\s*/).filter((chunk) => /\d/.test(chunk))
  const ranges: string[] = []
  for (const chunk of chunks) {
    const range = parseRange(chunk)
    if (range?.ambiguous) return 'ambiguous'
    if (range) ranges.push(range.text)
  }
  return ranges.length > 0 ? ranges : null
}

export interface HoursParse {
  hours: Hours | null
  /** Por qué no se pudo leer (para revisarlo a mano), o null si salió bien. */
  problem: string | null
}

const DAY_WORD = '[A-Za-zÁÉÍÓÚáéíóúñ]{1,10}\\.?'

/**
 * Horario a partir del texto libre del formulario. Cubre lo que copia Google ("lunes\t2–11:30 p.m.")
 * y lo que la gente escribe a mano ("L-V 8:00-21:00", "Martes a domingo de 3 a 11 p.m.", "todos los
 * días…"). Si algo queda ambiguo devuelve `problem` y ningún horario: se revisa a mano, no se adivina.
 */
export function parseHoursText(raw: string | null | undefined): HoursParse {
  if (!raw) return { hours: null, problem: null }
  if (!/\d/.test(raw)) return { hours: null, problem: 'sin horas' }
  const text = raw
    .normalize('NFKC')
    .replace(/\p{Extended_Pictographic}|️/gu, ' ')
    .replace(/ /g, ' ')
    .replace(/\b(de|desde|entre|horario|atenci[oó]n|abierto|apertura|hrs?|horas)\b\.?/gi, ' ')
    // "p. m." y "a.m." a una sola palabra: si no, esa "m." suelta se leería como "martes". Solo
    // detrás de una hora: la "a" de "Dom a Miércoles" no es un meridiano.
    .replace(/(?<=\d)\s*([ap])\.?\s?m\.?(?!\p{L})/giu, ' $1m')
    // "S A B" es "SAB": letras sueltas que juntas forman un día.
    .replace(/\b(\p{L})\s(\p{L})\s(\p{L})\b/gu, (match, a, b, c) =>
      dayOf(`${a}${b}${c}`) ? `${a}${b}${c}` : match,
    )

  // Se localizan las menciones de días de una sola pasada ("todos los días", "Lunes a viernes", "Dom")
  // y las horas de cada una son el texto que va hasta la siguiente mención.
  const marks: { days: Day[]; end: number; start: number }[] = []
  const mention = new RegExp(
    `(todos los d[ií]as|diario)|\\b(${DAY_WORD})\\s*(?:-|–|—|&|\\b(?:a|al|hasta|y)\\b)\\s*(${DAY_WORD})(?=\\s*[:.\\t ]|\\s*\\d)|\\b(${DAY_WORD})`,
    'gi',
  )
  for (const match of text.matchAll(mention)) {
    const [whole, everyDay, from, to, single] = match
    const start = match.index ?? 0
    const end = start + whole.length
    if (everyDay) marks.push({ days: [...DAYS], start, end })
    else if (from && to && dayOf(from) && dayOf(to))
      marks.push({ days: dayRange(dayOf(from) as Day, dayOf(to) as Day), start, end })
    else if (single && dayOf(single)) marks.push({ days: [dayOf(single) as Day], start, end })
  }

  const byDay = new Map<Day, string[]>()
  let ambiguous = false
  for (const [index, mark] of marks.entries()) {
    const days = mark.days
    const ranges = parseRanges(text.slice(mark.end, marks[index + 1]?.start ?? text.length).trim())
    if (ranges === 'ambiguous') {
      ambiguous = true
      continue
    }
    if (ranges === null) continue
    // Un día suelto después de un rango lo corrige ("Lunes-Sábado …, Jueves Cerrado").
    for (const day of days) byDay.set(day, ranges)
  }

  // "2:00PM - 1:00AM / DOM-LUN": las horas van antes de los días. Solo si hay un único rango en todo
  // el texto, para no repartir a ciegas un horario que cambia por día.
  if (byDay.size === 0 && marks.length > 0 && !ambiguous) {
    const before = parseRanges(text.slice(0, marks[0]?.start ?? 0).trim())
    if (Array.isArray(before) && before.length === 1) {
      for (const mark of marks) for (const day of mark.days) byDay.set(day, before)
    }
  }

  if (byDay.size === 0)
    return { hours: null, problem: ambiguous ? 'horas sin a.m./p.m.' : 'formato no reconocido' }
  if (ambiguous) return { hours: null, problem: 'horas sin a.m./p.m.' }
  const hours: Hours = {}
  for (const day of DAYS) {
    const ranges = byDay.get(day)
    if (ranges) hours[day] = ranges
  }
  return { hours, problem: null }
}
