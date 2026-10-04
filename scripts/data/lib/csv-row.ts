/**
 * Conversión de una fila del CSV de importación en un `Place` validado.
 * Columnas: id (opcional), name, plaza, giros y secundarios (separados por ";"), description, hours, lat,
 * lng, googleMapsUri, website, instagram, facebook, tiktok, whatsapp, phone, active.
 * `description` es el original en español y `descriptionEn` su traducción, que puede faltar.
 */
import { z } from 'zod'
import { PlaceSchema } from '../../../src/data/schemas.ts'
import { normalizeText, slugify } from '../../../src/lib/text.ts'
import type { Category, Place, Plaza } from '../../../src/types/domain.ts'
import { parseHoursText } from './parse-hours.ts'

export const CSV_COLUMNS = [
  'id',
  'name',
  'plaza',
  'giros',
  'secundarios',
  'description',
  'descriptionEn',
  'hours',
  'lat',
  'lng',
  'googleMapsUri',
  'website',
  'instagram',
  'facebook',
  'tiktok',
  'whatsapp',
  'phone',
  'active',
] as const

export type CsvRow = Partial<Record<(typeof CSV_COLUMNS)[number], string>>

export interface RowContext {
  categories: readonly Category[]
  plazas: readonly Plaza[]
}

export interface RowResult {
  place: Place | null
  errors: string[]
  warnings: string[]
}

const TRUE_VALUES = new Set(['si', 'yes', 'true', '1', 'x', '✔', '✓', 'activo'])
const FALSE_VALUES = new Set(['no', 'false', '0', '', 'inactivo'])

const clean = (value: string | undefined) => {
  const trimmed = value?.trim() ?? ''
  return trimmed === '' ? null : trimmed
}

/** 10 dígitos → +52 (México); con código de país → "+" + dígitos. */
export function normalizePhone(value: string | null): string | null {
  if (!value) return null
  const digits = value.replace(/\D/g, '')
  if (digits.length === 10) return `+52${digits}`
  if (digits.length >= 11 && digits.length <= 15) return `+${digits}`
  return value
}

/** "@handle" → URL completa de la red social. */
export function normalizeSocial(
  network: 'instagram' | 'tiktok' | 'facebook',
  value: string | null,
) {
  if (!value) return null
  if (/^https?:\/\//i.test(value)) return value.replace(/^http:/i, 'https:')
  const handle = value.replace(/^@/, '')
  if (network === 'instagram') return `https://www.instagram.com/${handle}/`
  if (network === 'tiktok') return `https://www.tiktok.com/@${handle}`
  return `https://www.facebook.com/${handle}`
}

function normalizeUrl(value: string | null): string | null {
  if (!value) return null
  return /^https?:\/\//i.test(value) ? value.replace(/^http:/i, 'https:') : `https://${value}`
}

export function findPlaza(value: string, plazas: readonly Plaza[]): Plaza | undefined {
  const key = normalizeText(value)
  return plazas.find((plaza) => normalizeText(plaza.name) === key || plaza.slug === slugify(value))
}

/** Un giro por su id o por su etiqueta en español, mire en la categoría que mire. */
export function findGiro(value: string, categories: readonly Category[]): string | undefined {
  const key = normalizeText(value)
  for (const category of categories) {
    const match = category.giros.find(
      (giro) => giro.id === slugify(value) || normalizeText(giro.label.es) === key,
    )
    if (match) return match.id
  }
  return undefined
}

/** La descripción del CSV: el original en español y, si viene, su traducción al inglés. */
function localizedDescription(row: CsvRow): { es: string; en?: string } | null {
  const es = clean(row.description)
  if (!es) return null
  const en = clean(row.descriptionEn)
  return en ? { es, en } : { es }
}

export function rowToPlace(row: CsvRow, id: string, context: RowContext): RowResult {
  const errors: string[] = []
  const warnings: string[] = []

  const name = clean(row.name)
  if (!name) return { place: null, errors: ['Falta el nombre'], warnings }

  const plaza = row.plaza ? findPlaza(row.plaza, context.plazas) : undefined
  if (!plaza) errors.push(`Plaza no encontrada: "${row.plaza ?? ''}" (créala antes en plazas.json)`)

  // Los giros vienen en dos columnas, separados por ";", y valen su id o su etiqueta.
  const leerGiros = (texto: string, campo: string) => {
    const salida: string[] = []
    for (const value of texto
      .split(';')
      .map((part) => clean(part) ?? '')
      .filter(Boolean)) {
      const giro = findGiro(value, context.categories)
      if (!giro) errors.push(`${campo} no encontrado: "${value}"`)
      else if (!salida.includes(giro)) salida.push(giro)
    }
    return salida
  }
  const giros = leerGiros(row.giros ?? '', 'Giro')
  const secundarios = leerGiros(row.secundarios ?? '', 'Giro secundario').filter(
    (giro) => !giros.includes(giro),
  )
  if (giros.length === 0) {
    giros.push('otros')
    warnings.push('Sin giros: se asigna "otros"')
  }
  if (giros.length + secundarios.length > 3) {
    errors.push(
      `Demasiados giros (${giros.length + secundarios.length}); entre principales y secundarios el máximo son tres`,
    )
  }

  let hours = null
  try {
    hours = parseHoursText(row.hours ?? '')
  } catch (error) {
    errors.push(`Horario: ${(error as Error).message}`)
  }

  const lat = clean(row.lat)
  const lng = clean(row.lng)
  let location = null
  if (lat || lng) {
    const parsed = { lat: Number(lat), lng: Number(lng) }
    if (Number.isFinite(parsed.lat) && Number.isFinite(parsed.lng) && lat && lng) location = parsed
    else errors.push('lat y lng deben ser números y venir juntos')
  }

  const activeValue = normalizeText(row.active ?? '')
  let active = false
  if (TRUE_VALUES.has(activeValue)) active = true
  else if (!FALSE_VALUES.has(activeValue))
    errors.push(`Valor de "active" no reconocido: "${row.active}"`)

  const candidate = {
    id,
    slug: id,
    name,
    plazaId: plaza?.id ?? '',
    giros,
    secundarios,
    description: localizedDescription(row),
    hours,
    location,
    googleMapsUri: clean(row.googleMapsUri),
    googlePlaceId: null,
    phone: normalizePhone(clean(row.phone)),
    photos: [],
    links: {
      website: normalizeUrl(clean(row.website)),
      instagram: normalizeSocial('instagram', clean(row.instagram)),
      facebook: normalizeSocial('facebook', clean(row.facebook)),
      tiktok: normalizeSocial('tiktok', clean(row.tiktok)),
      whatsapp: normalizePhone(clean(row.whatsapp)),
    },
    active,
  }

  if (errors.length > 0) return { place: null, errors, warnings }
  const parsed = PlaceSchema.safeParse(candidate)
  if (!parsed.success) {
    return { place: null, errors: [z.prettifyError(parsed.error)], warnings }
  }
  return { place: parsed.data, errors, warnings }
}
