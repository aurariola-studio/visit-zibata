import styles from './Signature.module.css'

/**
 * Firma de autoría. Va en la franja inferior y en "Acerca de esta guía".
 *
 * El texto no pasa por i18n a propósito: es parte de la marca, como el dibujo del símbolo, y una
 * firma no se traduce. Del sello de aurariola solo se toma la tipografía monoespaciada y el punto
 * en oro; el anillo de píxeles se queda fuera para no competir con la marca de la guía.
 */
export function Signature({ className }: { className?: string }) {
  return (
    <a
      className={className ? `${styles.signature} ${className}` : styles.signature}
      href="https://aurariola.com"
      target="_blank"
      rel="noopener noreferrer"
    >
      by aurariola<span className={styles.dot}>.</span>com
    </a>
  )
}
