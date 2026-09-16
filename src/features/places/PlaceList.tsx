import type { Place } from '../../types/domain.ts'
import { PlaceCard } from './PlaceCard.tsx'
import styles from './PlaceList.module.css'

interface PlaceListProps {
  places: readonly Place[]
  onOpen: (place: Place) => void
  showPlaza?: boolean
  label?: string
}

export function PlaceList({ places, onOpen, showPlaza, label }: PlaceListProps) {
  return (
    <ul className={styles.list} aria-label={label}>
      {places.map((place, index) => (
        <li
          key={place.id}
          className={styles.item}
          style={{ animationDelay: `${Math.min(index, 12) * 22}ms` }}
        >
          <PlaceCard place={place} onOpen={onOpen} showPlaza={showPlaza} />
        </li>
      ))}
    </ul>
  )
}
