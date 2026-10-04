/**
 * Calificación de un lugar en estrellas, de media en media, guardada en este dispositivo.
 *
 * La mitad izquierda de cada estrella pone el medio punto y la derecha el entero, como en cualquier
 * sitio que admite medias: al pasar por encima, la escala se llena hasta donde caería la nota y el
 * texto dice cuál es, así que se ve antes de soltar el clic. Con teclado pasa lo mismo al enfocar cada
 * valor, porque sigue siendo un grupo de radios nativo. Volver a pulsar la nota puesta la quita.
 */
import { Star } from 'lucide-react'
import { useId, useState } from 'react'
import { formatNumber, t } from '../../i18n/index.ts'
import styles from './RatingStars.module.css'
import { type RatingValue, useRatings } from './useRatings.ts'

const STARS = [1, 2, 3, 4, 5] as const

/** Cuánto se llena la estrella en esa posición con una nota dada: nada, la mitad o entera. */
function fillOf(value: number | null, position: number): 0 | 0.5 | 1 {
  if (value === null) return 0
  const filled = Math.min(1, Math.max(0, value - (position - 1)))
  return filled >= 1 ? 1 : filled >= 0.5 ? 0.5 : 0
}

export function RatingStars({ placeId, placeName }: { placeId: string; placeName: string }) {
  const { ratingOf, rate } = useRatings()
  const current = ratingOf(placeId)
  const [preview, setPreview] = useState<number | null>(null)
  const groupId = useId()
  const shown = preview ?? current

  const half = (position: number, side: 'left' | 'right') => {
    const value = (side === 'left' ? position - 0.5 : position) as RatingValue
    return (
      <label className={styles.half} data-side={side} key={side}>
        <input
          type="radio"
          name={groupId}
          value={value}
          checked={current === value}
          aria-label={t('rating.set', {
            count: value,
            value: formatNumber(value),
            name: placeName,
          })}
          onChange={() => {
            rate(placeId, value)
            // Elegida la nota, el texto pasa a confirmarla; la vista previa vuelve al siguiente hover.
            setPreview(null)
          }}
          onClick={() => {
            // Volver a pulsar la actual la quita (el change no se dispara si ya está marcada).
            if (current === value) rate(placeId, value)
            setPreview(null)
          }}
          onFocus={() => setPreview(value)}
          onBlur={() => setPreview(null)}
        />
      </label>
    )
  }

  return (
    <div className={styles.rating}>
      <fieldset
        className={styles.scale}
        onPointerLeave={() => setPreview(null)}
        onPointerMove={(event) => {
          const target = (event.target as HTMLElement).closest<HTMLElement>('[data-value]')
          setPreview(target ? Number(target.dataset.value) : null)
        }}
      >
        <legend className={styles.legend}>{t('rating.legend')}</legend>
        {STARS.map((position) => (
          <span key={position} className={styles.star} data-fill={fillOf(shown, position)}>
            <Star className={styles.empty} />
            <Star className={styles.filled} />
            <span className={styles.hit} data-side="left" data-value={position - 0.5}>
              {half(position, 'left')}
            </span>
            <span className={styles.hit} data-side="right" data-value={position}>
              {half(position, 'right')}
            </span>
          </span>
        ))}
      </fieldset>
      <p className={styles.note}>
        {preview !== null
          ? t('rating.preview', { value: formatNumber(preview), count: preview })
          : current === null
            ? t('rating.hint')
            : t('rating.yours', { value: formatNumber(current), count: current })}
      </p>
    </div>
  )
}
