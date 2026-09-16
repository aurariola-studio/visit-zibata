import { CategoryIcon } from '../../components/icons/CategoryIcon.tsx'
import { useCatalog } from '../../data/CatalogContext.tsx'
import { localized, t } from '../../i18n/index.ts'
import type { Place } from '../../types/domain.ts'
import { FavoriteButton } from '../favorites/FavoriteButton.tsx'
import { OpenStatus } from './OpenStatus.tsx'
import styles from './PlaceCard.module.css'
import { PlacePicture } from './PlacePicture.tsx'

interface PlaceCardProps {
  place: Place
  onOpen: (place: Place) => void
  /** Muestra la plaza (útil en resultados de búsqueda que mezclan plazas). */
  showPlaza?: boolean
}

export function PlaceCard({ place, onOpen, showPlaza = false }: PlaceCardProps) {
  const catalog = useCatalog()
  const category = catalog.categoryById.get(place.category)
  const subcategory = category?.subcategories.find((s) => s.id === place.subcategory)
  const plaza = catalog.plazaById.get(place.plazaId)
  const categoryLabel = subcategory
    ? localized(subcategory.label)
    : category
      ? localized(category.label)
      : ''

  const meta = [
    showPlaza ? plaza?.name : null,
    place.localNumber ? t('place.localNumber', { number: place.localNumber }) : null,
  ].filter(Boolean)

  return (
    <article className={styles.card}>
      <button
        type="button"
        className={styles.main}
        onClick={() => onOpen(place)}
        aria-label={t('place.openDetail', { name: place.name })}
      >
        <span className={styles.thumb}>
          <PlacePicture
            photo={place.photos[0]}
            categoryId={place.category}
            categoryIcon={category?.icon ?? 'utensils-crossed'}
            categoryLabel={categoryLabel}
            sizes="64px"
            ratio="1 / 1"
            illustrationSize="sm"
          />
        </span>
        <span className={styles.body}>
          <span className={styles.name}>{place.name}</span>
          <span className={styles.category}>
            <CategoryIcon name={category?.icon ?? 'utensils-crossed'} size={14} strokeWidth={2} />
            {categoryLabel}
            {meta.length > 0 && <span className={styles.meta}> · {meta.join(' · ')}</span>}
          </span>
          <OpenStatus hours={place.hours} />
        </span>
      </button>
      <FavoriteButton placeId={place.id} placeName={place.name} size="sm" />
    </article>
  )
}
