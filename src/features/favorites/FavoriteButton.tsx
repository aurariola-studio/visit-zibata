import { Heart } from 'lucide-react'
import { t } from '../../i18n/index.ts'
import styles from './FavoriteButton.module.css'
import { useFavorites } from './useFavorites.ts'

export function FavoriteButton({
  placeId,
  placeName,
  size = 'md',
  demoActive,
}: {
  placeId: string
  placeName: string
  size?: 'sm' | 'md'
  /** En la demostración del tutorial, el corazón se enciende sin tocar los favoritos reales. */
  demoActive?: boolean
}) {
  const favorites = useFavorites()
  const active = demoActive ?? favorites.has(placeId)
  const label = `${active ? t('favorites.remove') : t('favorites.add')}: ${placeName}`
  return (
    <button
      type="button"
      className={styles.button}
      data-size={size}
      aria-pressed={active}
      aria-label={label}
      title={active ? t('favorites.remove') : t('favorites.add')}
      onClick={() => {
        if (demoActive === undefined) favorites.toggle(placeId)
      }}
    >
      <Heart aria-hidden="true" fill={active ? 'currentColor' : 'none'} />
    </button>
  )
}
