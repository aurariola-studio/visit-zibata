import type { Category, Place, Plaza } from '../types/domain.ts'

/**
 * Acceso a datos comerciales. La UI solo depende de esta interfaz: hoy la implementa
 * `StaticPlacesRepository` (JSON estático); mañana puede hacerlo un CMS, Supabase o una API
 * (ver docs/ARQUITECTURA.md) sin cambiar componentes, búsqueda ni filtros.
 */
export interface PlacesRepository {
  getCategories(): Promise<Category[]>
  getPlazas(): Promise<Plaza[]>
  /** Todos los locales, activos e inactivos. */
  getPlaces(): Promise<Place[]>
}

export class DataLoadError extends Error {
  readonly details: string[]
  constructor(message: string, details: string[] = []) {
    super(message)
    this.name = 'DataLoadError'
    this.details = details
  }
}
