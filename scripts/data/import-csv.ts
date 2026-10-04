/**
 * npm run data:import -- data/commercial/imports/restaurantes-zibata.csv [--dry-run]
 *
 * Importa locales desde CSV (UTF-8, con encabezados) a data/commercial/places.json.
 * - Crea los locales nuevos y actualiza los existentes (mismo id) con las columnas no vacías,
 *   conservando lo que no viene en el CSV (fotos, googlePlaceId…).
 * - Recalcula `placeIds` y `categories` de cada plaza y valida todo el conjunto antes de escribir.
 */
import { readFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import Papa from 'papaparse'
import { syncPlazaDerivedFields, validateRelations } from '../../src/data/relations.ts'
import { slugify } from '../../src/lib/text.ts'
import type { Place } from '../../src/types/domain.ts'
import { CSV_COLUMNS, type CsvRow, rowToPlace } from './lib/csv-row.ts'
import {
  dataPaths,
  loadBounds,
  loadCategoriesFile,
  loadPlacesFile,
  loadPlazasFile,
  today,
  writeDataFile,
} from './lib/dataset.ts'

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { 'dry-run': { type: 'boolean', default: false } },
})

const csvPath = positionals[0]
if (!csvPath) {
  console.error('Uso: npm run data:import -- <archivo.csv> [--dry-run]')
  process.exit(1)
}

const parsed = Papa.parse<CsvRow>(readFileSync(csvPath, 'utf8').replace(/^﻿/, ''), {
  header: true,
  skipEmptyLines: 'greedy',
  transformHeader: (header) => header.trim(),
})
if (parsed.errors.length > 0) {
  for (const error of parsed.errors)
    console.error(`CSV fila ${(error.row ?? 0) + 2}: ${error.message}`)
  process.exit(1)
}
const unknownColumns = (parsed.meta.fields ?? []).filter(
  (field) => !(CSV_COLUMNS as readonly string[]).includes(field),
)
if (unknownColumns.length > 0) console.warn(`⚠ Columnas ignoradas: ${unknownColumns.join(', ')}`)

const categoriesFile = loadCategoriesFile()
const plazasFile = loadPlazasFile()
const existing = loadPlacesFile()
const places = new Map<string, Place>((existing?.places ?? []).map((place) => [place.id, place]))
const context = { categories: categoriesFile.categories, plazas: plazasFile.plazas }

const usedIds = new Set<string>()
let created = 0
let updated = 0
let failed = 0

parsed.data.forEach((row, index) => {
  const line = index + 2
  const explicitId = row.id?.trim()
  const base = slugify(row.name ?? '')
  const plazaSlug = slugify(row.plaza ?? '')
  // Con columna `id` el registro conserva su identificador aunque cambie el nombre. Sin ella, mismo
  // nombre en otra plaza (p. ej. cadenas) se desambigua con la plaza.
  let id = explicitId || base
  if (explicitId && usedIds.has(id)) {
    failed++
    console.error(`✗ fila ${line} (${row.name ?? '¿?'}): id repetido "${id}"`)
    return
  }
  if (!explicitId && usedIds.has(id)) id = `${base}-${plazaSlug}`
  for (let n = 2; !explicitId && usedIds.has(id); n++) id = `${base}-${plazaSlug}-${n}`

  const result = rowToPlace(row, id, context)
  for (const warning of result.warnings) console.warn(`⚠ fila ${line} (${row.name}): ${warning}`)
  if (!result.place) {
    failed++
    for (const error of result.errors)
      console.error(`✗ fila ${line} (${row.name ?? '¿?'}): ${error}`)
    return
  }
  usedIds.add(id)

  const previous = places.get(id)
  if (previous) {
    const incoming = result.place
    const links = { ...previous.links }
    for (const key of Object.keys(incoming.links) as (keyof Place['links'])[]) {
      if (incoming.links[key]) links[key] = incoming.links[key]
    }
    places.set(id, {
      ...previous,
      name: incoming.name,
      plazaId: incoming.plazaId,
      giros: incoming.giros,
      active: incoming.active,
      description: incoming.description ?? previous.description,
      hours: incoming.hours ?? previous.hours,
      location: incoming.location ?? previous.location,
      googleMapsUri: incoming.googleMapsUri ?? previous.googleMapsUri,
      phone: incoming.phone ?? previous.phone,
      links,
    })
    updated++
  } else {
    places.set(id, result.place)
    created++
  }
})

if (failed > 0) {
  console.error(`\n✗ ${failed} fila(s) con errores. No se escribió ningún archivo.`)
  process.exit(1)
}

const dataset = {
  categories: categoriesFile.categories,
  plazas: plazasFile.plazas,
  places: [...places.values()],
}
dataset.plazas = syncPlazaDerivedFields(dataset)

const issues = validateRelations(dataset, loadBounds())
for (const issue of issues) {
  const log = issue.level === 'error' ? console.error : console.warn
  log(
    `${issue.level === 'error' ? '✗' : '⚠'} ${issue.dataset}${issue.id ? ` [${issue.id}]` : ''}: ${issue.message}`,
  )
}
if (issues.some((issue) => issue.level === 'error')) process.exit(1)

console.log(
  `\n${created} locales nuevos, ${updated} actualizados, ${dataset.places.length} en total.`,
)
if (values['dry-run']) {
  console.log('(--dry-run: no se escribieron archivos)')
} else {
  writeDataFile(dataPaths.places, {
    $schema: './schemas/places.schema.json',
    version: 1,
    updatedAt: today(),
    places: dataset.places,
  })
  writeDataFile(dataPaths.plazas, { ...plazasFile, updatedAt: today(), plazas: dataset.plazas })
  console.log(`✓ Escrito ${dataPaths.places} y ${dataPaths.plazas}`)
}
