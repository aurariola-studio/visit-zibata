/**
 * Reglas del modelo de datos sin dependencias: las comparten los esquemas Zod (build, scripts, tests) y la
 * validación ligera de runtime (`runtimeValidation.ts`), para que ambas rechacen exactamente lo mismo en
 * los campos que llegan a la interfaz (identificadores, enlaces, teléfonos, horarios y fotos).
 */

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const

/** "HH:MM-HH:MM" en formato 24 h. Se admite 24:00 como cierre y rangos que cruzan medianoche. */
export const TIME_RANGE_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)-([01]\d|2[0-3]|24(?=:00)):([0-5]\d)$/

export const E164_PATTERN = /^\+[1-9]\d{9,14}$/

export const GOOGLE_PLACE_ID_PATTERN = /^[A-Za-z0-9_-]{10,}$/

export const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i

export const LOCATION_CONFIDENCE = ['high', 'medium', 'low'] as const

/**
 * Resultado de la investigación que respalda un registro (ver research/methodology.md).
 * Solo `active` y `likely_active` pueden publicarse; el resto se conserva en data/research/.
 */
export const RESEARCH_STATUS = [
  'active',
  'likely_active',
  'uncertain',
  'closed',
  'removed',
  'duplicate',
  'rejected',
  'coming_soon',
] as const
export const PUBLISHABLE_STATUS: readonly (typeof RESEARCH_STATUS)[number][] = [
  'active',
  'likely_active',
]

export function isValidTimeRange(value: string): boolean {
  if (!TIME_RANGE_PATTERN.test(value)) return false
  const [open, close] = value.split('-')
  return open !== close
}

/** URL absoluta http(s): nunca `javascript:`, `data:` ni rutas relativas. */
export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return (url.protocol === 'https:' || url.protocol === 'http:') && url.hostname.length > 0
  } catch {
    return false
  }
}

const GOOGLE_MAPS_HOST =
  /^(www\.)?(google\.[a-z.]+|maps\.google\.[a-z.]+|maps\.app\.goo\.gl|goo\.gl)$/i

export function isGoogleMapsUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && GOOGLE_MAPS_HOST.test(url.hostname)
  } catch {
    return false
  }
}

/** Ruta relativa a `public/` (sin "/" inicial ni esquema) o URL https de un almacenamiento propio. */
export function isSafePhotoSrc(value: string): boolean {
  const trimmed = value.trim()
  return trimmed.length > 0 && (/^https:\/\//.test(trimmed) || !/^([a-z]+:|\/)/i.test(trimmed))
}
