/**
 * Fotografía optimizada: <picture> con AVIF/WebP y srcset cuando existen variantes
 * (`npm run images:optimize`), lazy loading, aspect-ratio fijo, color de relleno y respaldo
 * a la ilustración de categoría si la imagen falla.
 */
import { useState } from 'react'
import { t } from '../../i18n/index.ts'
import { assetUrl } from '../../lib/assets.ts'
import { variantPath } from '../../lib/image-variants.ts'
import type { Photo } from '../../types/domain.ts'
import { CategoryIllustration } from './CategoryIllustration.tsx'
import styles from './PlacePicture.module.css'

interface PlacePictureProps {
  photo: Photo | undefined
  categoryId: string
  categoryIcon: string
  categoryLabel: string
  /** Tamaño aproximado en pantalla para elegir la variante (atributo sizes). */
  sizes: string
  ratio?: string
  eager?: boolean
  illustrationSize?: 'sm' | 'md' | 'lg'
}

export function PlacePicture({
  photo,
  categoryId,
  categoryIcon,
  categoryLabel,
  sizes,
  ratio = '4 / 3',
  eager = false,
  illustrationSize = 'md',
}: PlacePictureProps) {
  // Se recuerda qué foto falló (no un simple sí/no): la galería reutiliza este componente al cambiar de
  // foto y una imagen rota no debe ocultar las siguientes.
  const [failedSrc, setFailedSrc] = useState<string | null>(null)

  if (!photo || failedSrc === photo.src) {
    return (
      <div className={styles.frame} style={{ aspectRatio: ratio }}>
        <CategoryIllustration
          categoryId={categoryId}
          icon={categoryIcon}
          size={illustrationSize}
          label={
            illustrationSize === 'sm' ? undefined : t('place.noPhoto', { category: categoryLabel })
          }
        />
      </div>
    )
  }

  const src = assetUrl(photo.src)
  const variants = photo.variants ?? []
  // Variantes reducidas + la imagen principal (si se conoce su ancho) en cada formato.
  const srcSet = (format: 'webp' | 'avif') =>
    [
      ...variants.map((width) => `${assetUrl(variantPath(photo.src, width, format))} ${width}w`),
      ...(photo.width
        ? [`${assetUrl(photo.src.replace(/\.[a-z0-9]+$/i, `.${format}`))} ${photo.width}w`]
        : []),
    ].join(', ')

  return (
    <div
      className={styles.frame}
      style={{ aspectRatio: ratio, background: photo.placeholder ?? undefined }}
    >
      <picture>
        {variants.length > 0 && <source type="image/avif" srcSet={srcSet('avif')} sizes={sizes} />}
        {variants.length > 0 && <source type="image/webp" srcSet={srcSet('webp')} sizes={sizes} />}
        <img
          className={styles.image}
          src={src}
          alt={photo.alt}
          width={photo.width}
          height={photo.height}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setFailedSrc(photo.src)}
        />
      </picture>
      {photo.credit && illustrationSize !== 'sm' && (
        <span className={styles.credit}>{photo.credit}</span>
      )}
    </div>
  )
}
