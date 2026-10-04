/**
 * node scripts/research/apply-owner-review.ts <carpeta>
 *
 * Aplica a research/decisions.json las respuestas del formulario "Verificación de locales" (una por
 * local, exportadas como `<carpeta>/reviews/<id>.json`) y unifica su formato: descripción sin emojis ni
 * letras decorativas, teléfono en E.164, horario estructurado a partir del texto libre y enlaces https.
 * Después hay que ejecutar `node scripts/research/build-dataset.ts`.
 *
 * Reglas (acordadas con el propietario):
 * - La **descripción** es la suya o ninguna: lo que estaba antes se descarta.
 * - Las **redes** se suman a las que ya había; lo que ya estaba bien no se toca.
 * - La **ubicación propia** solo si marcó que es la actual y exacta, y nunca en el campus Anáhuac,
 *   donde los locales comparten la ubicación del campus.
 * - Lo que no se puede leer sin adivinar (un horario ambiguo, un teléfono raro) se reporta y se deja
 *   vacío.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { isGoogleMapsUrl } from '../../src/data/rules.ts'
import { ROOT } from '../data/lib/dataset.ts'
import { coordinatesFromMapsUrl } from './lib/maps-link.ts'
import { cleanDescription, cleanPhone, parseHoursText } from './lib/owner-text.ts'

interface Review {
  status: 'open' | 'closed' | 'moved' | 'unknown'
  mapsUrl: string | null
  locationConfirmed: boolean
  description: string | null
  links: Partial<Record<'instagram' | 'facebook' | 'tiktok' | 'website', string>>
  phone: string | null
  notes: string | null
  reviewedAt: string
}

/** Plazas donde el local no tiene dirección propia: se queda con la de la plaza. */
const SHARED_LOCATION_PLAZAS = new Set(['anahuac-queretaro'])

const folder = process.argv[2]
if (!folder) {
  console.error('Uso: node scripts/research/apply-owner-review.ts <carpeta con reviews/*.json>')
  process.exit(1)
}

const decisionsPath = join(ROOT, 'research/decisions.json')
const decisions = JSON.parse(readFileSync(decisionsPath, 'utf8')) as {
  places: Record<string, unknown>[]
}
const betaPlaces = JSON.parse(
  readFileSync(join(ROOT, 'data/research/beta/places.beta.json'), 'utf8'),
) as { places: { id: string; plazaId: string }[] }
const plazaOf = new Map(betaPlaces.places.map((place) => [place.id, place.plazaId]))
const plazas = JSON.parse(readFileSync(join(ROOT, 'data/commercial/plazas.json'), 'utf8')) as {
  plazas: { id: string; coordinates: { lat: number; lng: number } }[]
}
const plazaById = new Map(plazas.plazas.map((plaza) => [plaza.id, plaza]))

