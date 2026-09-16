/**
 * Búsqueda del lado del cliente con Fuse.js: tolera errores menores de escritura, ignora acentos y
 * usa los sinónimos definidos en categories.json ("cafe" → café, cafetería, coffee).
 * Consultas de varias palabras exigen que cada palabra coincida ("tacos zielo").
 * Si una palabra aparece literalmente al inicio de alguna palabra de un lugar, solo cuentan esas coincidencias
 * ("pasta" no trae "pastor", "bar" no trae "parrilla" ni "barista"... salvo que no haya ninguna al inicio: entonces
 * cuentan las que la contienen ("ron" → "camarón"), y la tolerancia a errores solo cuando no hay ninguna literal.
 */
import Fuse, { type IFuseOptions } from 'fuse.js'
import { localized } from '../../i18n/index.ts'
import { searchTerms, wordText } from '../../lib/text.ts'
import type { Catalog, Place } from '../../types/domain.ts'

interface SearchDocument {
  id: string
  name: string
  plaza: string
  category: string
  categorySynonyms: string[]
  subcategory: string
  subcategorySynonyms: string[]
  tags: string[]
  description: string
}

const OPTIONS: IFuseOptions<SearchDocument> = {
  keys: [
    { name: 'name', weight: 3 },
    { name: 'category', weight: 1.6 },
    { name: 'subcategory', weight: 1.4 },
    { name: 'plaza', weight: 1.2 },
    { name: 'categorySynonyms', weight: 1.1 },
    { name: 'subcategorySynonyms', weight: 1 },
    { name: 'tags', weight: 1 },
    { name: 'description', weight: 0.4 },
  ],
  ignoreDiacritics: true,
  ignoreLocation: true,
  includeScore: true,
  threshold: 0.34,
  minMatchCharLength: 2,
}

export interface SearchIndex {
  /** IDs de lugares ordenados por relevancia; `null` si la consulta está vacía. */
  search(query: string): string[] | null
}

function toDocument(place: Place, catalog: Catalog): SearchDocument {
  const category = catalog.categoryById.get(place.category)
  const subcategory = category?.subcategories.find((s) => s.id === place.subcategory)
  return {
    id: place.id,
    name: place.name,
    plaza: catalog.plazaById.get(place.plazaId)?.name ?? '',
    category: category ? localized(category.label) : '',
    categorySynonyms: category?.synonyms ?? [],
    subcategory: subcategory ? localized(subcategory.label) : '',
    subcategorySynonyms: subcategory?.synonyms ?? [],
    tags: place.tags,
    description: place.description ?? '',
  }
}

export function createSearchIndex(catalog: Catalog): SearchIndex {
  const documents = catalog.places.map((place) => toDocument(place, catalog))
  const fuse = new Fuse(documents, OPTIONS)
  // Palabras normalizadas de cada lugar para reconocer coincidencias literales por inicio de palabra.
  const literalText = new Map(
    documents.map((doc) => [
      doc.id,
      wordText(
        [
          doc.name,
          doc.plaza,
          doc.category,
          doc.subcategory,
          ...doc.categorySynonyms,
          ...doc.subcategorySynonyms,
          ...doc.tags,
          doc.description,
        ].join(' | '),
      ),
    ]),
  )
  // Cada cambio de filtros consulta el índice varias veces con la misma búsqueda (resultados y conteos por
  // categoría): se reutiliza el último resultado.
  let last: { key: string; result: string[] | null } | null = null
  return {
    search(query) {
      const terms = searchTerms(query)
      const key = terms.join(' ')
      if (last?.key === key) return last.result
      const result = rank(terms)
      last = { key, result }
      return result
    },
  }

  function rank(terms: string[]): string[] | null {
    if (terms.length === 0) return null

    // Cada término aporta su puntuación; un lugar debe coincidir con todos.
    let scores: Map<string, number> | null = null
    for (const term of terms) {
      const results = fuse.search(term)
      // Prioridad: inicio de palabra ("bar" → "Golf Bar"), luego dentro de palabra ("ron" → "camarón"),
      // y solo si no hay ninguna literal, la coincidencia aproximada de Fuse.
      const prefix = wordText(term)
      const inside = prefix.trim()
      const atWordStart = results.filter((r) => literalText.get(r.item.id)?.includes(prefix))
      const withinWord = results.filter((r) => literalText.get(r.item.id)?.includes(inside))
      const chosen =
        atWordStart.length > 0 ? atWordStart : withinWord.length > 0 ? withinWord : results
      const current = new Map<string, number>()
      for (const result of chosen) {
        current.set(result.item.id, result.score ?? 1)
      }
      if (scores === null) {
        scores = current
      } else {
        const previous: Map<string, number> = scores
        scores = new Map(
          [...current]
            .filter(([id]) => previous.has(id))
            .map(([id, score]) => [id, score + (previous.get(id) ?? 0)]),
        )
      }
    }
    return [...(scores ?? new Map<string, number>())].sort((a, b) => a[1] - b[1]).map(([id]) => id)
  }
}
