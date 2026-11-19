import { expect, test } from '@playwright/test'
import { isMobile, openApp } from './helpers.ts'

test.describe('Información de la guía', () => {
  test('se llega desde la pantalla inicial y cada página tiene su propia ruta', async ({
    page,
  }) => {
    await openApp(page)
    // En escritorio, la franja del mapa; en móvil, tu sello de la barra superior.
    if (isMobile(page)) {
      await page.getByRole('button', { name: 'Tu Zibatá' }).click()
      await page
        .getByRole('dialog', { name: 'Tu Zibatá' })
        .getByRole('link', { name: 'Privacidad' })
        .click()
    } else {
      await expect(page.getByText('Guía independiente de establecimientos')).toBeVisible()
      await page.getByRole('link', { name: 'Privacidad' }).first().click()
    }

    const privacy = page.getByRole('dialog', { name: 'Privacidad y términos' })
    await expect(privacy).toBeVisible()
    await expect(privacy).toContainText('no te pide crear una cuenta ni usa cookies de rastreo')
    // Lo que sí se hace también se dice, y en la página que la gente abre, no solo en el repositorio.
    await expect(privacy).toContainText('cuántas veces se abre cada página y cada lugar')
    await expect(privacy).toContainText('se envían para que no se pierdan')
    await expect(privacy).toContainText('no se publican nunca, ni siquiera como promedio')
    // Y los términos, en la misma página: una sola dirección que leer antes de usar la guía.
    await expect(privacy.getByRole('heading', { name: 'Términos de uso' })).toBeVisible()
    await expect(privacy).toContainText('No tiene relación comercial')
    await expect(privacy).toContainText('sin garantía de que cada dato sea exacto hoy')
    await expect(page).toHaveURL(/\/es\/info\/privacidad$/)
    /*
     * Todo lo que dice se cumple aquí dentro: no hay un enlace que mande a leerlo a otro sitio.
     *
     * Se mira el destino y no el elemento. Las páginas de información se enlazan entre sí (son
     * rutas de la guía, así que son enlaces de verdad), y contar `link` a secas haría fallar esto
     * por el motivo contrario al que protege.
     */
    await expect(privacy.locator('a[href^="http"]')).toHaveCount(0)

    // Desde una página se llega a las otras dos.
    await privacy.getByRole('link', { name: 'Sugiere o contacta' }).click()
    await expect(
      page.getByRole('dialog', { name: 'Sugiere un cambio o contáctanos' }),
    ).toBeVisible()
    await expect(page).toHaveURL(/\/es\/info\/sugerir$/)

    await page.getByRole('dialog').getByRole('button', { name: 'Cerrar', exact: true }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page).toHaveURL(/\/es$/)
  })

  test('una ruta de información se puede abrir directamente', async ({ page }) => {
    await openApp(page, { path: 'info/acerca' })
    const about = page.getByRole('dialog', { name: 'Acerca de esta guía' })
    await expect(about).toBeVisible()
    await expect(about).toContainText('OpenStreetMap')
    // Cerrar con Escape deja la guía en su vista normal.
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })

  test('el tutorial no tapa una página compartida y se vuelve a abrir desde los enlaces', async ({
    page,
  }) => {
    // Sin la marca de "ya lo vio": si el tutorial fuera a salir solo, aquí saldría.
    await openApp(page, { path: 'info/acerca', onboarding: true })
    const about = page.getByRole('dialog', { name: 'Acerca de esta guía' })
    await expect(about).toBeVisible()
    // Quien abre /info/acerca viene a leer eso, no a que le expliquen el mapa por encima.
    await expect(page.getByRole('button', { name: 'Saltar' })).toHaveCount(0)

    // Y desde que se recuerda por dispositivo, esta es la forma de volver a verlo.
    await about.getByRole('link', { name: 'Ver el tutorial' }).click()
    await expect(page.getByRole('button', { name: 'Saltar' })).toBeVisible()
    // Por el id del título, que es el del diálogo del tutorial.
    await expect(page.locator('#onboarding-title')).toHaveText('¿Cómo me muevo por el mapa?')
    // Tiene ruta propia, como las otras tres, y la hoja de debajo se cierra.
    await expect(page).toHaveURL(/\/es\/info\/tutorial$/)
    await expect(page.getByRole('dialog', { name: 'Acerca de esta guía' })).toHaveCount(0)

    // Y por eso el botón atrás lo cierra en vez de sacarte de la guía.
    await page.goBack()
    await expect(page.getByRole('button', { name: 'Saltar' })).toHaveCount(0)
    await expect(page).toHaveURL(/\/es\/info\/acerca$/)
  })

  test('la página del tutorial se abre directamente, como las otras tres', async ({ page }) => {
    await openApp(page, { path: 'info/tutorial' })
    await expect(page.getByRole('button', { name: 'Saltar' })).toBeVisible()
    // Los cuatro temas se comportan igual: misma clase de ruta y el mismo trato en el sitemap.
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0)
  })

  /*
   * Los textos largos de estas ventanas viajan en un fragmento aparte que se pide junto con el
   * diálogo (ver cargarGrupo en i18n/index.ts). Entrar directo por su dirección es el caso que lo
   * exige: el diálogo abre sin que nadie haya tocado nada antes. Que no quede una clave a la vista
   * ("about.privacyBody") es lo que se vigila.
   */
  for (const caso of [
    {
      idioma: 'es',
      ruta: 'es/info/privacidad',
      nombre: 'Privacidad y términos',
      frase: 'no te pide crear una cuenta',
    },
    {
      idioma: 'en',
      ruta: 'en/info/privacy',
      nombre: 'Privacy and terms',
      frase: 'never asks you to create an account',
    },
    { idioma: 'es', ruta: 'es/info/acerca', nombre: 'Acerca de esta guía', frase: 'OpenStreetMap' },
    { idioma: 'en', ruta: 'en/info/about', nombre: 'About this guide', frase: 'OpenStreetMap' },
    {
      idioma: 'es',
      ruta: 'es/info/sugerir',
      nombre: 'Sugiere un cambio o contáctanos',
      frase: 'Escribe quien sea',
    },
    {
      idioma: 'es',
      ruta: 'es/info/tutorial',
      nombre: '¿Cómo me muevo por el mapa?',
      frase: 'Arrastra para recorrer Zibatá',
    },
    {
      idioma: 'en',
      ruta: 'en/info/tutorial',
      nombre: 'How do I get around the map?',
      frase: 'Drag to move around Zibatá',
    },
  ]) {
    test(`la ventana ${caso.ruta} abre con su texto, sin claves a la vista`, async ({ page }) => {
      await openApp(page, { path: caso.ruta })
      const dialog = page.getByRole('dialog', { name: caso.nombre })
      await expect(dialog).toBeVisible()
      await expect(dialog).toContainText(caso.frase)
      await expect(dialog).not.toContainText(/\b(about|onboarding)\.[a-zA-Z]+/)
    })
  }

  /*
   * Mientras llega el fragmento de la ventana se ve su esqueleto, no un hueco: desde que se toca el
   * enlace hasta que llega, en una conexión lenta, no pasaba nada. Se retiene el fragmento un par de
   * segundos para verlo, y se comprueba que cede el sitio a la ventana real y no se queda debajo.
   */
  for (const caso of [
    { ruta: 'es/info/privacidad', fragmento: /InfoDialog-.*.js$/, nombre: 'Privacidad y términos' },
    {
      ruta: 'es/info/tutorial',
      fragmento: /OnboardingModal-.*.js$/,
      nombre: '¿Cómo me muevo por el mapa?',
    },
  ]) {
    test(`${caso.ruta} muestra su esqueleto mientras carga y luego la ventana real`, async ({
      page,
    }) => {
      await page.route(caso.fragmento, async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 2000))
        await route.continue()
      })
      await openApp(page, { path: caso.ruta })
      const esqueleto = page.getByRole('status', { name: 'Cargando…' })
      await expect(esqueleto).toBeVisible()
      await expect(page.getByRole('dialog', { name: caso.nombre })).toBeVisible({ timeout: 15_000 })
      await expect(esqueleto).toHaveCount(0)
    })
  }

  test('la primera visita abre el tutorial con su texto, sin claves a la vista', async ({
    page,
  }) => {
    await openApp(page, { onboarding: true })
    const dialog = page.getByRole('dialog', { name: '¿Cómo me muevo por el mapa?' })
    await expect(dialog).toBeVisible()
    await expect(dialog).not.toContainText(/\b(about|onboarding)\.[a-zA-Z]+/)
  })

  test('el idioma se cambia desde la barra y se recuerda', async ({ page }) => {
    await openApp(page)
    /*
     * El idioma es navegación: cada opción es un enlace a la misma página en el otro árbol de
     * direcciones. Se comprueba eso además del cambio, porque es lo que lo hace compartible y
     * abrible en otra pestaña, que es lo que un botón no podía dar.
     */
    const aIngles = page.getByRole('link', { name: 'English View the guide in English' })
    await expect(aIngles).toHaveAttribute('hreflang', 'en')
    await expect(aIngles).toHaveAttribute('href', /\/en$/)
    await aIngles.click()

    // El cambio alcanza a toda la interfaz, no solo a una hoja.
    await expect(page.getByRole('searchbox', { name: 'Search places' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Español Ver la guía en Español' })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('searchbox', { name: 'Search places' })).toBeVisible()
  })
})