/** Un local está en su plaza, no a kilómetros: más lejos, el enlace es de otra sucursal. */
const MAX_DISTANCE_M = 250
const metresBetween = (
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number => {
  const dx = (a.lng - b.lng) * 111_320 * Math.cos((a.lat * Math.PI) / 180)
  const dy = (a.lat - b.lat) * 111_320
  return Math.round(Math.hypot(dx, dy))
}

/**
 * Coordenadas de un enlace corto de Maps: se sigue la redirección y se leen de la URL final, sin
 * descargar contenido de Google. Lo resuelto se guarda en `research/log/maps-locations.json` para no
 * volver a pedirlo (y para que el dataset se pueda rehacer sin red).
 */
const cachePath = join(ROOT, 'research/log/maps-locations.json')
const cache = existsSync(cachePath)
  ? (JSON.parse(readFileSync(cachePath, 'utf8')) as Record<string, { lat: number; lng: number }>)
  : {}

async function resolveLocation(url: string): Promise<{ lat: number; lng: number } | null> {
  const cached = cache[url]
  if (cached) return cached
  let current = url
  for (let hop = 0; hop < 5; hop++) {
    const direct = coordinatesFromMapsUrl(current)
    if (direct) {
      cache[url] = direct
      return direct
    }
    try {
      const response = await fetch(current, { method: 'HEAD', redirect: 'manual' })
      const next = response.headers.get('location')
      if (!next) return null
      current = new URL(next, current).href
    } catch {
      return null
    }
  }
  return null
}

const dir = join(folder, 'reviews')
const files = readdirSync(dir).filter((file) => file.endsWith('.json'))
const pending: string[] = []
let applied = 0
let withHours = 0
let withLocation = 0

for (const file of files.sort()) {
  const id = file.replace(/\.json$/, '')
  const review = JSON.parse(readFileSync(join(dir, file), 'utf8')) as Review
  const decision = decisions.places.find((place) => place.id === id)
  if (!decision) {
    pending.push(`✗ ${id}: no existe en decisions.json`)
    continue
  }
  const date = review.reviewedAt.slice(0, 10)

  if (review.status === 'closed') decision.status = 'closed'
  else if (review.status === 'moved') decision.status = 'uncertain'

  // La descripción es la del propietario o ninguna: nada de textos de relleno.
  decision.description = cleanDescription(review.description)

  const links = { ...((decision.links as Record<string, string>) ?? {}) }
  for (const [key, value] of Object.entries(review.links ?? {})) {
    if (value?.startsWith('https://')) links[key] = value.trim()
  }
  decision.links = links

  if (review.phone) {
    const phone = cleanPhone(review.phone)
    if (phone) decision.phone = phone
    else pending.push(`⚠ ${id}: teléfono "${review.phone}" no se reconoce`)
  }

  const { hours, problem } = parseHoursText(review.notes)
  if (hours) {
    decision.hours = hours
    withHours++
  } else if (problem && problem !== 'sin horas') {
    pending.push(`⚠ ${id}: horario sin leer (${problem}) → "${(review.notes ?? '').slice(0, 80)}"`)
  }

  // La ubicación propia se vuelve a deducir en cada pasada: si el enlace cambió o dejó de ser válido,
  // el local regresa a la ubicación de su plaza en lugar de conservar la anterior.
  decision.location = undefined
  decision.googleMapsUri = undefined
  const plazaId = (decision.plazaId as string) ?? plazaOf.get(id)
  if (review.mapsUrl && review.locationConfirmed && !SHARED_LOCATION_PLAZAS.has(plazaId ?? '')) {
    if (!isGoogleMapsUrl(review.mapsUrl)) pending.push(`⚠ ${id}: enlace de Maps no válido`)
    else {
      const location = await resolveLocation(review.mapsUrl)
      const plaza = plazaById.get(plazaId ?? '')
      const distance = location && plaza ? metresBetween(location, plaza.coordinates) : null
      if (location && distance !== null && distance <= MAX_DISTANCE_M) {
        decision.location = location
        decision.googleMapsUri = review.mapsUrl
        withLocation++
      } else if (location && distance !== null) {
        pending.push(
          `⚠ ${id}: el enlace apunta a ${distance} m de su plaza (¿otra sucursal?); se queda con la ubicación de la plaza`,
        )
      } else pending.push(`⚠ ${id}: no se leyeron coordenadas del enlace de Maps`)
    }
  }

  // El número de local se retiró del dataset: cada plaza los numera a su manera y confundía más que ayudar.
  decision.localNumber = undefined
  decision.fieldVerifiedAt = date
  applied++
}

for (const place of decisions.places) {
  for (const key of ['localNumber', 'location', 'googleMapsUri'])
    if (place[key] === undefined) delete place[key]
}
writeFileSync(decisionsPath, `${JSON.stringify(decisions, null, 2)}\n`)
console.log(
  `✓ ${applied} revisiones aplicadas · ${withHours} con horario · ${withLocation} con ubicación propia`,
)
if (pending.length > 0) console.log(`\nPendiente de revisar a mano:\n${pending.join('\n')}`)
console.log('\nAhora: node scripts/research/build-dataset.ts')
