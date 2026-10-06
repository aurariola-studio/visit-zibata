/**
 * Cambio de idioma en la barra superior: siempre visible y de un solo toque. Muestra la bandera y el
 * código del idioma que estás viendo (no al que vas): así el botón dice en qué estado estás, como el
 * resto de la interfaz, y la etiqueta accesible dice a dónde lleva pulsarlo, escrita en el idioma de
 * destino ("View the guide in English") para no mezclar dos idiomas en una frase.
 *
 * Las banderas son SVG de circle-flags (MIT), servidas como archivo estático: nadie las dibuja a mano
 * y no pesan en el paquete de la aplicación.
 */
import { LLEVA_AL_IDIOMA, NOMBRE_DEL_IDIOMA } from '../../i18n/cambioDeIdioma.ts'
import { availableLocales, type Locale, setLocale, t, useLocale } from '../../i18n/index.ts'
import { assetUrl } from '../../lib/assets.ts'
import styles from './LocaleSwitch.module.css'

const SHORT: Record<Locale, 'locale.shortEs' | 'locale.shortEn'> = {
  es: 'locale.shortEs',
  en: 'locale.shortEn',
}

/** La bandera acompaña al código; el idioma lo dice el texto, no el país. */
const FLAG: Record<Locale, string> = { es: 'flags/mx.svg', en: 'flags/us.svg' }

export function LocaleSwitch() {
  const current = useLocale()
  const index = availableLocales.indexOf(current)
  const next = availableLocales[(index + 1) % availableLocales.length] ?? current
  const label = LLEVA_AL_IDIOMA[next].replace('{language}', NOMBRE_DEL_IDIOMA[next])
  return (
    <button
      type="button"
      className={styles.switch}
      // Sin `await`: la interfaz se re-renderiza sola cuando el catálogo esté (ver setLocale).
      onClick={() => void setLocale(next)}
      aria-label={label}
      title={label}
    >
      <img className={styles.flag} src={assetUrl(FLAG[current])} alt="" width={20} height={20} />
      <span className={styles.code}>{t(SHORT[current])}</span>
    </button>
  )
}
