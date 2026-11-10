import type { z } from 'zod'
import type {
  CategorySchema,
  DAY_KEYS,
  GiroSchema,
  HoursSchema,
  LatLngSchema,
  LinksSchema,
  LocalizedTextSchema,
  PhotoSchema,
  PlaceSchema,
  PlazaGeometrySchema,
  PlazaSchema,
  SectorSchema,
} from '../data/schemas.ts'

export type LocalizedText = z.infer<typeof LocalizedTextSchema>
export type LatLng = z.infer<typeof LatLngSchema>
export type DayKey = (typeof DAY_KEYS)[number]
export type Hours = z.infer<typeof HoursSchema>
export type Photo = z.infer<typeof PhotoSchema>
export type Links = z.infer<typeof LinksSchema>
export type Place = z.infer<typeof PlaceSchema>
export type PlazaGeometry = z.infer<typeof PlazaGeometrySchema>
export type Plaza = z.infer<typeof PlazaSchema>
export type Giro = z.infer<typeof GiroSchema>
export type Category = z.infer<typeof CategorySchema>
export type Sector = z.infer<typeof SectorSchema>

/** Datos comerciales listos para la UI: colecciones validadas + índices de acceso. */
export interface Catalog {
  categories: Category[]
  plazas: Plaza[]
  /** Solo locales activos, en el orden del dataset. */
  places: Place[]
  categoryById: ReadonlyMap<string, Category>
  /** Cada giro por su id, y la categoría de la que cuelga: de ahí sale todo lo demás. */
  giroById: ReadonlyMap<string, Giro>
  categoryOfGiro: ReadonlyMap<string, Category>
  plazaById: ReadonlyMap<string, Plaza>
  plazaBySlug: ReadonlyMap<string, Plaza>
  placeById: ReadonlyMap<string, Place>
  /**
   * Los giros y la plaza de lo que ya no se muestra: un local oculto, en una plaza inactiva o borrado
   * desde el panel. Lo que alguien marcó ahí sigue diciendo qué le gusta aunque el local no esté.
   */
  retiredById: ReadonlyMap<string, Pick<Place, 'giros' | 'plazaId'>>
  placeBySlug: ReadonlyMap<string, Place>
  /** Locales activos agrupados por plaza. */
  placesByPlaza: ReadonlyMap<string, Place[]>
}
