/**
 * Resuelve rutas de assets publicados en `public/` respetando el `base` de Vite, de modo que
 * funcionen igual en la raíz de un dominio que en un subdirectorio (GitHub Pages).
 */
export function assetUrl(path: string): string {
  if (/^https:\/\//.test(path)) return path
  const base = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`
  return `${base}${path.replace(/^\/+/, '')}`
}

/** URL absoluta: el worker del mapa pide las teselas desde su propio contexto, sin la página. */
export function absoluteAssetUrl(path: string): string {
  return new URL(assetUrl(path), window.location.origin).href
}
