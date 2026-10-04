/**
 * Ilustración propia de la categoría, usada cuando un lugar aún no tiene fotografías.
 * Es explícitamente una ilustración (no simula una foto del negocio).
 */
import type { CSSProperties } from 'react'
import { CategoryIcon } from '../../components/icons/CategoryIcon.tsx'
import { categoryTone } from '../../config/palette.ts'
import type { Category } from '../../types/domain.ts'
import styles from './CategoryIllustration.module.css'

export function CategoryIllustration({
  category,
  icons,
  label,
  size = 'md',
}: {
  /** La categoría entera: de ella salen el tono y el icono de respaldo, ambos desde los datos. */
  category: Category | undefined
  /** Los dibujos de los giros principales del local; por defecto, el de la categoría. */
  icons?: readonly string[]
  /** Sin etiqueta la ilustración es decorativa (oculta a lectores de pantalla). */
  label?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  // El color dice de qué se come, no de qué plaza es: mismo tono para la misma categoría en toda la guía.
  const { soft, ink } = categoryTone(category)
  // Solo los principales entran aquí, los tres si son tres: caben porque comparten una sola placa
  // en vez de llevar una cada uno. Los secundarios enseñan su dibujo en la ficha.
  const dibujos = (icons?.length ? icons : [category?.icon ?? 'utensils-crossed']).slice(0, 3)
  const common = {
    className: styles.illustration,
    'data-size': size,
    style: { '--illo-bg': soft, '--illo-accent': ink, '--illo-ink': ink } as CSSProperties,
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
      <span className={styles.badges} data-count={dibujos.length}>
        <span className={styles.badge}>
          {dibujos.map((name) => (
            <CategoryIcon key={name} name={name} strokeWidth={1.6} />
          ))}
        </span>
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
