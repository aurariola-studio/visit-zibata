/** Pastillas de categoría con conteo, reutilizadas en la barra de filtros y dentro de cada plaza. */
import { CategoryIcon } from '../../components/icons/CategoryIcon.tsx'
import { localized, t } from '../../i18n/index.ts'
import type { Category } from '../../types/domain.ts'
import styles from './CategoryChips.module.css'

interface CategoryChipsProps {
  categories: readonly Category[]
  counts?: ReadonlyMap<string, number>
  totalCount?: number
  activeId: string | null
  onChange: (categoryId: string | null) => void
  label: string
  variant?: 'floating' | 'inline'
}

export function CategoryChips({
  categories,
  counts,
  totalCount,
  activeId,
  onChange,
  label,
  variant = 'inline',
}: CategoryChipsProps) {
  return (
    <div className={styles.scroller} data-variant={variant}>
      <ul className={styles.chips} aria-label={label}>
        <li>
          {/* El conteo va en su propio elemento: sin etiqueta accesible, NVDA lee «Todo19». */}
          <button
            type="button"
            className={styles.chip}
            aria-pressed={activeId === null}
            aria-label={
              totalCount === undefined
                ? undefined
                : `${t('filters.allCategories')}, ${t('places.count', { count: totalCount })}`
            }
            onClick={() => onChange(null)}
          >
            {t('filters.allCategories')}
            {totalCount !== undefined && <span className={styles.count}>{totalCount}</span>}
          </button>
        </li>
        {categories.map((category) => {
          const count = counts?.get(category.id)
          const active = activeId === category.id
          return (
            <li key={category.id}>
              <button
                type="button"
                className={styles.chip}
                aria-pressed={active}
                aria-label={
                  count === undefined
                    ? undefined
                    : `${localized(category.label)}, ${t('places.count', { count })}`
                }
                onClick={() => onChange(active ? null : category.id)}
              >
                <CategoryIcon name={category.icon} size={15} strokeWidth={2} />
                {localized(category.label)}
                {count !== undefined && <span className={styles.count}>{count}</span>}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
