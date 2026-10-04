/**
 * Corazones de la comunidad. Se muestra cuánta gente ha guardado el lugar, nunca la media de
 * estrellas: un promedio público es un arma de doble filo para un negocio pequeño y no ayuda a
 * decidir. La media sí alimenta el orden personal (features/ranking), donde no señala a nadie.
 *
 * No se dibuja nada mientras no haya una fuente de datos registrada (ver socialStats.ts): la guía
 * estática de hoy no la tiene.
 */
import { Heart } from 'lucide-react'
import { t } from '../../i18n/index.ts'
import styles from './SocialStats.module.css'
import { usePlaceSocialStats } from './socialStats.ts'

export function SocialStats({ placeId }: { placeId: string }) {
  const stats = usePlaceSocialStats(placeId)
  if (!stats) return null
  const { favorites } = stats
  if (favorites === 0) return null

  return (
    <p className={styles.stats}>
      <span className={styles.item}>
        <Heart aria-hidden="true" fill="currentColor" />
        <span className={styles.value}>{t('place.savedCount', { count: favorites })}</span>
      </span>
    </p>
  )
}
