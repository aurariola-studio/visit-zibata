/**
 * Quién hace la guía y cómo corregirla, a la vista desde el primer segundo y sin robar mapa:
 * en escritorio, una franja discreta en el borde inferior; en móvil, donde no cabe una franja sin
 * pelearse con la hoja y la atribución, un botón en la barra superior que abre "Acerca de esta guía".
 */
import { Signature } from '../../components/brand/Signature.tsx'
import { t, useLocale } from '../../i18n/index.ts'
import { alPulsarEnlace } from '../../lib/navegacion.ts'
import { type InfoTopic, rutaDeInfo } from '../../lib/url-state.ts'
import styles from './GuideBar.module.css'

/**
 * En la franja el nombre va corto: el ancho que ahorra se lo lleva la leyenda.
 *
 * Las cuatro rutas, tutorial incluido: desde que se puede volver a ver, esta franja es una de las
 * dos puertas que tiene quien ya pasó por él la primera vez (la otra es Tu Zibatá). Solo sale solo
 * en la primera visita, así que sin un enlace no habría forma de encontrarlo.
 */
const LABEL: Record<
  InfoTopic,
  'about.openShort' | 'about.privacy' | 'about.fix' | 'about.tutorial'
> = {
  acerca: 'about.openShort',
  privacidad: 'about.privacy',
  sugerir: 'about.fix',
  tutorial: 'about.tutorial',
}

const PAGINAS = Object.keys(LABEL) as InfoTopic[]

export function GuideBar({ onOpen }: { onOpen: (topic: InfoTopic) => void }) {
  const idioma = useLocale()
  return (
    <div className={styles.bar}>
      <p className={styles.legend}>{t('about.independent')}</p>
      {/*
       * Enlaces y no botones. Las tres tienen ruta propia, y mientras se abrían con un botón no se
       * podían abrir en otra pestaña ni copiar, y un buscador no encontraba ninguna.
       */}
      <nav className={styles.links} aria-label={t('about.moreLabel')}>
        {PAGINAS.map((topic) => (
          <a
            key={topic}
            className={styles.link}
            href={rutaDeInfo(topic, idioma, import.meta.env.BASE_URL)}
            onClick={alPulsarEnlace(() => onOpen(topic))}
          >
            {t(LABEL[topic])}
          </a>
        ))}
      </nav>
      <Signature className={styles.firma} compacta />
    </div>
  )
}
