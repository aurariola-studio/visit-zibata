/** Pastillas de categoría con conteo, reutilizadas en la barra de filtros y dentro de cada plaza. */
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { type MouseEvent, useCallback, useEffect, useRef, useState } from 'react'
import { CategoryIcon } from '../../components/icons/CategoryIcon.tsx'
import { localized, t } from '../../i18n/index.ts'
import type { Category } from '../../types/domain.ts'
import styles from './CategoryChips.module.css'

interface CategoryChipsProps {
  categories: readonly Category[]
  counts?: ReadonlyMap<string, number>
  totalCount?: number
  activeId: string | null
  onChange: (categoryId: string | null) => void
  /**
   * La dirección a la que lleva elegir una categoría (o `null`, quitarla) desde donde se está. Cada
   * cápsula es un enlace de verdad: tiene su página y se puede abrir aparte, copiar o rastrear.
   */
  hrefFor: (categoryId: string | null) => string
  label: string
  variant?: 'floating' | 'inline'
}

/**
 * Desplazamiento lateral utilizable con cualquier dispositivo: con el dedo o el trackpad basta el
 * gesto nativo, pero con ratón la rueda vertical no desplaza en horizontal y las pastillas de la
 * derecha quedaban fuera de alcance. Se añaden flechas (solo cuando sobra ancho) y se traduce la
 * rueda vertical a desplazamiento lateral. El teclado ya funcionaba: al tabular el navegador acerca
 * cada pastilla.
 */
function useHorizontalScroll(categories: readonly Category[], counts: unknown) {
  const ref = useRef<HTMLDivElement>(null)
  const [overflow, setOverflow] = useState({ start: false, end: false })

  const sync = useCallback(() => {
    const element = ref.current
    if (!element) return
    const max = element.scrollWidth - element.clientWidth
    setOverflow({ start: element.scrollLeft > 1, end: element.scrollLeft < max - 1 })
  }, [])

  // biome-ignore lint/correctness/useExhaustiveDependencies: el ancho de la fila depende de las pastillas, aunque `sync` no las lea.
  useEffect(sync, [sync, categories, counts])

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const onWheel = (event: WheelEvent) => {
      // Solo la rueda vertical pura: un gesto lateral del trackpad ya lo resuelve el navegador.
      if (event.deltaX !== 0 || event.deltaY === 0) return
      const max = element.scrollWidth - element.clientWidth
      if (max <= 0) return
      const next = Math.min(Math.max(element.scrollLeft + event.deltaY, 0), max)
      if (next === element.scrollLeft) return
      event.preventDefault()
      element.scrollLeft = next
    }
    element.addEventListener('wheel', onWheel, { passive: false })
    const observer = new ResizeObserver(sync)
    observer.observe(element)
    return () => {
      element.removeEventListener('wheel', onWheel)
      observer.disconnect()
    }
  }, [sync])

  const scrollBy = (direction: 1 | -1) => {
    const element = ref.current
    if (!element) return
    element.scrollBy({ left: direction * element.clientWidth * 0.8, behavior: 'smooth' })
  }

  return { ref, overflow, sync, scrollBy }
}

/**
 * Dentro de la guía se filtra sin recargar; con Ctrl, Cmd, Mayúsculas, Alt o el botón del medio, el
 * navegador abre la página de la categoría, que existe de verdad. Mismo gesto que el cambio de idioma.
 */
const alPulsar = (accion: () => void) => (event: MouseEvent<HTMLAnchorElement>) => {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
  event.preventDefault()
  accion()
}

