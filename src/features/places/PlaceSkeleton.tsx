/**
 * La ficha mientras llega su trozo.
 *
 * Antes el hueco era un párrafo "Cargando lugares." y después el contenido aparecía de golpe: en una
 * conexión lenta se veía una hoja vacía durante casi dos segundos. Este esqueleto tiene la forma de la
 * ficha real, bloque a bloque y en el mismo orden, para que el cambio no mueva nada de sitio.
 *
 * Ocupa todo el alto disponible: el último bloque crece, así que en el panel de escritorio llena la
 * columna y en la hoja del móvil se queda en su mínimo sin empujar nada fuera.
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
          <span className={`${styles.bloque} ${styles.titulo}`} />
          <span className={styles.chips}>
            <span className={styles.chip} />
            <span className={styles.chip} data-ancho="corto" />
          </span>
        </span>
      </div>

      <span className={styles.direccion}>
        <span className={styles.pin} />
        <span className={`${styles.bloque} ${styles.linea}`} />
      </span>

      <span className={styles.acciones}>
        <span className={`${styles.bloque} ${styles.boton}`} />
        <span className={`${styles.bloque} ${styles.icono}`} />
      </span>

      <span className={styles.estrellas}>
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className={styles.estrella} />
        ))}
        <span className={`${styles.bloque} ${styles.linea}`} data-ancho="corto" />
      </span>

      <span className={`${styles.bloque} ${styles.linea}`} data-ancho="largo" />
      <span className={`${styles.bloque} ${styles.linea}`} data-ancho="medio" />

      {/*
       * El cuerpo: lo que en la ficha es la descripción y la tabla de horario. El último hueco no
       * pinta nada y se queda con el alto que sobra, así no hay un bloque gigante en escritorio ni
       * nada se sale en la hoja del móvil.
       */}
      <span className={styles.cuerpo}>
        <span className={`${styles.bloque} ${styles.linea}`} data-ancho="largo" />
        <span className={`${styles.bloque} ${styles.linea}`} data-ancho="largo" />
        <span className={`${styles.bloque} ${styles.linea}`} data-ancho="medio" />
        <span className={`${styles.bloque} ${styles.tarjeta}`} />
        <span className={styles.hueco} />
      </span>
    </div>
  )
}
