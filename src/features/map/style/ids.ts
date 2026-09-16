export const SOURCE = {
  base: 'zibata',
  plazaSites: 'plaza-sites',
  plazaBuildings: 'plaza-buildings',
  mask: 'outside-mask',
  areaLabel: 'area-label',
} as const

/** Capas con las que el usuario interactúa (hover / clic sobre plazas). */
export const INTERACTIVE_PLAZA_LAYERS = ['plaza-buildings', 'plaza-sites-fill'] as const

export const LAYER = {
  plazaSitesFill: 'plaza-sites-fill',
  plazaSitesOutline: 'plaza-sites-outline',
  plazaBuildings: 'plaza-buildings',
  plazaBuildingsInactive: 'plaza-buildings-inactive',
  buildings: 'buildings',
  buildingsOutside: 'buildings-outside',
} as const
