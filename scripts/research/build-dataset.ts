/**
 * node scripts/research/build-dataset.ts
 *
 * Construye el dataset verificado a partir de la investigación:
 * - research/decisions.json: decisión por registro (estado, confianza, plaza, categoría, datos oficiales).
 * - research/log/*.jsonl: evidencia (URL, nivel, tipo, fecha de la fuente) registrada durante la búsqueda.
 * - data/research/beta/*: foto de la lista beta original, para compararla.
 *
 * Escribe el dataset de producción (solo `active` y `likely_active`) validado con los esquemas y relaciones
 * de la app, el CSV de importación equivalente y los entregables de auditoría. Es idempotente.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import Papa from 'papaparse'
import { syncPlazaDerivedFields, validateRelations } from '../../src/data/relations.ts'
import {
  CategoriesFileSchema,
  DAY_KEYS,
  PlacesFileSchema,
  PlazasFileSchema,
  PUBLISHABLE_STATUS,
  type RESEARCH_STATUS,
} from '../../src/data/schemas.ts'
import type { Category, Hours, Place, Plaza } from '../../src/types/domain.ts'
import { dataPaths, loadBounds, ROOT, writeDataFile } from '../data/lib/dataset.ts'

type Status = (typeof RESEARCH_STATUS)[number]
type Confidence = 'high' | 'medium' | 'low'

interface Evidence {
  url: string
  level: number
  type: string
  sourceDate?: string | null
  supports: string[]
}
interface LogEntry {
  betaId: string | null
  name: string
  betaPlaza: string | null
  candidatePlaza?: string | null
  previousName?: string
  evidence: Evidence[]
  notes: string
  checkedAt: string
}
interface PlaceDecision {
  id: string
  new?: boolean
  logNames?: string[]
  status: Status
  confidence: Confidence
  plazaConfidence?: Confidence
  withinZibata?: boolean | 'uncertain'
  name?: string
  previousName?: string
  plazaId?: string
  candidatePlaza?: string
  currentPlaza?: string
  category?: string
  subcategory?: string | null
  description?: string | null
  localNumber?: string
  phone?: string
  hours?: Hours
  links?: Partial<Record<'website' | 'instagram' | 'facebook' | 'tiktok' | 'whatsapp', string>>
  tags?: string[]
  reason: string
  replacedBy?: string
  duplicateOf?: string
}
interface PlazaDecision {
  id: string
  status: Status
  confidence: Confidence
  active?: boolean
  name?: string
  previousName?: string
  address?: string
  description?: string
  /** Corrección del punto del marcador (p. ej. para que caiga dentro del polígono de la plaza). */
  coordinates?: { lat: number; lng: number; reason: string }
  sources: string[]
  notes: string
}
interface Decisions {
  researchDate: string
  datasetVersion: string
  plazas: PlazaDecision[]
  candidatePlazas: {
    name: string
    status: Status
    withinZibata: boolean | 'uncertain'
    sources: string[]
    notes: string
  }[]
  places: PlaceDecision[]
}

const read = <T>(path: string): T => JSON.parse(readFileSync(`${ROOT}${path}`, 'utf8')) as T
const readJsonl = <T>(path: string): T[] =>
  readFileSync(`${ROOT}${path}`, 'utf8')
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as T)
const write = (path: string, value: unknown) => writeDataFile(`${ROOT}${path}`, value)
const isPublishable = (status: Status) => PUBLISHABLE_STATUS.includes(status)
const isHttpUrl = (value: string) => {
  try {
    return ['https:', 'http:'].includes(new URL(value).protocol)
  } catch {
    return false
  }
}

const decisions = read<Decisions>('research/decisions.json')
const logs = readJsonl<LogEntry>('research/log/businesses.jsonl')
const beta = {
  categories: CategoriesFileSchema.parse(read('data/research/beta/categories.beta.json'))
    .categories,
  plazas: PlazasFileSchema.parse(read('data/research/beta/plazas.beta.json')).plazas,
  places: PlacesFileSchema.parse(read('data/research/beta/places.beta.json')).places,
}
const { researchDate, datasetVersion } = decisions

