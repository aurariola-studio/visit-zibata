/**
 * Validación de los datos al cargarlos en el navegador, registro a registro y sin Zod.
 *
 * El build ya valida el dataset completo con los esquemas Zod (`npm run data:validate`), así que aquí solo se
 * protege la interfaz ante un archivo publicado sin pasar por el build: un registro inválido se descarta con un
 * aviso en consola en lugar de bloquear toda la guía. Las comprobaciones de seguridad (enlaces http(s),
 * teléfonos, rutas de fotos) usan las mismas reglas que los esquemas (`rules.ts`).
 */
import type { Category, Place, Plaza } from '../types/domain.ts'
import {
  DAY_KEYS,
  E164_PATTERN,
  GOOGLE_PLACE_ID_PATTERN,
  HEX_COLOR_PATTERN,
  isGoogleMapsUrl,
  isHttpUrl,
  isSafePhotoSrc,
  isValidTimeRange,
  LOCATION_CONFIDENCE,
  SLUG_PATTERN,
} from './rules.ts'

export interface RecordIssue {
  dataset: 'categories' | 'plazas' | 'places'
  id: string
  message: string
}

type Check = (value: unknown) => string | null
type Obj = Record<string, unknown>

const isObject = (value: unknown): value is Obj =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const isText = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0
const isSlug = (value: unknown): value is string =>
  typeof value === 'string' && SLUG_PATTERN.test(value)
const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

function field(record: Obj, key: string, ok: (value: unknown) => boolean, rule: string) {
  return ok(record[key]) ? null : `${key}: ${rule}`
}
const nullable =
  (ok: (value: unknown) => boolean) =>
  (value: unknown): boolean =>
    value === null || ok(value)
const optional =
  (ok: (value: unknown) => boolean) =>
  (value: unknown): boolean =>
    value === undefined || ok(value)
const arrayOf =
  (ok: (value: unknown) => boolean) =>
  (value: unknown): boolean =>
    Array.isArray(value) && value.every(ok)

const isLatLng = (value: unknown) =>
  isObject(value) &&
  isFiniteNumber(value.lat) &&
  isFiniteNumber(value.lng) &&
  Math.abs(value.lat) <= 90 &&
  Math.abs(value.lng) <= 180

const isLocalizedText = (value: unknown) => isObject(value) && isText(value.es)

/** El slug de URL necesita los dos idiomas: sin el inglés no hay página en ese árbol. */
const isLocalizedSlug = (value: unknown) => isObject(value) && isSlug(value.es) && isSlug(value.en)

const isHours = (value: unknown) =>
  isObject(value) &&
  Object.entries(value).every(([key, ranges]) =>
    key === 'note'
      ? isText(ranges)
      : (DAY_KEYS as readonly string[]).includes(key) &&
        arrayOf((range) => typeof range === 'string' && isValidTimeRange(range))(ranges),
  )

const isPositiveInteger = (value: unknown) => Number.isInteger(value) && (value as number) > 0

const isPhoto = (value: unknown) =>
  isObject(value) &&
  typeof value.src === 'string' &&
  isSafePhotoSrc(value.src) &&
  isText(value.alt) &&
  optional(isPositiveInteger)(value.width) &&
  optional(isPositiveInteger)(value.height) &&
  optional(arrayOf(isPositiveInteger))(value.variants) &&
  optional((color) => typeof color === 'string' && HEX_COLOR_PATTERN.test(color))(value.placeholder)

const isPhone = (value: unknown) => typeof value === 'string' && E164_PATTERN.test(value)
const isUrl = (value: unknown) => typeof value === 'string' && isHttpUrl(value)
const nullish =
  (ok: (value: unknown) => boolean) =>
  (value: unknown): boolean =>
    value === null || value === undefined || ok(value)

const isLinks = (value: unknown) =>
  isObject(value) &&
  ['website', 'instagram', 'facebook', 'tiktok', 'rappi', 'uberEats', 'didiFood'].every((key) =>
    nullish(isUrl)(value[key]),
  ) &&
  nullish(isPhone)(value.whatsapp)

const isPosition = (value: unknown) =>
  Array.isArray(value) && value.length === 2 && value.every(isFiniteNumber)
const isRing = (value: unknown) => arrayOf(isPosition)(value) && (value as unknown[]).length >= 4
const isPolygon = (value: unknown) => arrayOf(isRing)(value) && (value as unknown[]).length > 0

const isGeometry = (value: unknown) =>
  isObject(value) &&
  (value.type === 'Polygon'
    ? isPolygon(value.coordinates)
    : value.type === 'MultiPolygon' &&
      arrayOf(isPolygon)(value.coordinates) &&
      (value.coordinates as unknown[]).length > 0)

const firstIssue = (checks: (string | null)[]): string | null =>
  checks.find((issue) => issue !== null) ?? null

