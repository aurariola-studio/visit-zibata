/**
 * Estado compartible en el hash (funciona en GitHub Pages sin reescrituras de rutas):
 *   #/                               inicio
 *   #/plaza/paseo-zibata              plaza seleccionada
 *   #/lugar/tomassa                   ficha de un lugar (su plaza se deduce)
 *   #/plaza/paseo-zibata?categoria=pizza
 */
export interface UrlState {
  plazaSlug: string | null
  placeSlug: string | null
  categoryId: string | null
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function parseHash(hash: string): UrlState {
  const [path = '', query = ''] = hash.replace(/^#/, '').split('?')
  const segments = path.split('/').filter(Boolean)
  const params = new URLSearchParams(query)
  const category = params.get('categoria')
  const state: UrlState = {
    plazaSlug: null,
    placeSlug: null,
    categoryId: category && SLUG.test(category) ? category : null,
  }
  const [kind, slug] = segments
  if (slug && SLUG.test(slug)) {
    if (kind === 'plaza') state.plazaSlug = slug
    if (kind === 'lugar') state.placeSlug = slug
  }
  return state
}

export function buildHash(state: UrlState): string {
  let path = '#/'
  if (state.placeSlug) path = `#/lugar/${state.placeSlug}`
  else if (state.plazaSlug) path = `#/plaza/${state.plazaSlug}`
  return state.categoryId ? `${path}?categoria=${state.categoryId}` : path
}
