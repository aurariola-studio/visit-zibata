import type { Category, PlaceDetailData, PlaceSummary, Plaza, Sector } from '../types/domain.ts'

/**
 * Acceso a datos comerciales. La UI solo depende de esta interfaz: hoy la implementa
 * `StaticPlacesRepository` (JSON estático); mañana puede hacerlo un CMS, Supabase o una API
 * (ver docs/ARQUITECTURA.md) sin cambiar componentes, búsqueda ni filtros.
 */
/** Un local que ya no existe: lo único que se conserva es qué giros tenía y en qué plaza estaba. */
export interface RetiredPlace {
  id: string
  giros: string[]
  plazaId: string
}

export interface PlacesRepository {
  getCategories(): Promise<Category[]>
  /** Los sectores que agrupan las categorías. Opcional: sin ellos las categorías van sueltas, como siempre. */
  getSectors?(): Promise<Sector[]>
  getPlazas(): Promise<Plaza[]>
  /** Todos los locales, activos e inactivos, con lo que pintan las tarjetas, el mapa y los filtros. */
  getPlaceSummaries(): Promise<PlaceSummary[]>
  /** Lo que solo lee la ficha y el buscador, de todos los locales. Llega aparte del resumen. */
  getPlaceDetails(): Promise<PlaceDetailData[]>
  /** Los locales borrados desde el panel. Opcional: sin ellos la guía funciona igual. */
  getRetired?(): Promise<RetiredPlace[]>
}

export class DataLoadError extends Error {
  readonly details: string[]
  constructor(message: string, details: string[] = []) {
    super(message)
    this.name = 'DataLoadError'
    this.details = details
  }
}
