/**
 * Conversión de una fila del CSV de importación en un `Place` validado.
 * Columnas: id (opcional), name, plaza, category, subcategory, localNumber, description, hours, lat,
 * lng, googleMapsUri, website, instagram, facebook, tiktok, whatsapp, phone, tags, active
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
  'category',
  'subcategory',
  'localNumber',
  'description',
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
  'tags',
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

export function findCategory(value: string, categories: readonly Category[]): Category | undefined {
  const key = normalizeText(value)
  return categories.find(
    (category) => category.id === slugify(value) || normalizeText(category.label.es) === key,
  )
}

export function rowToPlace(row: CsvRow, id: string, context: RowContext): RowResult {
  const errors: string[] = []
  const warnings: string[] = []

  const name = clean(row.name)
  if (!name) return { place: null, errors: ['Falta el nombre'], warnings }

  const plaza = row.plaza ? findPlaza(row.plaza, context.plazas) : undefined
  if (!plaza) errors.push(`Plaza no encontrada: "${row.plaza ?? ''}" (créala antes en plazas.json)`)

  let category = row.category?.trim() ? findCategory(row.category, context.categories) : undefined
  if (!row.category?.trim()) {
    category = context.categories.find((c) => c.id === 'otros')
    warnings.push('Sin categoría: se asigna "otros"')
  } else if (!category) {
    errors.push(`Categoría no encontrada: "${row.category}"`)
  }

  let subcategory: string | null = null
  const subcategoryValue = clean(row.subcategory)
  if (subcategoryValue && category) {
    const key = normalizeText(subcategoryValue)
    const match = category.subcategories.find(
      (s) => s.id === slugify(subcategoryValue) || normalizeText(s.label.es) === key,
    )
    if (match) subcategory = match.id
    else errors.push(`Subcategoría "${subcategoryValue}" no existe en "${category.id}"`)
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
    category: category?.id ?? '',
    subcategory,
    description: clean(row.description),
    localNumber: clean(row.localNumber),
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
    tags: (row.tags ?? '')
      .split('|')
      .map((tag) => tag.trim())
      .filter(Boolean),
    active,
  }

  if (errors.length > 0) return { place: null, errors, warnings }
  const parsed = PlaceSchema.safeParse(candidate)
  if (!parsed.success) {
    return { place: null, errors: [z.prettifyError(parsed.error)], warnings }
  }
  return { place: parsed.data, errors, warnings }
}
