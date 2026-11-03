/**
 * Corazones de la comunidad. Se muestra cuánta gente ha guardado el lugar, nunca la media de
 * estrellas: un promedio público es un arma de doble filo para un negocio pequeño y no ayuda a
 * decidir. Las notas sí alimentan el orden personal, pero llegan como un empuje ya calculado y la
 * media no sale del servidor, así que aquí no hay nada que tapar.
 *
 * El corazón del dibujo dice lo tuyo y el texto dice lo de los demás: un solo objeto leído a dos
 * escalas, en vez de dos cosas separadas que haya que relacionar. Relleno si lo guardaste, de
 * contorno si no. No dice "tú y 4 más" porque no sería cierto de forma fiable: tu corazón entra en
 * el conteo cuando tu cuenta pasa la edad mínima, y la respuesta se cachea cinco minutos.
 *
 * No se dibuja nada mientras no haya una fuente de datos registrada (ver socialStats.ts).
 */
import { Heart } from 'lucide-react'
import { t } from '../../i18n/index.ts'
import styles from './SocialStats.module.css'
import { usePlaceSocialStats } from './socialStats.ts'
import { useFavorites } from './useFavorites.ts'

export function SocialStats({
  placeId,
  demoFavorites,
  demoYours,
}: {
  placeId: string
  /** En la demostración, el número de personas que lo guardaron. */
  demoFavorites?: number | null
  /** En la demostración, si el corazón de la persona ya está puesto. */
  demoYours?: boolean
}) {
  const stats = usePlaceSocialStats(placeId)
  const { has } = useFavorites()
  const favorites = demoFavorites !== undefined ? demoFavorites : stats?.favorites
  if (!favorites) return null
  const tuyo = demoYours ?? has(placeId)

  return (
    <p className={styles.stats}>
      <span className={styles.item}>
        <Heart aria-hidden="true" fill={tuyo ? 'currentColor' : 'none'} />
        <span className={styles.value}>{t('place.savedCount', { count: favorites })}</span>
      </span>
    </p>
  )
}
