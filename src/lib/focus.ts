/**
 * Mover el foco al título del panel ayuda a quien navega con teclado o lector de pantalla: al abrir
 * una plaza o una ficha, el foco entra en el contenido nuevo. Pero el panel también cambia solo
 * mientras alguien escribe en el buscador, y entonces robarle el foco le corta la palabra a medias.
 */
export function focusPanelHeading(heading: HTMLElement | null): void {
  if (!heading) return
  const active = document.activeElement
  const typing =
    active instanceof HTMLElement &&
    (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)
  if (typing) return
  heading.focus({ preventScroll: true })
}
