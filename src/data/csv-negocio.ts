/**
 * Una fila del CSV de importación convertida en la entrada que ya entiende `prepararNegocio` (el mismo
 * camino que el formulario del panel). Aquí solo se traduce: no se arma ningún local ni se repite ninguna
 * regla de publicación. Títulos únicos, tope de 60 caracteres, plaza activa, procedencia y el resto los
 * decide `prepararNegocio`, así que el CSV no puede escribir lo que el panel rechazaría.
 *
 * Columnas: id (solo para apuntar a un local que ya existe), name, plaza, giros (separados por ";", en
 * orden), description, descriptionEn, hours, lat, lng, googleMapsUri, website, instagram, facebook, tiktok,
 * whatsapp, rappi, uberEats, didiFood, phone, active, y la procedencia: fuentes (URL separadas por ";"),
 * comprobado (sí/no, "lo comprobé yo en el lugar") y confianza (high, medium, low).
 *
 * **Una columna vacía conserva lo que ya hay** en un local existente: el CSV complementa, no borra. Para
 * borrar un enlace se usa el panel. En un local nuevo las columnas vacías quedan vacías, salvo las que
 * se exigen (nombre, plaza, giro, descripciones, `active` y la procedencia).
 */
import { normalizeText, slugify } from '../lib/text.ts'
import type { Category, Place, Plaza } from '../types/domain.ts'
import { parseHoursText } from './parse-hours.ts'
import type { CommercialDataset } from './relations.ts'
import { LOCATION_CONFIDENCE } from './rules.ts'

export const CSV_COLUMNS = [
  'id',
  'name',
  'plaza',
  'giros',
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
  'rappi',
  'uberEats',
  'didiFood',
  'phone',
  'active',
  'fuentes',
  'comprobado',
  'confianza',
] as const

export type CsvRow = Partial<Record<(typeof CSV_COLUMNS)[number], string>>

const TRUE_VALUES = new Set(['si', 'yes', 'true', '1', 'x', '✔', '✓', 'activo'])
const FALSE_VALUES = new Set(['no', 'false', '0', 'inactivo'])

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

export interface FilaConvertida {
  /** El cuerpo para `prepararNegocio`; `null` si la fila no se pudo traducir. */
  entrada: Record<string, unknown> | null
  /** El local que esta fila actualiza, si ya existe. */
  existente: Place | null
  problemas: string[]
  avisos: string[]
}

/** Los días de un horario sin la nota, que el panel conserva aparte. */
function dias(hours: Place['hours'] | null | undefined): Record<string, string[]> | null {
  if (!hours) return null
  const salida: Record<string, string[]> = {}
  for (const [dia, rangos] of Object.entries(hours)) {
    if (Array.isArray(rangos)) salida[dia] = rangos
  }
  return Object.keys(salida).length > 0 ? salida : null
}

