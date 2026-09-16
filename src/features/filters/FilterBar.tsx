/** FilterBar: categoría + plaza (combinables), favoritos, nº de resultados y limpiar filtros. */
import { ChevronDown, Heart, MapPin } from 'lucide-react'
import { useId } from 'react'
import { t } from '../../i18n/index.ts'
import type { Category, Plaza } from '../../types/domain.ts'
import { CategoryChips } from '../plazas/CategoryChips.tsx'
import styles from './FilterBar.module.css'

interface FilterBarProps {
  categories: readonly Category[]
  categoryCounts: ReadonlyMap<string, number>
  totalCount: number
  activeCategoryId: string | null
  onCategoryChange: (categoryId: string | null) => void
  plazas: readonly Plaza[]
  selectedPlazaId: string | null
  onPlazaChange: (plazaId: string | null) => void
  favoritesCount: number
  favoritesOnly: boolean
  onToggleFavorites: () => void
  filtersActive: boolean
  resultCount: number
  onClear: () => void
}

export function FilterBar({
  categories,
  categoryCounts,
  totalCount,
  activeCategoryId,
  onCategoryChange,
  plazas,
  selectedPlazaId,
  onPlazaChange,
  favoritesCount,
  favoritesOnly,
  onToggleFavorites,
  filtersActive,
  resultCount,
  onClear,
}: FilterBarProps) {
  const selectId = useId()
  const hasSelection = filtersActive || selectedPlazaId !== null

  return (
    <div className={styles.bar}>
      <CategoryChips
        categories={categories}
        counts={categoryCounts}
        totalCount={totalCount}
        activeId={activeCategoryId}
        onChange={onCategoryChange}
        label={t('filters.categories')}
        variant="floating"
      />
      <div className={styles.row}>
        <div className={styles.select} data-active={selectedPlazaId !== null}>
          <MapPin aria-hidden="true" />
          <label htmlFor={selectId} className="visually-hidden">
            {t('filters.plaza')}
          </label>
          <select
            id={selectId}
            value={selectedPlazaId ?? ''}
            onChange={(event) => onPlazaChange(event.target.value || null)}
          >
            <option value="">{t('filters.allPlazas')}</option>
            {plazas.map((plaza) => (
              <option key={plaza.id} value={plaza.id}>
                {plaza.name}
              </option>
            ))}
          </select>
          <ChevronDown aria-hidden="true" className={styles.chevron} />
        </div>

        {(favoritesCount > 0 || favoritesOnly) && (
          <button
            type="button"
            className={styles.toggle}
            aria-pressed={favoritesOnly}
            onClick={onToggleFavorites}
          >
            <Heart aria-hidden="true" fill={favoritesOnly ? 'currentColor' : 'none'} />
            {t('favorites.filter')}
            <span className={styles.badge}>{favoritesCount}</span>
          </button>
        )}

        {hasSelection && (
          <p className={styles.summary}>
            {filtersActive && (
              <span className={styles.results}>{t('filters.results', { count: resultCount })}</span>
            )}
            <button type="button" className={styles.clear} onClick={onClear}>
              {t('filters.clear')}
            </button>
          </p>
        )}
      </div>
    </div>
  )
}