// ── Taxonomía ──────────────────────────────────────────────────────────────────────────────────────
// Solo cambios que el nuevo inventario necesita: alitas como subcategoría real, snacks de maíz y fruta,
// y pastelería. Las categorías sin locales siguen ocultas en la UI.
const categories: Category[] = structuredClone(beta.categories)
const TAXONOMY_CHANGES: {
  category: string
  label?: string
  subcategory?: Category['subcategories'][number]
  /** Sinónimos que atraen búsquedas ajenas ("barista" hacía que "bar" trajera cafeterías). */
  removeSynonyms?: { subcategory: string; synonyms: string[] }
}[] = [
  {
    category: 'desayunos-y-cafe',
    removeSynonyms: { subcategory: 'cafe-de-especialidad', synonyms: ['barista'] },
  },
  { category: 'pollo', label: 'Pollo y alitas' },
  {
    category: 'pollo',
    subcategory: {
      id: 'alitas',
      label: { es: 'Alitas' },
      synonyms: ['alitas', 'wings', 'boneless'],
    },
  },
  {
    category: 'tacos-y-antojitos',
    subcategory: {
      id: 'esquites-y-snacks',
      label: { es: 'Esquites y snacks' },
      synonyms: ['esquites', 'elotes', 'gaspachos', 'snacks'],
    },
  },
  {
    category: 'postres',
    subcategory: {
      id: 'pasteleria',
      label: { es: 'Pastelería' },
      synonyms: ['pastel', 'pasteles', 'pastelería', 'repostería'],
    },
  },
]
for (const change of TAXONOMY_CHANGES) {
  const category = categories.find((c) => c.id === change.category)
  if (!category) throw new Error(`Categoría inexistente en la taxonomía: ${change.category}`)
  if (change.label) category.label = { ...category.label, es: change.label }
  const subcategory = change.subcategory
  if (subcategory && !category.subcategories.some((s) => s.id === subcategory.id)) {
    category.subcategories.push(subcategory)
  }
  const removal = change.removeSynonyms
  if (removal) {
    const target = category.subcategories.find((s) => s.id === removal.subcategory)
    if (!target) throw new Error(`Subcategoría inexistente: ${removal.subcategory}`)
    target.synonyms = target.synonyms.filter((synonym) => !removal.synonyms.includes(synonym))
  }
}

// ── Evidencia por registro ─────────────────────────────────────────────────────────────────────────
function evidenceFor(decision: PlaceDecision): { entries: LogEntry[]; sources: Evidence[] } {
  const entries = logs.filter(
    (entry) =>
      (!decision.new && entry.betaId === decision.id) || decision.logNames?.includes(entry.name),
  )
  const byUrl = new Map<string, Evidence>()
  for (const evidence of entries.flatMap((entry) => entry.evidence)) {
    if (!isHttpUrl(evidence.url)) continue
    const previous = byUrl.get(evidence.url)
    byUrl.set(
      evidence.url,
      previous
        ? { ...previous, supports: [...new Set([...previous.supports, ...evidence.supports])] }
        : evidence,
    )
  }
  return { entries, sources: [...byUrl.values()] }
}

const betaPlaceById = new Map(beta.places.map((place) => [place.id, place]))
const betaPlazaById = new Map(beta.plazas.map((plaza) => [plaza.id, plaza]))
const unknownBeta = decisions.places.filter((d) => !d.new && !betaPlaceById.has(d.id))
if (unknownBeta.length > 0)
  throw new Error(`Decisiones sin registro beta: ${unknownBeta.map((d) => d.id).join(', ')}`)
const undecided = beta.places.filter(
  (place) => !decisions.places.some((d) => !d.new && d.id === place.id),
)
if (undecided.length > 0)
  throw new Error(`Registros beta sin decisión: ${undecided.map((p) => p.id).join(', ')}`)

// ── Locales de producción ──────────────────────────────────────────────────────────────────────────
const audit = decisions.places.map((decision) => {
  const betaPlace = betaPlaceById.get(decision.id)
  const { entries, sources } = evidenceFor(decision)
  if (isPublishable(decision.status) && sources.length === 0) {
    throw new Error(`${decision.id}: un registro publicable necesita evidencia`)
  }
  return { decision, betaPlace, entries, sources }
})

