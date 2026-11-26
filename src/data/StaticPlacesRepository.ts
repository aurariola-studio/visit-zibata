/**
 * Implementación estática: los JSON de data/commercial se empaquetan como chunks separados
 * (import dinámico, con hash para caché inmutable). El build los valida con Zod; aquí se validan registro a
 * registro sin Zod (`runtimeValidation.ts`): un registro inválido se omite con un aviso en consola.
 */
import type { PlaceDetailData, PlaceSummary, Sector } from '../types/domain.ts'
import { DataLoadError, type PlacesRepository, type RetiredPlace } from './PlacesRepository.ts'
import {
  type RecordIssue,
  readCollection,
  validateCategories,
  validatePlaceDetails,
  validatePlaceSummaries,
  validatePlazas,
  validateRetired,
  validateSectors,
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
  private sectors?: Promise<Sector[]>
  private plazas?: ReturnType<PlacesRepository['getPlazas']>
  private summaries?: Promise<PlaceSummary[]>
  private details?: Promise<PlaceDetailData[]>
  private retired?: Promise<RetiredPlace[]>

  getCategories() {
    this.categories ??= load(
      'categories.json',
      'categories',
      () => import('../../data/commercial/categories.json'),
      validateCategories,
    )
    return this.categories
  }

  /** Los sectores viven en el mismo archivo que las categorías y son opcionales: sin ellos, lista vacía. */
  getSectors() {
    this.sectors ??= import('../../data/commercial/categories.json').then(
      ({ default: json }) => {
        const records = readCollection(json, 'sectors')
        if (!records) return []
        const { valid, issues } = validateSectors(records)
        for (const issue of issues) {
          console.warn(`[datos] categories.json sector [${issue.id}] omitido: ${issue.message}`)
        }
        return valid
      },
      () => [],
    )
    return this.sectors
  }

  getPlazas() {
    this.plazas ??= load(
      'plazas.json',
      'plazas',
      () => import('virtual:zibata-plazas'),
      validatePlazas,
    )
    return this.plazas
  }

  getRetired() {
    this.retired ??= load(
      'redirects.json',
      'redirects',
      () => import('../../data/commercial/redirects.json'),
      validateRetired,
    )
    return this.retired
  }

  /**
   * Lo que pintan las tarjetas, el mapa y los filtros. Un paquete aparte del detalle (ver `placeFields.ts`).
   * Si la descarga falla, la próxima llamada vuelve a pedirlo en lugar de quedarse con el fallo.
   */
  getPlaceSummaries() {
    this.summaries ??= load(
      'places-resumen',
      'places',
      () => import('virtual:zibata-places-resumen'),
      validatePlaceSummaries,
    ).catch((error: unknown) => {
      this.summaries = undefined
      throw error
    })
    return this.summaries
  }

  /** Lo que solo lee la ficha y el buscador: descripción, enlaces, teléfono y la ruta a la puerta. */
  getPlaceDetails() {
    this.details ??= load(
      'places-detalle',
      'places',
      () => import('virtual:zibata-places-detalle'),
      validatePlaceDetails,
    ).catch((error: unknown) => {
      this.details = undefined
      throw error
    })
    return this.details
  }
}
