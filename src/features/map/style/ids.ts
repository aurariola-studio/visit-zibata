export const SOURCE = {
  base: 'zibata',
  plazaSites: 'plaza-sites',
  plazaBuildings: 'plaza-buildings',
  mask: 'outside-mask',
  /** Capas de realismo (ver layers/realismo.ts). */
  soil: 'realismo-suelo',
  relief: 'realismo-relieve',
  contextRoads: 'realismo-vias',
} as const

/** Capas con las que el usuario interactúa (hover / clic sobre plazas). */
export const INTERACTIVE_PLAZA_LAYERS = [
  'plaza-buildings',
  'plaza-buildings-rectos',
  'plaza-sites-fill',
] as const

export const LAYER = {
  plazaSitesFill: 'plaza-sites-fill',
  plazaSitesOutline: 'plaza-sites-outline',
  plazaSitesSoon: 'plaza-sites-soon',
  plazaBuildings: 'plaza-buildings',
  /** Las piezas dibujadas a mano (canchas, foodtrucks): de esquinas rectas, no redondeadas. */
  plazaBuildingsRectos: 'plaza-buildings-rectos',
  plazaBuildingsInactive: 'plaza-buildings-inactive',
  buildings: 'buildings',
  buildingsOutside: 'buildings-outside',
  trees: 'trees',
  treeTrunks: 'tree-trunks',
  treeShrubs: 'tree-shrubs',
} as const