const places: Place[] = audit
  .filter(({ decision }) => isPublishable(decision.status))
  .map(({ decision, betaPlace, sources }) => {
    const plazaId = decision.plazaId ?? betaPlace?.plazaId
    const name = decision.name ?? betaPlace?.name
    if (!plazaId || !name || !decision.category)
      throw new Error(`${decision.id}: faltan plaza, nombre o categoría`)
    return {
      id: decision.id,
      slug: decision.id,
      name,
      plazaId,
      category: decision.category,
      subcategory: decision.subcategory ?? null,
      description: decision.description ?? null,
      localNumber: decision.localNumber ?? null,
      hours: decision.hours ?? null,
      // Sin coordenadas propias verificadas: la app usa las de la plaza.
      location: null,
      googleMapsUri: null,
      googlePlaceId: null,
      phone: decision.phone ?? null,
      photos: [],
      links: {
        website: decision.links?.website ?? null,
        instagram: decision.links?.instagram ?? null,
        facebook: decision.links?.facebook ?? null,
        tiktok: decision.links?.tiktok ?? null,
        whatsapp: decision.links?.whatsapp ?? null,
      },
      tags: decision.tags ?? [],
      active: true,
      verification: {
        status: decision.status,
        confidence: decision.confidence,
        lastVerifiedAt: researchDate,
        sources: sources.map((source) => source.url),
      },
    }
  })

// ── Plazas ─────────────────────────────────────────────────────────────────────────────────────────
const plazaDecisionById = new Map(decisions.plazas.map((decision) => [decision.id, decision]))
const missingPlazaDecisions = beta.plazas.filter((plaza) => !plazaDecisionById.has(plaza.id))
if (missingPlazaDecisions.length > 0)
  throw new Error(`Plazas sin decisión: ${missingPlazaDecisions.map((p) => p.id).join(', ')}`)

let plazas: Plaza[] = beta.plazas.map((plaza) => {
  const decision = plazaDecisionById.get(plaza.id) as PlazaDecision
  return {
    ...plaza,
    name: decision.name ?? plaza.name,
    address: decision.address ?? plaza.address,
    description: decision.description ?? plaza.description,
    coordinates: decision.coordinates
      ? { lat: decision.coordinates.lat, lng: decision.coordinates.lng }
      : plaza.coordinates,
    active: decision.active ?? isPublishable(decision.status),
    verification: {
      status: decision.status,
      confidence: decision.confidence,
      lastVerifiedAt: researchDate,
      sources: decision.sources,
    },
  }
})
plazas = syncPlazaDerivedFields({ categories, plazas, places })

const dataset = { categories, plazas, places }
const issues = validateRelations(dataset, loadBounds())
for (const issue of issues)
  console[issue.level === 'error' ? 'error' : 'warn'](
    `${issue.level} ${issue.dataset} ${issue.id ?? ''}: ${issue.message}`,
  )
if (issues.some((issue) => issue.level === 'error')) process.exit(1)

const categoriesFile = CategoriesFileSchema.parse({
  $schema: './schemas/categories.schema.json',
  version: 1,
  updatedAt: researchDate,
  categories,
})
const plazasFile = PlazasFileSchema.parse({
  $schema: './schemas/plazas.schema.json',
  version: 1,
  updatedAt: researchDate,
  plazas,
})
const placesFile = PlacesFileSchema.parse({
  $schema: './schemas/places.schema.json',
  version: 1,
  updatedAt: researchDate,
  places,
})
writeDataFile(dataPaths.categories, categoriesFile)
writeDataFile(dataPaths.plazas, plazasFile)
writeDataFile(dataPaths.places, placesFile)

// ── CSV de importación equivalente (con id estable) ───────────────────────────────────────────────
const DAY_ES: Record<(typeof DAY_KEYS)[number], string> = {
  mon: 'lun',
  tue: 'mar',
  wed: 'mie',
  thu: 'jue',
  fri: 'vie',
  sat: 'sab',
  sun: 'dom',
}
const hoursToText = (hours: Hours | null) =>
  hours
    ? DAY_KEYS.filter((day) => hours[day])
        .map(
          (day) =>
            `${DAY_ES[day]} ${(hours[day] ?? []).length === 0 ? 'cerrado' : (hours[day] ?? []).join(', ')}`,
        )
        .join('; ')
    : ''
