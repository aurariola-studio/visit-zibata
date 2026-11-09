import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { AjustesEdificiosFileSchema } from '../../../src/data/ajustes-edificios.ts'
import type { Bounds } from '../../../src/data/relations.ts'
import {
  CategoriesFileSchema,
  PlacesFileSchema,
  PlazasFileSchema,
  RedirectsFileSchema,
} from '../../../src/data/schemas.ts'

export const ROOT = fileURLToPath(new URL('../../../', import.meta.url))

export const dataPaths = {
  categories: `${ROOT}data/commercial/categories.json`,
  plazas: `${ROOT}data/commercial/plazas.json`,
  places: `${ROOT}data/commercial/places.json`,
  redirects: `${ROOT}data/commercial/redirects.json`,
  ajustesEdificios: `${ROOT}data/geographic/ajustes-edificios.json`,
  schemasDir: `${ROOT}data/commercial/schemas`,
  extent: `${ROOT}data/geographic/extent.json`,
  public: `${ROOT}public`,
}

export type CategoriesFile = z.infer<typeof CategoriesFileSchema>
export type PlazasFile = z.infer<typeof PlazasFileSchema>
export type PlacesFile = z.infer<typeof PlacesFileSchema>
export type RedirectsFile = z.infer<typeof RedirectsFileSchema>

export class DatasetError extends Error {}

function parseFile<T extends z.ZodType>(file: string, schema: T): z.infer<T> {
  let json: unknown
  try {
    json = JSON.parse(readFileSync(file, 'utf8'))
  } catch (error) {
    throw new DatasetError(`${file}: JSON no válido (${(error as Error).message})`)
  }
  const result = schema.safeParse(json)
  if (!result.success) {
    throw new DatasetError(`${file}:\n${z.prettifyError(result.error)}`)
  }
  return result.data
}

export function loadCategoriesFile(): CategoriesFile {
  return parseFile(dataPaths.categories, CategoriesFileSchema)
}

export function loadPlazasFile(): PlazasFile {
  return parseFile(dataPaths.plazas, PlazasFileSchema)
}

export function loadPlacesFile(): PlacesFile | null {
  return existsSync(dataPaths.places) ? parseFile(dataPaths.places, PlacesFileSchema) : null
}

export function loadAjustesEdificios(): z.infer<typeof AjustesEdificiosFileSchema> {
  return parseFile(dataPaths.ajustesEdificios, AjustesEdificiosFileSchema)
}

export function loadRedirectsFile(): RedirectsFile | null {
  return existsSync(dataPaths.redirects)
    ? parseFile(dataPaths.redirects, RedirectsFileSchema)
    : null
}

/** Área válida para coordenadas: la extensión del mapa generada por el pipeline GIS. */
export function loadBounds(): Bounds | undefined {
  if (!existsSync(dataPaths.extent)) return undefined
  const extent = JSON.parse(readFileSync(dataPaths.extent, 'utf8')) as {
    areaBbox: [number, number, number, number]
  }
  const [west, south, east, north] = extent.areaBbox
  return { west, south, east, north }
}

/** El anillo exterior del contorno de Zibatá (`extent.json`), para validar el contorno de las plazas. */
export function loadContorno(): number[][] | undefined {
  if (!existsSync(dataPaths.extent)) return undefined
  const extent = JSON.parse(readFileSync(dataPaths.extent, 'utf8')) as {
    boundary?: { coordinates?: number[][][] }
  }
  return extent.boundary?.coordinates?.[0]
}

export function writeDataFile(file: string, value: unknown): void {
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`)
}

export const today = () => new Date().toISOString().slice(0, 10)