export function filaAEntrada(row: CsvRow, dataset: CommercialDataset): FilaConvertida {
  const problemas: string[] = []
  const avisos: string[] = []

  const name = clean(row.name)
  if (!name) return { entrada: null, existente: null, problemas: ['Falta el nombre'], avisos }

  const plaza = row.plaza ? findPlaza(row.plaza, dataset.plazas) : undefined
  if (!plaza) problemas.push(`Plaza no encontrada: "${row.plaza ?? ''}" (créala antes en el panel)`)

  // `id` solo apunta a un local que ya existe; sin él, el mismo nombre en la misma plaza es el mismo local.
  const idPedido = clean(row.id)
  let existente: Place | null = null
  if (idPedido) {
    existente = dataset.places.find((place) => place.id === idPedido) ?? null
    if (!existente) {
      problemas.push(`id no encontrado: "${idPedido}". Déjalo vacío para crear un local nuevo.`)
    }
  } else if (plaza) {
    existente =
      dataset.places.find(
        (place) => place.plazaId === plaza.id && normalizeText(place.name) === normalizeText(name),
      ) ?? null
  }

  // Los giros valen su id o su etiqueta. El orden manda: el primero es el que define al local.
  const girosDeFila = (clean(row.giros) ?? '')
    .split(';')
    .map((parte) => clean(parte) ?? '')
    .filter(Boolean)
  const giros: string[] = []
  for (const value of girosDeFila) {
    const giro = findGiro(value, dataset.categories)
    if (!giro) problemas.push(`Giro no encontrado: "${value}"`)
    else if (!giros.includes(giro)) giros.push(giro)
  }
  if (girosDeFila.length === 0) {
    if (existente) giros.push(...existente.giros)
    else problemas.push('Falta al menos un giro: no se asigna ninguno por omisión')
  }

  let horario = dias(existente?.hours)
  const textoHorario = clean(row.hours)
  if (textoHorario) {
    try {
      const parsed = parseHoursText(textoHorario)
      if (parsed?.note) avisos.push('La nota del horario no se importa: el panel no la edita.')
      // Día por día: el CSV cambia los días que nombra y deja los demás. Un horario parcial no borra el resto.
      horario = { ...horario, ...dias(parsed) }
    } catch (error) {
      problemas.push(`Horario: ${(error as Error).message}`)
    }
  }

  const latTexto = clean(row.lat)
  const lngTexto = clean(row.lng)
  let lat: number | null = existente?.location?.lat ?? null
  let lng: number | null = existente?.location?.lng ?? null
  if (latTexto || lngTexto) {
    const nuevaLat = Number(latTexto)
    const nuevaLng = Number(lngTexto)
    if (latTexto && lngTexto && Number.isFinite(nuevaLat) && Number.isFinite(nuevaLng)) {
      lat = nuevaLat
      lng = nuevaLng
    } else {
      problemas.push('lat y lng deben ser números y venir juntos')
    }
  }

  const textoActivo = normalizeText(row.active ?? '')
  let activo = existente?.active ?? true
  if (TRUE_VALUES.has(textoActivo)) activo = true
  else if (FALSE_VALUES.has(textoActivo)) activo = false
  else if (textoActivo !== '') problemas.push(`Valor de "active" no reconocido: "${row.active}"`)
  else if (!existente) problemas.push('Indica "active": un local nuevo se crea visible (sí).')

  // La procedencia es por fila: una casilla para toda la tanda sería el sello automático de antes.
  const urls = (clean(row.fuentes) ?? '')
    .split(';')
    .map((parte) => clean(parte) ?? '')
    .filter(Boolean)
  const comprobado = TRUE_VALUES.has(normalizeText(row.comprobado ?? ''))
  const confianzaTexto = normalizeText(row.confianza ?? '')
  if (confianzaTexto && !(LOCATION_CONFIDENCE as readonly string[]).includes(confianzaTexto)) {
    problemas.push(`confianza no reconocida: "${row.confianza}" (high, medium o low)`)
  }
  const previa = existente?.verification
  const urlsPrevias = (previa?.sources ?? []).filter((fuente) => !fuente.startsWith('campo:'))
  const verificacion =
    urls.length > 0 || comprobado || confianzaTexto
      ? {
          comprobadoPorMi: comprobado,
          // Se suman a las que ya estaban: el CSV no quita fuentes en silencio.
          fuentes: [...new Set([...urlsPrevias, ...urls])],
          confianza: confianzaTexto || previa?.confidence || 'medium',
        }
      : undefined

  if (problemas.length > 0 || !plaza) return { entrada: null, existente, problemas, avisos }

  const enlace = (valor: string | null, previo: string | null | undefined) => valor ?? previo ?? ''
  const previos = existente?.links
  const entrada: Record<string, unknown> = {
    id: existente?.id,
    nombre: name,
    plazaId: plaza.id,
    giros,
    descripcionEs: clean(row.description) ?? existente?.description?.es ?? '',
    descripcionEn: clean(row.descriptionEn) ?? existente?.description?.en ?? '',
    telefono: normalizePhone(clean(row.phone)) ?? existente?.phone ?? '',
    sitio: enlace(normalizeUrl(clean(row.website)), previos?.website),
    instagram: enlace(normalizeSocial('instagram', clean(row.instagram)), previos?.instagram),
    facebook: enlace(normalizeSocial('facebook', clean(row.facebook)), previos?.facebook),
    whatsapp: enlace(normalizePhone(clean(row.whatsapp)), previos?.whatsapp),
    googleMapsUri: clean(row.googleMapsUri) ?? existente?.googleMapsUri ?? '',
    lat,
    lng,
    horario,
    activo,
  }
  // TikTok y los enlaces de reparto: ausente conserva el que había, que es justo lo que pide una columna vacía.
  const tiktok = normalizeSocial('tiktok', clean(row.tiktok))
  if (tiktok) entrada.tiktok = tiktok
  for (const clave of ['rappi', 'uberEats', 'didiFood'] as const) {
    const valor = normalizeUrl(clean(row[clave]))
    if (valor) entrada[clave] = valor
  }
  if (verificacion) entrada.verificacion = verificacion
  return { entrada, existente, problemas, avisos }
}