export function CategoryChips({
  categories,
  counts,
  totalCount,
  activeId,
  onChange,
  hrefFor,
  label,
  variant = 'inline',
}: CategoryChipsProps) {
  const { ref, overflow, sync, scrollBy } = useHorizontalScroll(categories, counts)

  /*
   * La cápsula elegida a la vista. Con la dirección de una categoría lejana (Bar, la última) o al
   * elegirla desde otra parte, el carril arrancaba en el principio y la elegida quedaba fuera de la
   * pantalla: el filtro estaba puesto y no se veía cuál.
   *
   * Se vuelve a medir cuando la fila cambia de ancho, porque al cargar la tipografía las cápsulas
   * crecen y la elegida se queda más lejos de lo que se midió. Deja de hacerlo en cuanto quien mira
   * toca el carril: lo que desplazó a mano no se le deshace. Y a mano, sin `scrollIntoView`, que mueve
   * también la página; sin animación, porque es la posición de partida y no un gesto.
   */
  // biome-ignore lint/correctness/useExhaustiveDependencies: `categories.length` solo vuelve a medir cuando llega la fila; `ref` es estable.
  useEffect(() => {
    const carril = ref.current
    const fila = carril?.firstElementChild
    if (!carril || !fila) return
    const alinear = () => {
      const elegida = carril.querySelector<HTMLElement>('[aria-current="true"]')
      if (!elegida) return
      // Dejar libre el desvanecido de cada borde (12 px a la izquierda, 24 a la derecha).
      const izquierda = elegida.offsetLeft - 16
      const derecha = elegida.offsetLeft + elegida.offsetWidth + 28
      if (izquierda < carril.scrollLeft) carril.scrollLeft = Math.max(izquierda, 0)
      else if (derecha > carril.scrollLeft + carril.clientWidth)
        carril.scrollLeft = derecha - carril.clientWidth
    }
    alinear()
    const observer = new ResizeObserver(alinear)
    // La fila crece al cargar la tipografía; el carril se estrecha cuando se abre el panel.
    observer.observe(fila)
    observer.observe(carril)
    const soltar = () => observer.disconnect()
    const gestos = ['wheel', 'pointerdown', 'touchstart'] as const
    for (const gesto of gestos)
      carril.addEventListener(gesto, soltar, { once: true, passive: true })
    return () => {
      observer.disconnect()
      for (const gesto of gestos) carril.removeEventListener(gesto, soltar)
    }
  }, [activeId, categories.length])

  return (
    <div className={styles.rail} data-variant={variant}>
      <div ref={ref} className={styles.scroller} onScroll={sync}>
        <ul className={styles.chips} aria-label={label}>
          <li>
            {/* El conteo va en su propio elemento: sin etiqueta accesible, NVDA lee "Todo19". */}
            <a
              className={styles.chip}
              href={hrefFor(null)}
              aria-current={activeId === null ? 'true' : undefined}
              aria-label={
                totalCount === undefined ? undefined : `${t('filters.allCategories')} ${totalCount}`
              }
              onClick={alPulsar(() => onChange(null))}
            >
              {t('filters.allCategories')}
            </a>
          </li>
          {categories.map((category) => {
            const count = counts?.get(category.id)
            const active = activeId === category.id
            return (
              <li key={category.id}>
                <a
                  className={styles.chip}
                  href={hrefFor(active ? null : category.id)}
                  aria-current={active ? 'true' : undefined}
                  aria-label={
                    count === undefined ? undefined : `${localized(category.label)} ${count}`
                  }
                  onClick={alPulsar(() => onChange(active ? null : category.id))}
                >
                  <CategoryIcon name={category.icon} size={16} strokeWidth={2} />
                  {localized(category.label)}
                </a>
              </li>
            )
          })}
        </ul>
      </div>
      {/* Atajos para ratón: no aportan nada a quien navega con teclado o dedo, así que no entran en el
          orden de tabulación ni se anuncian. */}
      <button
        type="button"
        className={styles.arrow}
        data-side="start"
        hidden={!overflow.start}
        tabIndex={-1}
        aria-hidden="true"
        onClick={() => scrollBy(-1)}
      >
        <ChevronLeft />
      </button>
      <button
        type="button"
        className={styles.arrow}
        data-side="end"
        hidden={!overflow.end}
        tabIndex={-1}
        aria-hidden="true"
        onClick={() => scrollBy(1)}
      >
        <ChevronRight />
      </button>
    </div>
  )
}
