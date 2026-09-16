import { Heart } from 'lucide-react'
import { t } from '../../i18n/index.ts'
import styles from './FavoriteButton.module.css'
import { useFavorites } from './useFavorites.ts'

export function FavoriteButton({
  placeId,
  placeName,
  size = 'md',
}: {
  placeId: string
  placeName: string
  size?: 'sm' | 'md'
}) {
  const favorites = useFavorites()
  const active = favorites.has(placeId)
  const label = `${active ? t('favorites.remove') : t('favorites.add')}: ${placeName}`
  return (
    <button
      type="button"
      className={styles.button}
      data-size={size}
      aria-pressed={active}
      aria-label={label}
      title={active ? t('favorites.remove') : t('favorites.add')}
      onClick={() => favorites.toggle(placeId)}
    >
      <Heart aria-hidden="true" fill={active ? 'currentColor' : 'none'} />
    </button>
  )
}
