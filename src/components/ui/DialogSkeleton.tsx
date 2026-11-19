/**
 * El marco de una ventana mientras llega su código y su texto (Acerca, Privacidad, Sugerir y el
 * tutorial). Es el hueco de `Suspense` en `Experience`: sin esto, desde que se toca el enlace hasta
 * que el fragmento llega no pasaba nada, y en una conexión lenta parecía que el toque no había hecho
 * nada.
 *
 * Tiene la misma geometría que la ventana real, no una aproximada: el mismo velo, el mismo ancho, la
 * misma esquina y el mismo alto. Así, cuando llega la de verdad, el cambio es el texto apareciendo
 * dentro de una hoja que ya estaba, y nada se mueve de sitio.
 *
 * Una por ventana, porque cada hoja mide lo suyo: Acerca y Sugerir no llegan a llenar la pantalla en
 * escritorio, Privacidad y términos llena la hoja hasta el borde, y el tutorial es una tarjeta de
 * altura fija (en el teléfono, pegada abajo como la hoja). Las medidas están tomadas de las ventanas
 * reales, en escritorio y en un teléfono de 390 px.
 *
 * No lleva texto propio salvo el nombre accesible, que es del catálogo base: los textos de las
 * ventanas están en un grupo que justo todavía no ha llegado.
 *
 * Entra con un retardo de 150 ms (`RETARDO_DEL_ESQUELETO`, el mismo que `animation-delay` en el CSS): si
 * el fragmento ya estaba en caché, la ventana real llega antes y no se ve ningún parpadeo. Y si sí se
 * llegó a ver, la ventana real entra sin animación para no repetir la entrada (ver `esqueleto.ts`).
 */
import { useEffect } from 'react'
import { t } from '../../i18n/index.ts'
import styles from './DialogSkeleton.module.css'
import { marcarEsqueleto, RETARDO_DEL_ESQUELETO } from './esqueleto.ts'

export type TipoDeEsqueleto = 'acerca' | 'privacidad' | 'sugerir' | 'tutorial'

/** Los anchos de las líneas de texto, en orden. La lista es fija: no hay datos detrás. */
const LINEAS = [
  'largo',
  'largo',
  'medio',
  'largo',
  'largo',
  'largo',
  'corto',
  'largo',
  'largo',
  'medio',
  'largo',
  'largo',
  'largo',
  'corto',
  'largo',
  'largo',
  'medio',
  'largo',
  'largo',
  'medio',
  'largo',
  'largo',
  'largo',
  'corto',
  'largo',
  'largo',
] as const

export function DialogSkeleton({ tipo }: { tipo: TipoDeEsqueleto }) {
  // Cuando el esqueleto ya se ve, la ventana real no vuelve a entrar con su animación (ver esqueleto.ts).
  useEffect(() => {
    const id = window.setTimeout(marcarEsqueleto, RETARDO_DEL_ESQUELETO)
    return () => window.clearTimeout(id)
  }, [])

  return (
    <div className={styles.velo} data-tipo={tipo} role="status" aria-label={t('dialog.loading')}>
      {tipo === 'tutorial' ? (
        <div className={styles.tarjeta}>
          <span className={styles.barra}>
            <span className={`${styles.bloque} ${styles.paso}`} />
            <span className={`${styles.bloque} ${styles.cerrar}`} />
          </span>
          <span className={`${styles.bloque} ${styles.escena}`} />
          <span className={styles.copia}>
            <span className={`${styles.bloque} ${styles.titulo}`} />
            <span className={styles.linea} data-ancho="largo" />
            <span className={styles.linea} data-ancho="largo" />
            <span className={styles.linea} data-ancho="medio" />
          </span>
          <span className={styles.puntos}>
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} className={styles.punto} />
            ))}
          </span>
          <span className={styles.acciones}>
            <span className={`${styles.bloque} ${styles.saltar}`} />
            <span className={`${styles.bloque} ${styles.seguir}`} />
          </span>
        </div>
      ) : (
        <div className={styles.hoja} data-tipo={tipo}>
          <span className={styles.cabecera}>
            <span className={`${styles.bloque} ${styles.titulo}`} />
            <span className={`${styles.bloque} ${styles.cerrar}`} />
          </span>
          <span className={styles.texto}>
            {LINEAS.map((ancho, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: lista fija de bloques, sin datos
              <span key={i} className={styles.linea} data-ancho={ancho} />
            ))}
          </span>
        </div>
      )}
    </div>
  )
}
