import { type RefObject, useEffect, useState } from 'react'

/**
 * Borde inferior (en px desde arriba de la ventana) de un elemento, actualizado cuando cambia su tamaño.
 * Sirve para reservar al mapa exactamente el espacio que ocupa la barra superior, que crece al aparecer
 * filas (resumen de filtros, avisos) o al pasar a dos líneas en pantallas estrechas.
 */
export function useElementBottom(ref: RefObject<HTMLElement | null>, fallback: number): number {
  const [bottom, setBottom] = useState(fallback)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const measure = () => setBottom(Math.round(element.getBoundingClientRect().bottom))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [ref])
  return bottom
}
