/**
 * Ficha del lugar. Solo muestra los campos que existen: nunca botones vacíos ni textos de relleno.
 */
import { ArrowUpRight, ChevronLeft, Globe, MapPin, Navigation, Phone, X } from 'lucide-react'
import { type ReactNode, useEffect, useRef } from 'react'
import { BrandIcon, type BrandName } from '../../components/icons/BrandIcons.tsx'
import { CategoryIcon } from '../../components/icons/CategoryIcon.tsx'
import { useCatalog } from '../../data/CatalogContext.tsx'
import { localized, t } from '../../i18n/index.ts'
import { placeDirectionsUrl, telUrl, whatsappUrl } from '../../lib/maps-url.ts'
import type { Place, Plaza } from '../../types/domain.ts'
import { FavoriteButton } from '../favorites/FavoriteButton.tsx'
import { HoursTable } from './HoursTable.tsx'
import { PhotoGallery } from './PhotoGallery.tsx'
import styles from './PlaceDetail.module.css'

interface PlaceDetailProps {
  place: Place
  plaza: Plaza
  backLabel: string
  onBack: () => void
  onClose: () => void
}

interface ContactLink {
  key: string
  href: string
  label: string
  icon: ReactNode
  external: boolean
}

export function PlaceDetail({ place, plaza, backLabel, onBack, onClose }: PlaceDetailProps) {
  const catalog = useCatalog()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const category = catalog.categoryById.get(place.category)
  const subcategory = category?.subcategories.find((s) => s.id === place.subcategory)
  const categoryLabel = category ? localized(category.label) : ''

  // biome-ignore lint/correctness/useExhaustiveDependencies: el foco se mueve al título cada vez que cambia el lugar mostrado.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
  }, [place.id])

  const brand = (name: BrandName) => <BrandIcon name={name} />
  const links: ContactLink[] = []
  const { phone } = place
  const { whatsapp, website, instagram, facebook, tiktok } = place.links
  if (phone) {
    links.push({
      key: 'phone',
      href: telUrl(phone),
      label: t('place.call'),
      icon: <Phone aria-hidden="true" />,
      external: false,
    })
  }
  if (whatsapp) {
    links.push({
      key: 'whatsapp',
      href: whatsappUrl(whatsapp),
      label: t('place.whatsapp'),
      icon: brand('whatsapp'),
      external: true,
    })
  }
  if (website) {
    links.push({
      key: 'website',
      href: website,
      label: t('place.website'),
      icon: <Globe aria-hidden="true" />,
      external: true,
    })
  }
  if (instagram) {
    links.push({
      key: 'instagram',
      href: instagram,
      label: t('place.instagram'),
      icon: brand('instagram'),
      external: true,
    })
  }
  if (facebook) {
    links.push({
      key: 'facebook',
      href: facebook,
      label: t('place.facebook'),
      icon: brand('facebook'),
      external: true,
    })
  }
  if (tiktok) {
    links.push({
      key: 'tiktok',
      href: tiktok,
      label: t('place.tiktok'),
      icon: brand('tiktok'),
      external: true,
    })
  }

  const hasExtraInfo = Boolean(
    place.description || place.hours || links.length > 0 || place.photos.length > 0,
  )

  return (
    <article className={styles.detail} aria-labelledby="place-detail-title">
      <div className={styles.toolbar}>
        <button type="button" className={styles.back} onClick={onBack}>
          <ChevronLeft aria-hidden="true" />
          <span>{backLabel}</span>
        </button>
        <div className={styles.toolbarActions}>
          <FavoriteButton placeId={place.id} placeName={place.name} />
          <button
            type="button"
            className={styles.iconButton}
            onClick={onClose}
            aria-label={t('panel.close')}
          >
            <X aria-hidden="true" />
          </button>
        </div>
      </div>

      <PhotoGallery
        photos={place.photos}
        categoryId={place.category}
        categoryIcon={category?.icon ?? 'utensils-crossed'}
        categoryLabel={categoryLabel}
      />

      <header className={styles.header}>
        <p className={styles.eyebrow}>
          <CategoryIcon name={category?.icon ?? 'utensils-crossed'} size={15} />
          {categoryLabel}
          {subcategory && <span> · {localized(subcategory.label)}</span>}
        </p>
        <h2 id="place-detail-title" ref={headingRef} tabIndex={-1} className={styles.title}>
          {place.name}
        </h2>
        <p className={styles.location}>
          <MapPin aria-hidden="true" />
          <span>
            {plaza.name}
            {place.localNumber && ` · ${t('place.localNumber', { number: place.localNumber })}`}
            {plaza.address && <span className={styles.address}>{plaza.address}</span>}
          </span>
        </p>
      </header>

      <a
        className={styles.directions}
        href={placeDirectionsUrl(place, plaza)}
        target="_blank"
        rel="noopener noreferrer"
        aria-describedby="directions-hint"
      >
        <Navigation aria-hidden="true" />
        {/* Sin ubicación ni ficha propias, la ruta lleva a la plaza: se dice para no prometer la puerta. */}
        {place.location || place.googleMapsUri
          ? t('place.directions')
          : t('place.directionsToPlaza', { plaza: plaza.name })}
        <ArrowUpRight aria-hidden="true" className={styles.external} />
      </a>
      <span id="directions-hint" className="visually-hidden">
        {t('place.directionsHint')}
      </span>

      {place.description && <p className={styles.description}>{place.description}</p>}

      <HoursTable hours={place.hours} />

      {links.length > 0 && (
        <section className={styles.contact} aria-labelledby="place-contact-title">
          <h3 id="place-contact-title" className={styles.sectionTitle}>
            {t('place.contact')}
          </h3>
          <ul className={styles.links}>
            {links.map((link) => (
              <li key={link.key}>
                <a
                  className={styles.link}
                  href={link.href}
                  {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                >
                  {link.icon}
                  <span>{link.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!hasExtraInfo && <p className={styles.missing}>{t('place.missingInfo')}</p>}
    </article>
  )
}
