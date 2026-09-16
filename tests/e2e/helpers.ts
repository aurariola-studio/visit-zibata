import type { Locator, Page } from '@playwright/test'

/** Abre la app (relativo a BASE_PATH) sin el tutorial, salvo que se pida lo contrario. */
export async function openApp(page: Page, { hash = '', onboarding = false } = {}): Promise<void> {
  if (!onboarding) {
    await page.addInitScript(() => window.sessionStorage.setItem('zibata:onboarding-visto', '1'))
  }
  await page.goto(`./${hash}`)
}

/** Espera a que el mapa haya cargado (los marcadores de plazas solo aparecen con el mapa listo). */
export async function waitForMap(page: Page): Promise<void> {
  await page.waitForFunction(
    () => document.querySelectorAll('button[data-mode]').length > 0,
    null,
    {
      timeout: 60_000,
    },
  )
}

export const isMobile = (page: Page) => (page.viewportSize()?.width ?? 1440) < 900

/** El panel de lugares: lateral en escritorio, hoja inferior en móvil (misma región accesible). */
export const panel = (page: Page) =>
  page
    .getByRole('region', { name: 'Información de lugares' })
    .or(page.getByRole('complementary', { name: 'Información de lugares' }))

/**
 * Marcador de una plaza tal como lo alcanzaría una persona: si en esta pantalla está agrupado en "+N",
 * se pulsa el grupo (acerca el mapa) hasta que tenga marcador propio. En pantallas estrechas un grupo
 * grande puede necesitar más de un toque.
 */
export async function plazaMarker(page: Page, name: string): Promise<Locator> {
  const marker = page.locator(`button[data-mode][aria-label^="Ver ${name}:"]`)
  await marker.waitFor({ state: 'attached' })
  for (let attempt = 0; attempt < 5; attempt++) {
    // La colocación de marcadores se estabiliza cuando termina el movimiento de la cámara.
    await page.waitForTimeout(1200)
    if ((await marker.getAttribute('data-mode')) !== 'hidden') return marker
    // El grupo puede desaparecer mientras la cámara aún se acerca (la plaza ya tiene marcador): no es
    // un fallo, se vuelve a comprobar.
    await page
      .getByRole('button', { name: new RegExp(`^Acercar el mapa para ver.*${name}`) })
      .click({ timeout: 5000 })
      .catch(() => {})
  }
  throw new Error(`La plaza "${name}" sigue agrupada tras 4 toques`)
}
