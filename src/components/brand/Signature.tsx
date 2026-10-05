import { t } from '../../i18n/index.ts'
import { AurariolaMark } from './AurariolaMark.tsx'
import styles from './Signature.module.css'

/**
 * Firma de autoría, tal como la define la guía de marca de aurariola.com: la marca, "un proyecto de"
 * y el wordmark. No es un "by aurariola.com" inventado; es su lockup de acreditación.
 *
 * El wordmark no pasa por i18n: es parte de la marca y una marca no se traduce. "Un proyecto de" sí,
 * porque eso es texto de interfaz.
 *
 * El punto va en oro, que es lo que liga el wordmark con el píxel-cursor del símbolo. Pero ahí usa
 * `--gold-700` y no el #B7791F de la guía: a 11 px es texto, y el oro de marca se queda en 3,3:1
 * sobre las superficies arena cuando hace falta 4,5:1. En el símbolo, que es dibujo, sí va el oro
 * real.
 *
 * `compacta` deja fuera el conector. Se usa en la franja del mapa, donde el lockup entero empujaba
 * la leyenda de independencia a dos renglones; el símbolo y el wordmark siguen diciendo quién firma.
 * En "Acerca de esta guía" va completo, que es donde hay sitio.
 */
export function Signature({
  className,
  compacta = false,
}: {
  className?: string
  compacta?: boolean
}) {
  return (
    <a
      className={className ? `${styles.signature} ${className}` : styles.signature}
      href="https://aurariola.com"
      target="_blank"
      rel="noopener noreferrer"
    >
      <AurariolaMark />
      {!compacta && <span className={styles.by}>{t('brand.by')}</span>}
      <span className={styles.wordmark}>
        aurariola<span className={styles.dot}>.</span>
        <span className={styles.tld}>com</span>
      </span>
    </a>
  )
}
