/**
 * Las cinco miniaturas del tutorial.
 *
 * Son piezas de la guía montadas en pequeño, con locales de ejemplo y sin datos reales. El buscador
 * escribe, la ficha recibe un toque en Cómo llegar, las marcas se encienden y el formulario envía.
 * No son controles: cuentan la acción con una animación de un solo pase y quedan quietas con
 * movimiento reducido. El texto de la tarjeta es el que explica, así que la miniatura va oculta a
 * lectores de pantalla.
 */
import {
  Check,
  Clock,
  Coffee,
  Heart,
  MapPin,
  Navigation,
  Phone,
  Search,
  Send,
  Star,
} from 'lucide-react'
import { type CSSProperties, useEffect, useState } from 'react'
import { useMediaQuery } from '../../hooks/useMediaQuery.ts'
import { t } from '../../i18n/index.ts'
import { assetUrl } from '../../lib/assets.ts'
import styles from './StepDemo.module.css'

export type DemoKind = 'map' | 'search' | 'detail' | 'marks' | 'suggest'

export function StepDemo({ kind }: { kind: DemoKind }) {
  return (
    <div className={styles.demo} aria-hidden="true">
      {kind === 'map' && <MapDemo />}
      {kind === 'search' && <SearchDemo />}
      {kind === 'detail' && <DetailDemo />}
      {kind === 'marks' && <MarksDemo />}
      {kind === 'suggest' && <SuggestDemo />}
    </div>
  )
}

/**
 * Escribe un texto letra a letra y avisa cuando termina. Con movimiento reducido lo enseña entero
 * desde el principio, que es el estado final de la animación.
 */
function useTyping(text: string, speed: number): { shown: string; done: boolean } {
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
  const [count, setCount] = useState(reduced ? text.length : 0)

  useEffect(() => {
    if (reduced) {
      setCount(text.length)
      return
    }
    setCount(0)
    let index = 0
    const timer = window.setInterval(() => {
      index += 1
      setCount(index)
      if (index >= text.length) window.clearInterval(timer)
    }, speed)
    return () => window.clearInterval(timer)
  }, [text, speed, reduced])

  return { shown: text.slice(0, count), done: count >= text.length }
}

function MapDemo() {
  return (
    <div className={styles.map}>
      {/* Recorte del mapa real que ya usa la tarjeta social, sin la marca encima. */}
      <img className={styles.mapImage} src={assetUrl('tutorial/mapa.webp')} alt="" />
      <span className={styles.drag} />
      <span className={styles.pinch} />
      <span className={styles.pinchInner} />
    </div>
  )
}

function SearchDemo() {
  const query = t('onboarding.demo.place1')
  const { shown, done } = useTyping(query, 55)
  const rows = [t('onboarding.demo.place1'), t('onboarding.demo.place2')]

  return (
    <div className={styles.search}>
      <div className={styles.field}>
        <Search className={styles.fieldIcon} />
        <span className={styles.query}>{shown}</span>
        <span className={styles.caret} />
      </div>
      <div className={styles.chips}>
        <span className={styles.chipActive}>{t('filters.allCategories')}</span>
        <span className={styles.chip}>{t('onboarding.demo.category1')}</span>
        <span className={styles.chip}>{t('onboarding.demo.category2')}</span>
      </div>
      <div className={styles.results} data-ready={done}>
        {rows.map((name, index) => (
          <span key={name} className={styles.result} style={{ '--i': index } as CSSProperties}>
            <span className={styles.resultDot}>
              <Coffee className={styles.resultIcon} />
            </span>
            <span className={styles.resultText}>
              <span className={styles.resultName}>{name}</span>
              <span className={styles.resultZone}>{t('onboarding.demo.zone')}</span>
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}

function DetailDemo() {
  return (
    <div className={styles.detail}>
      <Head />
      <Rows />
      <div className={styles.actions}>
        <span className={styles.primary}>
          <Navigation className={styles.actionIcon} />
          {t('place.directions')}
        </span>
        <span className={styles.iconButton}>
          <Heart className={styles.actionIcon} />
        </span>
      </div>
      <span className={`${styles.tap} ${styles.tapDetail}`} />
    </div>
  )
}

function MarksDemo() {
  return (
    <div className={styles.detail}>
      <Head />
      <Rows />
      <div className={styles.markRow}>
        <span className={styles.visit}>
          <Check className={styles.visitCheck} />
          {t('visit.action')}
        </span>
        <span className={styles.heart}>
          <Heart className={styles.actionIcon} />
        </span>
      </div>
      <div className={styles.rating}>
        <span className={styles.stars}>
          {[0, 1, 2, 3, 4].map((index) => (
            <Star key={index} className={styles.star} />
          ))}
        </span>
        <span className={styles.ratingLabel}>{t('rating.legend')}</span>
      </div>
      <span className={`${styles.tap} ${styles.tapMarks}`} />
    </div>
  )
}

function SuggestDemo() {
  const message = t('onboarding.demo.message')
  const { shown, done } = useTyping(message, 45)

  return (
    <div className={styles.suggest}>
      <span className={styles.suggestLink}>{t('about.contribute')}</span>
      <span className={styles.miniField}>{t('suggest.place')}</span>
      <div className={styles.message}>
        <span className={styles.messageText}>{shown || t('suggest.message')}</span>
        <span className={styles.messageCaret} />
      </div>
      <span className={styles.send} data-ready={done}>
        <Send className={styles.actionIcon} />
        {t('suggest.send')}
      </span>
      <span className={`${styles.tap} ${styles.tapSend}`} data-ready={done} />
    </div>
  )
}

function Head() {
  return (
    <div className={styles.head}>
      <span className={styles.avatar}>
        <Coffee className={styles.avatarIcon} />
      </span>
      <span className={styles.titles}>
        <span className={styles.name}>{t('onboarding.demo.place1')}</span>
        <span className={styles.zone}>{t('onboarding.demo.zone')}</span>
      </span>
    </div>
  )
}

function Rows() {
  return (
    <div className={styles.rows}>
      {[
        { icon: Clock, label: t('place.hours') },
        { icon: Phone, label: t('place.contact') },
        { icon: MapPin, label: t('place.location') },
      ].map(({ icon: Icon, label }, index) => (
        <span key={label} className={styles.row} style={{ '--i': index } as CSSProperties}>
          <Icon className={styles.rowIcon} />
          {label}
        </span>
      ))}
    </div>
  )
}
