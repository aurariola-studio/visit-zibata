/** Si el tutorial ya se mostró en esta sesión. Vive aparte para que el arranque no cargue el diálogo. */
const STORAGE_KEY = 'zibata:onboarding-visto'

export function hasSeenOnboarding(): boolean {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function markOnboardingSeen(): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, '1')
  } catch {
    // Sin almacenamiento disponible: el tutorial podría reaparecer al recargar, sin más efectos.
  }
}
