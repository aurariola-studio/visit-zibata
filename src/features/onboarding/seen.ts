/**
 * Si el tutorial ya se mostró en este dispositivo. Vive aparte para que el arranque no cargue el
 * diálogo.
 *
 * En `localStorage` y no en `sessionStorage`: con el almacenamiento de sesión volvía a salir cada vez
 * que se abría el navegador, y a quien usa la guía cada semana le aparecía siempre. Se enseña una vez
 * y ya. Quien limpie el almacenamiento vuelve a verlo, que es lo mismo que le pasa a sus favoritos.
 */
const STORAGE_KEY = 'zibata:onboarding-visto'

export function hasSeenOnboarding(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function markOnboardingSeen(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, '1')
  } catch {
    // Sin almacenamiento disponible: el tutorial podría reaparecer al recargar, sin más efectos.
  }
}
