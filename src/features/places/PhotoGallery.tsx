/**
 * Galería: imagen principal + miniaturas desplazables (scroll-snap). Admite cualquier número de
 * fotos; todas cargan de forma diferida. Al tocar la imagen principal se abre a pantalla completa.
 */
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { t } from '../../i18n/index.ts'
import type { Photo } from '../../types/domain.ts'
import styles from './PhotoGallery.module.css'
import { PlacePicture } from './PlacePicture.tsx'

interface PhotoGalleryProps {
  photos: readonly Photo[]
  categoryId: string
  categoryIcon: string
  categoryLabel: string
}

export function PhotoGallery({
  photos,
  categoryId,
  categoryIcon,
  categoryLabel,
}: PhotoGalleryProps) {
  const [index, setIndex] = useState(0)
  const [open, setOpen] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const current = photos[index]
  const common = { categoryId, categoryIcon, categoryLabel }

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  if (photos.length === 0) {
    return (
      <figure className={styles.hero}>
        <PlacePicture photo={undefined} {...common} sizes="440px" ratio="16 / 10" />
        <figcaption className={styles.note}>{t('place.illustrationNote')}</figcaption>
      </figure>
    )
  }

  const go = (delta: number) => setIndex((i) => (i + delta + photos.length) % photos.length)

  return (
    <section className={styles.gallery} aria-label={t('place.gallery')}>
      <button
        type="button"
        className={styles.heroButton}
        onClick={() => setOpen(true)}
        aria-label={t('place.zoomPhoto', { alt: current?.alt ?? '' })}
      >
        <PlacePicture
          photo={current}
          {...common}
          sizes="(min-width: 900px) 440px, 100vw"
          ratio="16 / 10"
          eager
        />
      </button>
      {photos.length > 1 && (
        <ul className={styles.thumbs}>
          {photos.map((photo, i) => (
            <li key={photo.src}>
              <button
                type="button"
                className={styles.thumb}
                aria-current={i === index}
                aria-label={t('place.photo', { index: i + 1, total: photos.length })}
                onClick={() => setIndex(i)}
              >
                <PlacePicture
                  photo={photo}
                  {...common}
                  sizes="96px"
                  ratio="1 / 1"
                  illustrationSize="sm"
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      <dialog
        ref={dialogRef}
        className={styles.lightbox}
        onClose={() => setOpen(false)}
        aria-label={t('place.gallery')}
      >
        {open && current && (
          <div className={styles.lightboxInner}>
            <PlacePicture photo={current} {...common} sizes="100vw" ratio="auto" eager />
            <p className={styles.caption}>
              {current.alt}
              {photos.length > 1 &&
                ` · ${t('place.photo', { index: index + 1, total: photos.length })}`}
            </p>
            <button
              type="button"
              className={styles.close}
              onClick={() => setOpen(false)}
              aria-label={t('onboarding.close')}
            >
              <X aria-hidden="true" />
            </button>
            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  className={styles.prev}
                  onClick={() => go(-1)}
                  aria-label={t('onboarding.back')}
                >
                  <ChevronLeft aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={styles.next}
                  onClick={() => go(1)}
                  aria-label={t('onboarding.next')}
                >
                  <ChevronRight aria-hidden="true" />
                </button>
              </>
            )}
          </div>
        )}
      </dialog>
    </section>
  )
}
