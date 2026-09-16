/**
 * Esquemas del modelo de datos comercial (Zod).
 *
 * Son la única fuente de verdad de la estructura: los usan los scripts de datos (validación en build e
 * importación CSV) y los tests. La app valida en runtime con `runtimeValidation.ts`, que comparte las reglas
 * de `rules.ts` sin cargar Zod en el navegador.
 * Los tipos del dominio se infieren de aquí (ver `src/types/domain.ts`).
 */
import { z } from 'zod'
import {
  E164_PATTERN,
  GOOGLE_PLACE_ID_PATTERN,
  HEX_COLOR_PATTERN,
  isGoogleMapsUrl,
  isSafePhotoSrc,
  isValidTimeRange,
  LOCATION_CONFIDENCE,
  RESEARCH_STATUS,
  SLUG_PATTERN,
  TIME_RANGE_PATTERN,
} from './rules.ts'

export {
  DAY_KEYS,
  isGoogleMapsUrl,
  LOCATION_CONFIDENCE,
  PUBLISHABLE_STATUS,
  RESEARCH_STATUS,
  SLUG_PATTERN,
  TIME_RANGE_PATTERN,
} from './rules.ts'

const slug = z
  .string()
  .regex(SLUG_PATTERN, 'Debe ser un identificador en minúsculas con guiones, p. ej. "paseo-zibata"')

const nonEmptyText = z.string().trim().min(1)

export const LocalizedTextSchema = z.object({
  es: nonEmptyText,
  en: nonEmptyText.optional(),
})

export const LatLngSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
})

const httpUrl = z.httpUrl({ error: 'Debe ser una URL completa que empiece por https://' })

const position = z.tuple([z.number(), z.number()])
const linearRing = z.array(position).min(4, 'Un anillo necesita al menos 4 posiciones')

export const PlazaGeometrySchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('Polygon'), coordinates: z.array(linearRing).min(1) }),
  z.object({
    type: z.literal('MultiPolygon'),
    coordinates: z.array(z.array(linearRing).min(1)).min(1),
  }),
])

const timeRange = z
  .string()
  .regex(TIME_RANGE_PATTERN, 'Usa el formato "HH:MM-HH:MM" (24 h), p. ej. "08:00-22:00"')
  .refine(isValidTimeRange, 'La hora de apertura y la de cierre no pueden ser iguales')

/**
 * Horario semanal. Día ausente = sin información; lista vacía = cerrado ese día.
 * Un rango cuyo cierre es menor que la apertura cruza la medianoche ("18:00-02:00").
 */
export const HoursSchema = z.strictObject({
  mon: z.array(timeRange).optional(),
  tue: z.array(timeRange).optional(),
  wed: z.array(timeRange).optional(),
  thu: z.array(timeRange).optional(),
  fri: z.array(timeRange).optional(),
  sat: z.array(timeRange).optional(),
  sun: z.array(timeRange).optional(),
  note: nonEmptyText.optional(),
})

/**
 * Fotografía gestionada como asset propio (nunca Google Places ni scraping).
 * `src` es relativa a `public/` (sin "/" inicial) o una URL https de un almacenamiento propio.
 * `variants` lista anchos generados por `npm run images:optimize` junto a `src`
 * (`nombre-480.webp`, `nombre-480.avif`, …).
 */
export const PhotoSchema = z.strictObject({
  src: z
    .string()
    .trim()
    .min(1)
    .refine(isSafePhotoSrc, 'Usa una ruta relativa a public/ (sin "/" inicial) o una URL https'),
  alt: nonEmptyText,
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  variants: z.array(z.number().int().positive()).optional(),
  placeholder: z.string().regex(HEX_COLOR_PATTERN).optional(),
  credit: nonEmptyText.optional(),
})

const e164Phone = z
  .string()
  .regex(E164_PATTERN, 'Usa formato internacional sin espacios, p. ej. "+524421234567"')

export const LinksSchema = z.strictObject({
  website: httpUrl.nullish(),
  instagram: httpUrl.nullish(),
  facebook: httpUrl.nullish(),
  tiktok: httpUrl.nullish(),
  whatsapp: e164Phone.nullish(),
})

export const VerificationSchema = z.strictObject({
  status: z.enum(RESEARCH_STATUS),
  confidence: z.enum(LOCATION_CONFIDENCE),
  lastVerifiedAt: z.iso.date(),
  sources: z.array(httpUrl).min(1),
})

export const PlaceSchema = z.strictObject({
  id: slug,
  slug: slug,
  name: nonEmptyText,
  plazaId: slug,
  category: slug,
  subcategory: slug.nullable(),
  description: nonEmptyText.nullable(),
  localNumber: nonEmptyText.nullable(),
  hours: HoursSchema.nullable(),
  location: LatLngSchema.nullable(),
  googleMapsUri: httpUrl
    .refine(isGoogleMapsUrl, 'Debe ser un enlace https de Google Maps')
    .nullable(),
  googlePlaceId: z
    .string()
    .regex(GOOGLE_PLACE_ID_PATTERN, 'Identificador de Google Place no válido')
    .nullable(),
  phone: e164Phone.nullable(),
  photos: z.array(PhotoSchema),
  links: LinksSchema,
  tags: z.array(nonEmptyText),
  active: z.boolean(),
  verification: VerificationSchema.optional(),
})

export const PlazaSchema = z.strictObject({
  id: slug,
  slug: slug,
  name: nonEmptyText,
  description: nonEmptyText.nullable(),
  address: nonEmptyText.nullable(),
  coordinates: LatLngSchema,
  geometry: PlazaGeometrySchema,
  active: z.boolean(),
  placeIds: z.array(slug),
  categories: z.array(slug),
  /** Procedencia de la ubicación, para saber qué plazas conviene verificar en campo. */
  locationConfidence: z.enum(LOCATION_CONFIDENCE),
  locationSource: nonEmptyText,
  verification: VerificationSchema.optional(),
})

export const SubcategorySchema = z.strictObject({
  id: slug,
  label: LocalizedTextSchema,
  synonyms: z.array(nonEmptyText),
})

export const CategorySchema = z.strictObject({
  id: slug,
  label: LocalizedTextSchema,
  icon: nonEmptyText,
  order: z.number().int(),
  synonyms: z.array(nonEmptyText),
  subcategories: z.array(SubcategorySchema),
})

const datasetMeta = {
  $schema: z.string().optional(),
  version: z.literal(1),
  updatedAt: z.iso.date(),
}

export const CategoriesFileSchema = z.strictObject({
  ...datasetMeta,
  categories: z.array(CategorySchema),
})
export const PlazasFileSchema = z.strictObject({ ...datasetMeta, plazas: z.array(PlazaSchema) })
export const PlacesFileSchema = z.strictObject({ ...datasetMeta, places: z.array(PlaceSchema) })
