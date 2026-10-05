/**
 * Quién hace la guía y cómo corregirla, a la vista desde el primer segundo y sin robar mapa:
 * en escritorio, una franja discreta en el borde inferior; en móvil, donde no cabe una franja sin
 * pelearse con la hoja y la atribución, un botón en la barra superior que abre "Acerca de esta guía".
 */
import { Signature } from '../../components/brand/Signature.tsx'
import { t } from '../../i18n/index.ts'
import { INFO_TOPICS, type InfoTopic } from '../../lib/url-state.ts'
import styles from './GuideBar.module.css'

/** En la franja el nombre va corto: el ancho que ahorra se lo lleva la leyenda. */
const LABEL: Record<InfoTopic, 'about.openShort' | 'about.privacy' | 'about.fix'> = {
  acerca: 'about.openShort',
  privacidad: 'about.privacy',
  sugerir: 'about.fix',
}

export function GuideBar({ onOpen }: { onOpen: (topic: InfoTopic) => void }) {
  return (
    <div className={styles.bar}>
      <p className={styles.legend}>{t('about.independent')}</p>
      <nav className={styles.links} aria-label={t('about.moreLabel')}>
        {INFO_TOPICS.map((topic) => (
          <button key={topic} type="button" className={styles.link} onClick={() => onOpen(topic)}>
            {t(LABEL[topic])}
          </button>
        ))}
      </nav>
      <Signature className={styles.firma} compacta />
    </div>
  )
}