const plazaName = new Map(plazas.map((plaza) => [plaza.id, plaza.name]))
writeFileSync(
  dataPaths.places.replace('places.json', 'imports/restaurantes-zibata.csv'),
  `${Papa.unparse(
    places.map((place) => ({
      id: place.id,
      name: place.name,
      plaza: plazaName.get(place.plazaId),
      category: place.category,
      subcategory: place.subcategory ?? '',
      localNumber: place.localNumber ?? '',
      description: place.description ?? '',
      hours: hoursToText(place.hours),
      lat: '',
      lng: '',
      googleMapsUri: '',
      website: place.links.website ?? '',
      instagram: place.links.instagram ?? '',
      facebook: place.links.facebook ?? '',
      tiktok: place.links.tiktok ?? '',
      whatsapp: place.links.whatsapp ?? '',
      phone: place.phone ?? '',
      tags: place.tags.join('|'),
      active: 'sí',
    })),
  )}\n`,
)

// ── Entregables de investigación ──────────────────────────────────────────────────────────────────
const categoryLabel = (id: string | undefined) =>
  id
    ? (categories.find((c) => c.id === id)?.label.es ??
      beta.categories.find((c) => c.id === id)?.label.es ??
      id)
    : null
const plazaLabel = (id: string | undefined | null) =>
  id ? (betaPlazaById.get(id)?.name ?? id) : null

const businessAudit = audit.map(({ decision, betaPlace, entries, sources }) => {
  const production = places.find((place) => place.id === decision.id)
  const currentPlaza =
    production?.plazaId ?? decision.currentPlaza ?? decision.candidatePlaza ?? null
  return {
    id: decision.id,
    status: decision.status,
    publishedInApp: Boolean(production),
    withinZibata: decision.withinZibata ?? (production ? true : 'uncertain'),
    confidence: decision.confidence,
    plazaConfidence: decision.plazaConfidence ?? null,
    name: production?.name ?? decision.name ?? betaPlace?.name ?? entries[0]?.name,
    previousName:
      decision.previousName ??
      (betaPlace && production && betaPlace.name !== production.name ? betaPlace.name : null),
    plazaId: currentPlaza,
    category: production?.category ?? decision.category ?? null,
    subcategory: production?.subcategory ?? null,
    beta: betaPlace
      ? {
          name: betaPlace.name,
          plazaId: betaPlace.plazaId,
          category: betaPlace.category,
          active: betaPlace.active,
        }
      : null,
    newRecord: Boolean(decision.new),
    replacedBy: decision.replacedBy ?? null,
    duplicateOf: decision.duplicateOf ?? null,
    lastVerifiedAt: researchDate,
    reason: decision.reason,
    verificationNotes: entries.map((entry) => entry.notes),
    sources: sources.map((source) => ({
      url: source.url,
      level: source.level,
      type: source.type,
      sourceDate: source.sourceDate ?? null,
      checkedAt: researchDate,
      supports: source.supports,
    })),
  }
})
write('research/business-audit.json', { researchDate, datasetVersion, records: businessAudit })

const plazaAudit = {
  researchDate,
  datasetVersion,
  plazas: plazas.map((plaza) => {
    const decision = plazaDecisionById.get(plaza.id) as PlazaDecision
    const betaPlaza = betaPlazaById.get(plaza.id) as Plaza
    return {
      id: plaza.id,
      status: decision.status,
      active: plaza.active,
      confidence: decision.confidence,
      withinZibata: true,
      name: plaza.name,
      previousName:
        decision.previousName ?? (betaPlaza.name !== plaza.name ? betaPlaza.name : null),
      address: plaza.address,
      previousAddress: betaPlaza.address !== plaza.address ? betaPlaza.address : null,
      coordinates: plaza.coordinates,
      locationConfidence: plaza.locationConfidence,
      publishedPlaces: plaza.placeIds.length,
      betaActivePlaces: beta.places.filter((place) => place.plazaId === plaza.id && place.active)
        .length,
      lastVerifiedAt: researchDate,
      notes: decision.notes,
      sources: decision.sources,
    }
  }),
  candidatePlazas: decisions.candidatePlazas,
}
write('research/plaza-audit.json', plazaAudit)

const bucket = (statuses: Status[]) =>
  businessAudit.filter((record) => statuses.includes(record.status))
