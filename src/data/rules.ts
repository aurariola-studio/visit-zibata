/**
 * Reglas del modelo de datos sin dependencias: las comparten los esquemas Zod (build, scripts, tests) y la
 * validación ligera de runtime (`runtimeValidation.ts`), para que ambas rechacen exactamente lo mismo en
 * los campos que llegan a la interfaz (identificadores, enlaces, teléfonos, horarios y fotos).
 */

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
/** Altura del prisma de una plaza, en metros, y su tamaño como factor del contorno (1 es el contorno entero). */
export const ALTURA_MIN_M = 1
export const ALTURA_MAX_M = 60
export const ESCALA_MIN = 0.3
export const ESCALA_MAX = 1

export const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const

/** "HH:MM-HH:MM" en formato 24 h. Se admite 24:00 como cierre y rangos que cruzan medianoche. */
export const TIME_RANGE_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)-([01]\d|2[0-3]|24(?=:00)):([0-5]\d)$/

export const E164_PATTERN = /^\+[1-9]\d{9,14}$/

/**
 * Enlace de WhatsApp Business: un negocio con cuenta de empresa no siempre publica un número, publica un
 * enlace (`api.whatsapp.com/message/…`, `wa.me/message/…`). Solo https y solo los dominios de WhatsApp: no
 * es un campo de URL libre.
 */
export const WHATSAPP_HOST_PATTERN = /^(wa\.me|api\.whatsapp\.com|(www\.)?whatsapp\.com|wa\.link)$/i

export function isWhatsappLink(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && WHATSAPP_HOST_PATTERN.test(url.hostname)
  } catch {
    return false
  }
}

export const GOOGLE_PLACE_ID_PATTERN = /^[A-Za-z0-9_-]{10,}$/

export const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i

/**
 * Verificación en sitio ("campo:AAAA-MM-DD"). Es la otra forma válida de respaldar un registro además
 * de una URL pública: alguien fue al lugar ese día y lo vio abierto. Muchos negocios de barrio no
 * tienen web ni aparecen en plataformas de reparto, y la alternativa (dejarlos fuera de la guía) haría
 * peor a la guía sin hacerla más veraz.
 */
export const FIELD_SOURCE_PATTERN = /^campo:\d{4}-\d{2}-\d{2}$/

/** Una fuente válida: URL pública http(s) o verificación en sitio. */
export function isValidSource(value: string): boolean {
  return isHttpUrl(value) || FIELD_SOURCE_PATTERN.test(value)
}

/**
 * Tipos de schema.org que puede declarar una categoría para sus locales (`schemaType`). Es una lista cerrada: un
 * tipo inventado deja el marcado inválido. Sin tipo, la categoría se queda en `LocalBusiness`, que no miente
 * hacia abajo. `servesCuisine` solo cabe bajo los tipos de comida (ver `scripts/build/structured-data.ts`).
 */
export const SCHEMA_TYPES = [
  'LocalBusiness',
  'FoodEstablishment',
  'Restaurant',
  'FastFoodRestaurant',
  'CafeOrCoffeeShop',
  'Bakery',
  'BarOrPub',
  'Store',
  'GroceryStore',
  'ConvenienceStore',
  'Pharmacy',
  'MedicalClinic',
  'Dentist',
  'DiagnosticLab',
  'HairSalon',
  'NailSalon',
  'DaySpa',
  'BeautySalon',
] as const

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

/*
 * `google.com`, `google.com.mx`, `google.co.uk`, `google.es`… pero no `google.evil.example`: el sufijo
 * es un dominio de país o `com` con país, no cualquier cadena de letras y puntos.
 */
const GOOGLE_TLD = '(com(\\.[a-z]{2})?|co\\.[a-z]{2}|[a-z]{2,3})'
const GOOGLE_MAPS_HOST = new RegExp(
  `^(www\\.)?(google\\.${GOOGLE_TLD}|maps\\.google\\.${GOOGLE_TLD}|maps\\.app\\.goo\\.gl|goo\\.gl)$`,
  'i',
)

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
  // Sin comillas, ángulos, barras invertidas ni espacios: la ruta va dentro de un atributo HTML en el
  // panel y en el prerender, y con una comilla cerraría el atributo y abriría otro.
  if (/["'<>\\\s`]/.test(trimmed)) return false
  return trimmed.length > 0 && (/^https:\/\//.test(trimmed) || !/^([a-z]+:|\/)/i.test(trimmed))
}

/**
 * La guía muestra una sola foto por local, la de portada: el círculo de la tarjeta y de la ficha. Por ahora no hay galería.
 * Siempre se llama así, para que la ruta no dependa de cómo la nombró quien la mandó.
 */
export const NOMBRE_DE_PORTADA = 'portada'
const FORMATOS_DE_PORTADA = ['webp', 'jpg', 'png']

/** Lo que está mal en las fotos de un local, o `null`. Lo usan la validación de datos y el panel. */
export function problemaDeFotos(id: string, srcs: readonly string[]): string | null {
  if (srcs.length > 1) return 'La guía muestra solo la foto de portada: una por local'
  const [src] = srcs
  if (src === undefined) return null
  if (
    FORMATOS_DE_PORTADA.some(
      (formato) => src === `images/places/${id}/${NOMBRE_DE_PORTADA}.${formato}`,
    )
  )
    return null
  return `La foto de portada se llama images/places/${id}/${NOMBRE_DE_PORTADA}.webp (o .jpg, .png), no ${src}`
}

/** La dirección de una plaza: una calle y su número (o "s/n"), nada más. Ver `PlazaSchema.address`. */
export const PLAZA_ADDRESS = /^[^,]+ (?:[0-9]{1,4}[A-Za-z]?(?:-[A-Za-z0-9]+)?|s\/n)$/

/** Las plantas que distingue la guía, de abajo hacia arriba. "Segundo piso" es `alta`. */
export const UNIT_FLOORS = ['sotano', 'baja', 'alta'] as const
