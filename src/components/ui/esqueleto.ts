/**
 * Que una ventana no vuelva a entrar si su esqueleto ya estaba en pantalla.
 *
 * `Suspense` cambia el esqueleto por la ventana real en un solo paso. Esta última trae su animación de
 * entrada (el velo que aparece, la hoja que sube unos píxeles), y con el esqueleto ya visto se notaba
 * como un parpadeo: el fondo se aclaraba y volvía a oscurecer, y la hoja saltaba. Mientras `<html>`
 * lleva esta marca, las ventanas entran sin animación (ver `InfoDialog` y `OnboardingModal`).
 *
 * La marca solo se pone cuando el esqueleto llegó a verse (`RETARDO_DEL_ESQUELETO`). Si la ventana
 * llegó antes, nunca hubo esqueleto a la vista y entra con su animación de siempre. La quita la propia
 * ventana al cerrarse: quitarla al montar haría que la animación empezara justo entonces.
 */
export const RETARDO_DEL_ESQUELETO = 150

const MARCA = 'data-esqueleto'

export const marcarEsqueleto = (): void => document.documentElement.setAttribute(MARCA, '')

export const liberarEsqueleto = (): void => document.documentElement.removeAttribute(MARCA)