mkdirSync(`${ROOT}data/research`, { recursive: true })
write('data/research/closed.json', { researchDate, records: bucket(['closed', 'removed']) })
write('data/research/uncertain.json', { researchDate, records: bucket(['uncertain']) })
write('data/research/rejected.json', { researchDate, records: bucket(['rejected', 'duplicate']) })
write('data/research/coming-soon.json', { researchDate, records: bucket(['coming_soon']) })

const comparison = businessAudit
  .filter((record) => record.beta || record.newRecord)
  .map((record) => ({
    betaName: record.beta?.name ?? '',
    status: record.status,
    currentName: record.publishedInApp ? record.name : '',
    betaPlaza: plazaLabel(record.beta?.plazaId) ?? '',
    currentPlaza: plazaLabel(record.plazaId) ?? '',
    betaCategory: categoryLabel(record.beta?.category) ?? '',
    currentCategory: record.publishedInApp
      ? (categoryLabel(record.category ?? undefined) ?? '')
      : '',
    locationChanged: Boolean(
      record.beta && record.plazaId && record.beta.plazaId !== record.plazaId,
    ),
    statusChanged: record.beta ? record.beta.active !== record.publishedInApp : false,
    nameChanged: Boolean(record.beta && record.publishedInApp && record.beta.name !== record.name),
    categoryChanged: Boolean(
      record.beta && record.publishedInApp && record.beta.category !== record.category,
    ),
    newRecord: record.newRecord,
    notes: record.reason,
  }))
write('research/beta-vs-verified.json', { researchDate, rows: comparison })
writeFileSync(`${ROOT}research/beta-vs-verified.csv`, `${Papa.unparse(comparison)}\n`)

const count = <T>(items: T[], key: (item: T) => string) =>
  items.reduce<Record<string, number>>((acc, item) => {
    acc[key(item)] = (acc[key(item)] ?? 0) + 1
    return acc
  }, {})
const betaRows = comparison.filter((row) => row.betaName)
const metrics = {
  researchDate,
  datasetVersion,
  plazas: {
    beta: beta.plazas.length,
    betaActive: beta.plazas.filter((plaza) => plaza.active).length,
    verifiedPublishable: plazaAudit.plazas.filter((plaza) => isPublishable(plaza.status)).length,
    activeInApp: plazas.filter((plaza) => plaza.active && plaza.placeIds.length > 0).length,
    byStatus: count(plazaAudit.plazas, (plaza) => plaza.status),
    renamed: plazaAudit.plazas.filter((plaza) => plaza.previousName).length,
    addressCorrected: plazaAudit.plazas.filter((plaza) => plaza.previousAddress).length,
    candidatesDiscoveredNotOperating: decisions.candidatePlazas.length,
  },
  businesses: {
    candidatesReviewed: businessAudit.length,
    beta: beta.places.length,
    betaActive: beta.places.filter((place) => place.active).length,
    newDiscovered: businessAudit.filter((record) => record.newRecord).length,
    newPublished: businessAudit.filter((record) => record.newRecord && record.publishedInApp)
      .length,
    published: places.length,
    byStatus: count(businessAudit, (record) => record.status),
    betaPublished: betaRows.filter((row) => row.currentName).length,
    betaActiveNowExcluded: betaRows.filter((row) => row.statusChanged && !row.currentName).length,
    betaInactiveNowPublished: betaRows.filter((row) => row.statusChanged && row.currentName).length,
    plazaCorrections: betaRows.filter((row) => row.locationChanged).length,
    nameChanges: betaRows.filter((row) => row.nameChanged).length,
    categoryChanges: betaRows.filter((row) => row.categoryChanged).length,
    confidenceInApp: count(places, (place) => place.verification?.confidence ?? 'none'),
    statusInApp: count(places, (place) => place.verification?.status ?? 'none'),
    withStructuredHours: places.filter((place) => place.hours).length,
    withPhone: places.filter((place) => place.phone).length,
    withLocalNumber: places.filter((place) => place.localNumber).length,
    withDescription: places.filter((place) => place.description).length,
    withOfficialLink: places.filter((place) => Object.values(place.links).some(Boolean)).length,
    withSubcategory: places.filter((place) => place.subcategory).length,
    evidenceUrls: new Set(
      businessAudit.flatMap((record) => record.sources.map((source) => source.url)),
    ).size,
    datedEvidenceWithin12Months: businessAudit.filter((record) =>
      record.sources.some(
        (source) =>
          source.sourceDate &&
          /^\d{4}-\d{2}-\d{2}$/.test(source.sourceDate) &&
          source.sourceDate >= '2025-09-14',
      ),
    ).length,
  },
  categories: {
    beta: beta.categories.length,
    final: categories.length,
    usedInApp: new Set(places.map((place) => place.category)).size,
    usedBetaActive: new Set(
      beta.places.filter((place) => place.active).map((place) => place.category),
    ).size,
    subcategoriesBeta: beta.categories.reduce(
      (sum, category) => sum + category.subcategories.length,
      0,
    ),
    subcategoriesFinal: categories.reduce(
      (sum, category) => sum + category.subcategories.length,
      0,
    ),
    changes: TAXONOMY_CHANGES.map((change) =>
      change.label
        ? `${change.category}: etiqueta «${change.label}»`
        : `${change.category}: nueva subcategoría ${change.subcategory?.id}`,
    ),
  },
}
write('research/metrics.json', metrics)

