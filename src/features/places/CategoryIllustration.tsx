/**
 * Ilustración propia de la categoría, usada cuando un lugar aún no tiene fotografías.
 * Es explícitamente una ilustración (no simula una foto del negocio).
 */
import type { CSSProperties } from 'react'
import { CategoryIcon } from '../../components/icons/CategoryIcon.tsx'
import styles from './CategoryIllustration.module.css'

const TONES = [
  ['#e7f1d4', '#b8d77c', '#536c2a'],
  ['#f1ebe0', '#d1c3b0', '#6b5d48'],
  ['#e9efdc', '#9fc45a', '#435a22'],
  ['#f3ece2', '#c9b79c', '#5c4f3c'],
] as const

function toneFor(key: string) {
  let hash = 0
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return TONES[hash % TONES.length] ?? TONES[0]
}

export function CategoryIllustration({
  categoryId,
  icon,
  label,
  size = 'md',
}: {
  categoryId: string
  icon: string
  /** Sin etiqueta la ilustración es decorativa (oculta a lectores de pantalla). */
  label?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const [background, accent, ink] = toneFor(categoryId)
  const common = {
    className: styles.illustration,
    'data-size': size,
    style: { '--illo-bg': background, '--illo-accent': accent, '--illo-ink': ink } as CSSProperties,
  }
  const content = (
    <>
      <svg
        className={styles.contours}
        viewBox="0 0 200 120"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <path d="M-10 92c38-18 62-6 96-22s58-40 124-24" />
        <path d="M-10 108c42-16 70-2 104-18s62-36 116-20" />
        <path d="M-10 76c34-20 58-12 90-26s52-44 130-30" />
        <circle cx="152" cy="34" r="16" />
        <circle cx="152" cy="34" r="28" />
      </svg>
      <span className={styles.badge}>
        <CategoryIcon name={icon} strokeWidth={1.6} />
      </span>
    </>
  )

  if (!label) {
    return (
      <div {...common} aria-hidden="true">
        {content}
      </div>
    )
  }
  return (
    <div {...common} role="img" aria-label={label}>
      {content}
    </div>
  )
}