const checkPlace: Check = (value) => {
  if (!isObject(value)) return 'no es un objeto'
  return firstIssue([
    field(value, 'id', isSlug, 'identificador no válido'),
    field(value, 'slug', isSlug, 'slug no válido'),
    field(value, 'name', isText, 'nombre vacío'),
    field(value, 'plazaId', isSlug, 'plaza no válida'),
    field(
      value,
      'giros',
      (list) => Array.isArray(list) && list.length > 0 && list.length <= 3 && list.every(isSlug),
      'giros no válidos (de uno a tres)',
    ),
    field(value, 'description', nullable(isLocalizedText), 'descripción no válida'),
    field(value, 'hours', nullable(isHours), 'horario no válido'),
    field(value, 'location', nullable(isLatLng), 'coordenadas no válidas'),
    field(
      value,
      'googleMapsUri',
      nullable((uri) => typeof uri === 'string' && isGoogleMapsUrl(uri)),
      'enlace de Google Maps no válido',
    ),
    field(
      value,
      'googlePlaceId',
      nullable((id) => typeof id === 'string' && GOOGLE_PLACE_ID_PATTERN.test(id)),
      'identificador de Google Place no válido',
    ),
    field(value, 'phone', nullable(isPhone), 'teléfono no válido'),
    field(value, 'photos', arrayOf(isPhoto), 'fotografía no válida'),
    field(value, 'links', isLinks, 'enlace no válido'),
    field(value, 'active', (active) => typeof active === 'boolean', 'active debe ser booleano'),
  ])
}

const checkPlaza: Check = (value) => {
  if (!isObject(value)) return 'no es un objeto'
  return firstIssue([
    field(value, 'id', isSlug, 'identificador no válido'),
    field(value, 'slug', isSlug, 'slug no válido'),
    field(value, 'name', isText, 'nombre vacío'),
    field(value, 'description', nullable(isLocalizedText), 'descripción no válida'),
    field(value, 'address', nullable(isText), 'dirección no válida'),
    field(value, 'coordinates', isLatLng, 'coordenadas no válidas'),
    field(value, 'geometry', isGeometry, 'geometría no válida'),
    field(value, 'active', (active) => typeof active === 'boolean', 'active debe ser booleano'),
    field(
      value,
      'comingSoon',
      (flag) => flag === undefined || typeof flag === 'boolean',
      'comingSoon debe ser booleano',
    ),
    field(
      value,
      'googleMapsUri',
      (uri) => uri === undefined || (typeof uri === 'string' && isGoogleMapsUrl(uri)),
      'enlace de Maps no válido',
    ),
    field(value, 'placeIds', arrayOf(isSlug), 'placeIds no válido'),
    field(value, 'categories', arrayOf(isSlug), 'categories no válido'),
    field(
      value,
      'locationConfidence',
      (level) => (LOCATION_CONFIDENCE as readonly unknown[]).includes(level),
      'confianza no válida',
    ),
    field(value, 'locationSource', isText, 'procedencia vacía'),
  ])
}

const isGiro = (value: unknown) =>
  isObject(value) &&
  isSlug(value.id) &&
  isLocalizedText(value.label) &&
  isText(value.icon) &&
  arrayOf(isText)(value.synonyms) &&
  (value.general === undefined || typeof value.general === 'boolean')

const checkCategory: Check = (value) => {
  if (!isObject(value)) return 'no es un objeto'
  return firstIssue([
    field(value, 'id', isSlug, 'identificador no válido'),
    field(value, 'slug', isLocalizedSlug, 'slug de URL no válido'),
    field(value, 'label', isLocalizedText, 'etiqueta vacía'),
    field(value, 'icon', isText, 'icono vacío'),
    field(
      value,
      'hue',
      (hue) => hue === undefined || (typeof hue === 'number' && hue >= 0 && hue <= 359),
      'hue fuera de rango (0-359)',
    ),
    field(value, 'order', Number.isInteger, 'orden no válido'),
    field(value, 'synonyms', arrayOf(isText), 'sinónimo no válido'),
    field(
      value,
      'giros',
      (list) => Array.isArray(list) && list.length > 0 && list.every(isGiro),
      'giro no válido',
    ),
  ])
}

/** Un archivo de datos debe ser `{ <colección>: [...] }`; si no, no hay nada que rescatar. */
export function readCollection(file: unknown, key: string): unknown[] | null {
  return isObject(file) && Array.isArray(file[key]) ? file[key] : null
}

function keepValid<T>(
  records: unknown[],
  dataset: RecordIssue['dataset'],
  check: Check,
): { valid: T[]; issues: RecordIssue[] } {
  const valid: T[] = []
  const issues: RecordIssue[] = []
  const seen = new Set<string>()
  records.forEach((record, index) => {
    const id = isObject(record) && typeof record.id === 'string' ? record.id : `#${index}`
    const message = check(record) ?? (seen.has(id) ? 'identificador duplicado' : null)
    if (message) issues.push({ dataset, id, message })
    else {
      seen.add(id)
      valid.push(record as T)
    }
  })
  return { valid, issues }
}

export const validateCategories = (records: unknown[]) =>
  keepValid<Category>(records, 'categories', checkCategory)
export const validatePlazas = (records: unknown[]) =>
  keepValid<Plaza>(records, 'plazas', checkPlaza)
export const validatePlaces = (records: unknown[]) =>
  keepValid<Place>(records, 'places', checkPlace)