// ── Fuentes (research/sources.md) ─────────────────────────────────────────────────────────────────
const LEVELS: Record<number, string> = {
  1: 'Nivel 1 · primarias (web oficial, directorio oficial de plaza, desarrollador)',
  2: 'Nivel 2 · canales directos del negocio (redes oficiales, pedidos propios)',
  3: 'Nivel 3 · secundarias (directorios, plataformas de delivery, medios locales)',
  4: 'Nivel 4 · apoyo (publicaciones de usuarios, agregadores)',
}
const domainOf = (url: string) => new URL(url).hostname.replace(/^www\./, '')
const allEvidence = businessAudit.flatMap((record) =>
  record.sources.map((source) => ({ ...source, record: record.id })),
)
const plazaSources = readJsonl<{
  sid: string
  url: string
  level: number
  type: string
  sourceDate: string | null
  findings: string
}>('research/log/sources.jsonl')
const sourcesMd = [
  '# Fuentes de la investigación',
  '',
  `Fecha de investigación: ${researchDate} · versión del dataset ${datasetVersion}.`,
  'Generado por `node scripts/research/build-dataset.ts` a partir de `research/log/*.jsonl`: no editar a mano.',
  '',
  `- URLs de evidencia distintas: ${metrics.businesses.evidenceUrls}`,
  `- Registros con al menos una fuente fechada en los últimos 12 meses: ${metrics.businesses.datedEvidenceWithin12Months}`,
  '- Fechas de publicaciones de Instagram y TikTok obtenidas del identificador público (`scripts/research/post-date.ts`).',
  '- Google Maps se consultó solo como resultado de búsqueda; no se abrieron ni extrajeron fichas de Google.',
  '',
  '## Evidencia por nivel y dominio',
  '',
  ...[1, 2, 3, 4].flatMap((level) => {
    const items = allEvidence.filter((source) => source.level === level)
    const domains = Object.entries(count(items, (source) => domainOf(source.url))).sort(
      (a, b) => b[1] - a[1],
    )
    return [
      `### ${LEVELS[level]} — ${items.length} citas`,
      '',
      '| Dominio | Citas |',
      '| --- | --- |',
      ...domains.map(([domain, n]) => `| ${domain} | ${n} |`),
      '',
    ]
  }),
  '## Fuentes de plazas y descubrimiento',
  '',
  '| Id | Nivel | Tipo | Fecha de la fuente | URL | Hallazgos |',
  '| --- | --- | --- | --- | --- | --- |',
  ...plazaSources.map(
    (source) =>
      `| ${source.sid} | ${source.level} | ${source.type} | ${source.sourceDate ?? '—'} | ${source.url} | ${source.findings.replaceAll('|', '/')} |`,
  ),
  '',
]
writeFileSync(`${ROOT}research/sources.md`, sourcesMd.join('\n'))

console.log(
  `✓ ${places.length} locales publicables · ${plazas.filter((p) => p.active).length} plazas activas · ${businessAudit.length} registros auditados`,
)
console.log(JSON.stringify(metrics.businesses.byStatus))
