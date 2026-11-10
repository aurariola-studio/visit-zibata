/**
 * npm run data:import -- data/commercial/imports/restaurantes-zibata.csv [--dry-run]
 *
 * Importa locales desde CSV (UTF-8, con encabezados) a data/commercial/places.json. Cada fila pasa por
 * `prepararNegocio`, el mismo camino que el formulario del panel (worker/importar-csv.ts): las reglas de
 * publicación son las del panel, no unas propias del script.
 *
 * - Una fila crea un local o actualiza el que ya existe (por `id`, o por el mismo nombre en la misma plaza).
 *   Una columna vacía conserva lo que el local ya tiene.
 * - Un local nuevo exige su procedencia: columnas `fuentes` y/o `comprobado`. Sin ellas, la fila se rechaza.
 * - Todo o nada: si una fila falla, no se escribe ningún archivo.
 */
import { readFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import Papa from 'papaparse'
import { CSV_COLUMNS, type CsvRow } from '../../src/data/csv-negocio.ts'
import { syncPlazaDerivedFields, validateRelations } from '../../src/data/relations.ts'
import { MENSAJE_NO_UTF8, noEsUtf8 } from '../../src/data/utf8.ts'
import { fechaLocal } from '../../worker/analitica.ts'
import { importarFilas } from '../../worker/importar-csv.ts'
import {
  dataPaths,
  loadBounds,
  loadCategoriesFile,
  loadPlacesFile,
  loadPlazasFile,
  loadRedirectsFile,
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

const contenido = readFileSync(csvPath, 'utf8')
if (noEsUtf8(contenido)) {
  console.error(`✗ ${MENSAJE_NO_UTF8}`)
  process.exit(1)
}
const parsed = Papa.parse<CsvRow>(contenido.replace(/^﻿/, ''), {
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
const placesFile = loadPlacesFile()
const redirectsFile = loadRedirectsFile()
const dataset = {
  ...(categoriesFile.sectors && { sectors: categoriesFile.sectors }),
  categories: categoriesFile.categories,
  plazas: plazasFile.plazas,
  places: placesFile?.places ?? [],
}
const crudo = {
  categories: JSON.parse(readFileSync(dataPaths.categories, 'utf8')),
  plazas: JSON.parse(readFileSync(dataPaths.plazas, 'utf8')),
  places: JSON.parse(readFileSync(dataPaths.places, 'utf8')),
  ...(redirectsFile ? { redirects: JSON.parse(readFileSync(dataPaths.redirects, 'utf8')) } : {}),
}

const resultado = importarFilas(parsed.data, dataset, crudo, fechaLocal(new Date()))

for (const fila of resultado.filas) {
  const etiqueta = `fila ${fila.linea} (${fila.nombre || '¿?'})`
  for (const aviso of fila.avisos) console.warn(`⚠ ${etiqueta}: ${aviso}`)
  if (fila.ok) {
    if (fila.afirma.length > 0) console.log(`• ${etiqueta}: afirma ${fila.afirma.join(' y ')}`)
  } else {
    for (const problema of fila.problemas) console.error(`✗ ${etiqueta}: ${problema}`)
  }
}

const fallidas = resultado.filas.filter((fila) => !fila.ok).length
if (!resultado.archivos) {
  console.error(`\n✗ ${fallidas} fila(s) con errores. No se escribió ningún archivo.`)
  process.exit(1)
}

// Una última revisión del conjunto, por si una fila válida sola rompe algo junto a otras.
const final = {
  ...resultado.dataset,
  plazas: syncPlazaDerivedFields(resultado.dataset),
}
const issues = validateRelations(final, loadBounds())
for (const issue of issues) {
  const log = issue.level === 'error' ? console.error : console.warn
  log(
    `${issue.level === 'error' ? '✗' : '⚠'} ${issue.dataset}${issue.id ? ` [${issue.id}]` : ''}: ${issue.message}`,
  )
}
if (issues.some((issue) => issue.level === 'error')) process.exit(1)

console.log(
  `\n${resultado.creados} locales nuevos, ${resultado.actualizados} actualizados, ${final.places.length} en total.`,
)
if (values['dry-run']) {
  console.log('(--dry-run: no se escribieron archivos)')
} else {
  writeDataFile(dataPaths.places, resultado.archivos.lugares)
  writeDataFile(dataPaths.plazas, resultado.archivos.plazas)
  console.log(`✓ Escrito ${dataPaths.places} y ${dataPaths.plazas}`)
}
