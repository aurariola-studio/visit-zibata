/**
 * La ficha mientras llega su trozo.
 *
 * Antes el hueco era un párrafo "Cargando lugares." y después el contenido aparecía de golpe: en una
 * conexión lenta se veía una hoja vacía durante casi dos segundos. Este esqueleto tiene la forma de la
 * ficha (avatar, título, dirección, botón y líneas) para que el cambio no mueva nada de sitio.
 *
 * No lleva animación por defecto: un latido a pantalla completa justo mientras carga es más ruido que
 * señal. El brillo suave solo entra si el sistema no pide movimiento reducido.
 */
import { t } from '../../i18n/index.ts'
import styles from './PlaceSkeleton.module.css'

export function PlaceSkeleton() {
  return (
    <div className={styles.skeleton} role="status" aria-label={t('data.loading')}>
      <div className={styles.head}>
        <span className={styles.avatar} />
        <span className={styles.titles}>
          <span className={styles.line} data-width="70" />
          <span className={styles.line} data-width="38" />
        </span>
      </div>
      <span className={styles.line} data-width="52" />
      <span className={styles.thin} />
      <span className={styles.actions} />
      <span className={styles.line} data-width="92" />
      <span className={styles.line} data-width="78" />
    </div>
  )
}
