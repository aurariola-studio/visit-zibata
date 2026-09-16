/**
 * Implementación estática: los JSON de data/commercial se empaquetan como chunks separados
 * (import dinámico, con hash para caché inmutable). El build los valida con Zod; aquí se validan registro a
 * registro sin Zod (`runtimeValidation.ts`): un registro inválido se omite con un aviso en consola.
 */
import { DataLoadError, type PlacesRepository } from './PlacesRepository.ts'
import {
  type RecordIssue,
  readCollection,
  validateCategories,
  validatePlaces,
  validatePlazas,
} from './runtimeValidation.ts'

async function load<T>(
  name: string,
  key: string,
  loader: () => Promise<{ default: unknown }>,
  validate: (records: unknown[]) => { valid: T[]; issues: RecordIssue[] },
): Promise<T[]> {
  let json: unknown
  try {
    json = (await loader()).default
  } catch (error) {
    throw new DataLoadError(`No se pudo descargar ${name}`, [String(error)])
  }
  const records = readCollection(json, key)
  if (!records) {
    throw new DataLoadError(`Datos no válidos en ${name}`, [`Falta la lista "${key}"`])
  }
  const { valid, issues } = validate(records)
  for (const issue of issues) {
    console.warn(`[datos] ${name} [${issue.id}] omitido: ${issue.message}`)
  }
  return valid
}

export class StaticPlacesRepository implements PlacesRepository {
  private categories?: ReturnType<PlacesRepository['getCategories']>
  private plazas?: ReturnType<PlacesRepository['getPlazas']>
  private places?: ReturnType<PlacesRepository['getPlaces']>

  getCategories() {
    this.categories ??= load(
      'categories.json',
      'categories',
      () => import('../../data/commercial/categories.json'),
      validateCategories,
    )
    return this.categories
  }

  getPlazas() {
    this.plazas ??= load(
      'plazas.json',
      'plazas',
      () => import('../../data/commercial/plazas.json'),
      validatePlazas,
    )
    return this.plazas
  }

  getPlaces() {
    this.places ??= load(
      'places.json',
      'places',
      () => import('../../data/commercial/places.json'),
      validatePlaces,
    )
    return this.places
  }
}
