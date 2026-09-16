import { type ReactNode, useEffect, useRef } from 'react'
import { t } from '../../i18n/index.ts'
import styles from './DesktopSidePanel.module.css'

interface DesktopSidePanelProps {
  open: boolean
  /** Cambia al mostrar otro contenido: el panel vuelve arriba. */
  contentKey: string
  children: ReactNode
}

/** Panel lateral derecho (~28 % del viewport). El mapa sigue visible e interactivo a su izquierda. */
export function DesktopSidePanel({ open, contentKey, children }: DesktopSidePanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // biome-ignore lint/correctness/useExhaustiveDependencies: se reinicia el scroll cuando cambia el contenido.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
  }, [contentKey])

  return (
    <aside
      className={styles.panel}
      data-panel=""
      data-open={open}
      aria-label={t('panel.label')}
      inert={!open}
    >
      <div ref={scrollRef} className={styles.scroll}>
        {children}
      </div>
    </aside>
  )
}
