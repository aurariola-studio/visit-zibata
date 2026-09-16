/** Minúsculas y sin diacríticos: "Café Zielo" → "cafe zielo". */
export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Términos útiles de una consulta: normalizados y de al menos 2 caracteres (una letra suelta no filtra).
 * Lo comparten la búsqueda y el indicador de filtros activos para que nunca se contradigan.
 */
export function searchTerms(query: string): string[] {
  return normalizeText(query)
    .split(' ')
    .filter((term) => term.length >= 2)
}

/** Texto reducido a palabras alfanuméricas separadas por un espacio (con uno inicial) para buscar por inicio de palabra. */
export function wordText(value: string): string {
  return ` ${normalizeText(value)
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()}`
}

/** "D’Lu Coffee & Bakery" → "dlu-coffee-bakery" */
export function slugify(value: string): string {
  return normalizeText(value)
    .replace(/['’`´]/g, '')
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
