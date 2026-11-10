/**
 * npm run data:validate [-- --fix]
 *
 * Valida data/commercial/*.json: estructura (Zod), relaciones (IDs, plazas, categorías), coordenadas
 * dentro del área del mapa y existencia de las fotografías locales. Se ejecuta antes de cada build.
 * --fix  recalcula los campos derivados de las plazas (placeIds, categories).
 *
 * También regenera data/commercial/schemas/*.schema.json para autocompletado en el editor.
 */
import { existsSync, mkdirSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { z } from 'zod'
import { validarContornoDePlaza } from '../../src/data/geometria.ts'
import {
  type DataIssue,
  isWithinBounds,
  syncPlazaDerivedFields,
  validateRedirects,
  validateRelations,
  validateTranslations,
} from '../../src/data/relations.ts'
import {
  CategoriesFileSchema,
  PlacesFileSchema,
  PlazasFileSchema,
  RedirectsFileSchema,
} from '../../src/data/schemas.ts'
import { variantPath } from '../../src/lib/image-variants.ts'
import {
  DatasetError,
  dataPaths,
  loadAjustesEdificios,
  loadBounds,
  loadCategoriesFile,
  loadContorno,
  loadPlacesFile,
  loadPlazasFile,
  loadRedirectsFile,
  loadVolumenesPlaza,
  today,
  writeDataFile,
} from './lib/dataset.ts'

const { values } = parseArgs({ options: { fix: { type: 'boolean', default: false } } })

mkdirSync(dataPaths.schemasDir, { recursive: true })
for (const [name, schema] of [
  ['categories', CategoriesFileSchema],
  ['plazas', PlazasFileSchema],
  ['places', PlacesFileSchema],
  ['redirects', RedirectsFileSchema],
] as const) {
  writeDataFile(
    `${dataPaths.schemasDir}/${name}.schema.json`,
    z.toJSONSchema(schema, { unrepresentable: 'any' }),
  )
}

try {
  const categoriesFile = loadCategoriesFile()
  const plazasFile = loadPlazasFile()
  const placesFile = loadPlacesFile()
  if (!placesFile)
    throw new DatasetError(`No existe ${dataPaths.places}. Ejecuta npm run data:import.`)

  const dataset = {
    categories: categoriesFile.categories,
    plazas: plazasFile.plazas,
    places: placesFile.places,
  }

  if (values.fix) {
    dataset.plazas = syncPlazaDerivedFields(dataset)
    writeDataFile(dataPaths.plazas, { ...plazasFile, updatedAt: today(), plazas: dataset.plazas })
    console.log('✓ placeIds y categories de las plazas recalculados')
  }

  const bounds = loadBounds()
  if (!bounds)
    console.warn('⚠ Sin data/geographic/extent.json: no se validan coordenadas (npm run map:build)')

  const issues: DataIssue[] = [
    ...validateRelations(dataset, bounds),
    ...validateTranslations(dataset),
    ...validateRedirects(loadRedirectsFile()?.redirects ?? [], dataset),
  ]

  // El contorno de cada plaza, con las mismas reglas que aplica el Worker cuando el panel lo guarda.
  const contorno = loadContorno()
  for (const plaza of dataset.plazas) {
    const otras = dataset.plazas.flatMap((otra) =>
      otra.id !== plaza.id && otra.geometry.type === 'Polygon'
        ? [{ id: otra.id, anillo: otra.geometry.coordinates[0] ?? [] }]
        : [],
    )
    for (const problema of validarContornoDePlaza(plaza.geometry, {
      contorno,
      marcador: plaza.coordinates,
      otras,
    })) {
      issues.push({ level: 'error', dataset: 'plazas', id: plaza.id, message: problema.mensaje })
    }
  }

  // Los ajustes de edificios: forma, punto dentro del área y sin dos ajustes sobre el mismo punto. Que cada punto
  // caiga en UNA huella solo se puede saber con el crudo: lo comprueba `map:build`, y falla si no.
  const vistos = new Set<string>()
  for (const ajuste of loadAjustesEdificios().ajustes) {
    const clave = `${ajuste.punto.lat},${ajuste.punto.lng}`
    const donde = `${ajuste.accion} en (${clave})`
    if (vistos.has(clave)) {
      issues.push({
        level: 'error',
        dataset: 'ajustes-edificios',
        id: donde,
        message: 'Hay dos ajustes en el mismo punto',
      })
    }
    vistos.add(clave)
    if (bounds && !isWithinBounds(ajuste.punto, bounds)) {
      issues.push({
        level: 'error',
        dataset: 'ajustes-edificios',
        id: donde,
        message: 'El punto cae fuera del área del mapa',
      })
    }
  }

  // El volumen provisional: la forma la fija el esquema; aquí, que cada clave sea una plaza que existe.
  const idsDePlaza = new Set(dataset.plazas.map((plaza) => plaza.id))
  for (const id of Object.keys(loadVolumenesPlaza().plazas)) {
    if (!idsDePlaza.has(id)) {
      issues.push({
        level: 'error',
        dataset: 'volumenes-plaza',
        id,
        message: 'Esa plaza no existe: quita su entrada de volumenes-plaza.json',
      })
    }
  }

  for (const place of dataset.places) {
    for (const photo of place.photos) {
      if (/^https:\/\//.test(photo.src)) continue
      if (!existsSync(`${dataPaths.public}/${photo.src}`)) {
        issues.push({
          level: 'error',
          dataset: 'places',
          id: place.id,
          message: `No existe la foto public/${photo.src}`,
        })
      }
      // Cada ancho declarado en `variants` se sirve en AVIF y WebP (srcset): una variante ausente es un 404.
      for (const width of photo.variants ?? []) {
        for (const format of ['avif', 'webp'] as const) {
          const variant = variantPath(photo.src, width, format)
          if (!existsSync(`${dataPaths.public}/${variant}`)) {
            issues.push({
              level: 'error',
              dataset: 'places',
              id: place.id,
              message: `No existe la variante public/${variant}`,
            })
          }
        }
      }
    }
  }

  /*
   * Un horario a medias no se ve en la guía: el día ausente sale "sin horario publicado" y nadie se
   * entera de que falta un dato. Pasó con once locales y lo encontró una persona mirando una ficha,
   * no una comprobación.
   *
   * Un día que el local no abre se escribe como lista vacía (`"mon": []`), que es lo que el
   * analizador del CSV produce con `lun cerrado`. Ausente significa "no se comprobó", y eso es lo
   * que aquí se avisa.
   */
  const DIAS_SEMANA = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
  for (const place of dataset.places) {
    if (!place.hours) continue
    const faltan = DIAS_SEMANA.filter((dia) => place.hours?.[dia] === undefined)
    if (faltan.length === 0 || faltan.length === DIAS_SEMANA.length) continue
    issues.push({
      level: 'warning',
      dataset: 'places',
      id: place.id,
      message: `Horario a medias: faltan ${faltan.join(', ')}. Si no abre esos días, ponlos como lista vacía; si no se comprobaron, queda pendiente`,
    })
  }

  const errors = issues.filter((issue) => issue.level === 'error')
  const warnings = issues.filter((issue) => issue.level === 'warning')
  for (const issue of [...errors, ...warnings]) {
    const log = issue.level === 'error' ? console.error : console.warn
    log(
      `${issue.level === 'error' ? '✗' : '⚠'} ${issue.dataset}${issue.id ? ` [${issue.id}]` : ''}: ${issue.message}`,
    )
  }

  const active = dataset.places.filter((place) => place.active).length
  console.log(
    `${dataset.categories.length} categorías · ${dataset.plazas.length} plazas · ${dataset.places.length} locales (${active} activos) · ${errors.length} errores · ${warnings.length} avisos`,
  )
  if (errors.length > 0) {
    if (errors.some((e) => /placeIds|categories no coincide/.test(e.message))) {
      console.error('Sugerencia: npm run data:validate -- --fix recalcula los campos derivados.')
    }
    process.exit(1)
  }
} catch (error) {
  if (error instanceof DatasetError) {
    console.error(`✗ ${error.message}`)
    process.exit(1)
  }
  throw error
}
