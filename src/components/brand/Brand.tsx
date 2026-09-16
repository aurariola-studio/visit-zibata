import { t } from '../../i18n/index.ts'
import styles from './Brand.module.css'

/** Marca: volumen isométrico (plaza) sobre base arena, en verdes de la identidad. */
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="9" fill="#536c2a" />
      <path d="M16 6.5 26 12v8.4L16 26 6 20.4V12z" fill="#8cba37" />
      <path d="M16 6.5 26 12l-10 5.6L6 12z" fill="#b8d77c" />
      <path d="M16 17.6V26l10-5.6V12z" fill="#6a8736" />
      <path
        d="M11.2 14.3 16 17l4.8-2.7"
        fill="none"
        stroke="#f3f8ea"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={styles.brand} data-compact={compact}>
      <LogoMark size={compact ? 30 : 36} />
      {/* Sin separador, NVDA lee "ZibatáCOMER Y BEBER": la coma existe solo para el lector. */}
      {!compact && (
        <p className={styles.text}>
          <span className={styles.name}>{t('app.name')}</span>
          <span className="visually-hidden">, </span>
          <span className={styles.tagline}>{t('app.tagline')}</span>
        </p>
      )}
    </div>
  )
}
