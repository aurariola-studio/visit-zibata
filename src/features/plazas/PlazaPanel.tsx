/** PlazaPanel: nombre, descripción, nº de lugares, categorías y lista de establecimientos. */
import { ArrowUpRight, MapPin, SearchX, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { EmptyState } from '../../components/ui/EmptyState.tsx'
import { useCatalog } from '../../data/CatalogContext.tsx'
import { t } from '../../i18n/index.ts'
import { plazaDirectionsUrl } from '../../lib/maps-url.ts'
import type { Place, Plaza } from '../../types/domain.ts'
import { PlaceList } from '../places/PlaceList.tsx'
import { CategoryChips } from './CategoryChips.tsx'
import styles from './Panel.module.css'

interface PlazaPanelProps {
  plaza: Plaza
  /** Lugares de la plaza que cumplen los filtros actuales. */
  places: readonly Place[]
  /** Lugares de la plaza por categoría con búsqueda y favoritos aplicados (los mismos que la barra superior). */
  categoryCounts: ReadonlyMap<string, number>
  filtersActive: boolean
  activeCategoryId: string | null
  onCategoryChange: (categoryId: string | null) => void
  onClearFilters: () => void
  onOpenPlace: (place: Place) => void
  onClose: () => void
}

export function PlazaPanel({
  plaza,
  places,
  categoryCounts,
  filtersActive,
  activeCategoryId,
  onCategoryChange,
  onClearFilters,
  onOpenPlace,
  onClose,
}: PlazaPanelProps) {
  const catalog = useCatalog()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const allPlaces = catalog.placesByPlaza.get(plaza.id) ?? []
  const categories = plaza.categories
    .map((id) => catalog.categoryById.get(id))
    .filter((category) => category !== undefined)

  // biome-ignore lint/correctness/useExhaustiveDependencies: el foco se mueve al título cada vez que cambia la plaza mostrada.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
  }, [plaza.id])

  return (
    <section className={styles.panel} aria-labelledby="plaza-panel-title">
      <header className={styles.header}>
        <div className={styles.topline}>
          <p className={styles.eyebrow}>
            <span className={styles.eyebrowDot} aria-hidden="true" />
            {t('plaza.label')} · {t('places.count', { count: allPlaces.length })}
          </p>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label={t('panel.close')}
          >
            <X aria-hidden="true" />
          </button>
        </div>
        <h2 id="plaza-panel-title" ref={headingRef} tabIndex={-1} className={styles.title}>
          {plaza.name}
        </h2>
        {plaza.description && <p className={styles.lead}>{plaza.description}</p>}
        <p className={styles.address}>
          {plaza.address && (
            <span className={styles.addressText}>
              <MapPin aria-hidden="true" />
              {plaza.address}
            </span>
          )}
          <a
            className={styles.inlineLink}
            href={plazaDirectionsUrl(plaza)}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('plaza.directions')}
            <ArrowUpRight aria-hidden="true" />
          </a>
        </p>
      </header>

      {categories.length > 1 && (
        <CategoryChips
          categories={categories}
          counts={categoryCounts}
          totalCount={[...categoryCounts.values()].reduce((sum, count) => sum + count, 0)}
          activeId={activeCategoryId}
          onChange={onCategoryChange}
          label={t('filters.categories')}
        />
      )}

      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>{t('plaza.places')}</h3>
        <span className={styles.count}>
          {filtersActive
            ? t('filters.results', { count: places.length })
            : t('places.count', { count: places.length })}
        </span>
      </div>

      {allPlaces.length === 0 ? (
        <p className={styles.note}>{t('plaza.empty')}</p>
      ) : places.length === 0 ? (
        <EmptyState
          icon={<SearchX />}
          title={t('results.empty.title')}
          action={
            <button type="button" className={styles.textButton} onClick={onClearFilters}>
              {t('plaza.showAll')}
            </button>
          }
        >
          {t('plaza.filteredEmpty')}
        </EmptyState>
      ) : (
        <>
          <PlaceList places={places} onOpen={onOpenPlace} label={t('plaza.places')} />
          {filtersActive && (
            <button type="button" className={styles.textButton} onClick={onClearFilters}>
              {t('plaza.showAll')}
            </button>
          )}
        </>
      )}
    </section>
  )
}
