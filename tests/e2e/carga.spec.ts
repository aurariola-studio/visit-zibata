import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

const huella = (css: string) =>
  `'sha256-${createHash('sha256').update(css, 'utf8').digest('base64')}'`

/**
 * La primera pantalla: el cargador viene en el HTML, con su estilo en línea, y tapa el artículo del
 * fallback. Sin JavaScript, el cargador se esconde y queda el artículo, que es lo que leen los
 * buscadores. Si el hash del bloque en línea no coincide con la CSP, el navegador lo bloquea y vuelve
 * el HTML crudo, así que la coincidencia también se prueba.
 */
test.describe('Carga inicial', () => {
  test('el HTML servido trae el cargador con su estilo permitido por la CSP', async ({
    request,
  }) => {
    const respuesta = await request.get('/es')
    expect(respuesta.ok()).toBe(true)
    const html = await respuesta.text()

    expect(html).toContain('class="cargador"')
    expect(html).toContain('Preparando Zibatá')
    expect(html).toContain('class="estatico"')

    const estilo = html.match(/<style>([^<]*\.cargador[^<]*)<\/style>/)?.[1] ?? ''
    expect(estilo, 'el bloque de estilo del cargador').toBeTruthy()
    expect(html, 'la CSP permite el bloque en línea').toContain(huella(estilo))

    const sinJs = html.match(/<noscript><style>([^<]*)<\/style>/)?.[1] ?? ''
    expect(sinJs, 'el bloque sin JavaScript').toContain('.cargador{display:none}')
    expect(html, 'la CSP permite el bloque sin JavaScript').toContain(huella(sinJs))

    // La cabecera de producción sale de la misma política que el <meta>.
    const cabeceras = readFileSync('dist/_headers', 'utf8')
    expect(cabeceras).toContain(huella(estilo))
    expect(cabeceras).toContain(huella(sinJs))
  })

  test('el cargador está en todas las páginas y en su idioma', async ({ request }) => {
    expect(await (await request.get('/en')).text()).toContain('Preparing Zibatá')
    expect(await (await request.get('/es/lugar/tomassa')).text()).toContain('Preparando Zibatá')
    expect(await (await request.get('/es/zona/condesa')).text()).toContain('Preparando Zibatá')
  })

  test('sin JavaScript se ve el artículo, el cargador se esconde y la página se desplaza', async ({
    browser,
  }) => {
    const contexto = await browser.newContext({ javaScriptEnabled: false })
    const pagina = await contexto.newPage()
    await pagina.goto('/es')

    await expect(pagina.locator('.cargador')).toBeHidden()
    await expect(pagina.locator('.estatico')).toBeVisible()

    // El cuerpo de la app vive con `overflow: hidden`; el bloque sin JS lo devuelve a `auto`.
    const desplazable = await pagina.evaluate(() => {
      window.scrollTo(0, 400)
      return {
        sobra: document.documentElement.scrollHeight > window.innerHeight,
        movido: window.scrollY > 0,
      }
    })
    expect(desplazable.sobra, 'el artículo es más alto que la ventana').toBe(true)
    expect(desplazable.movido, 'el artículo se puede desplazar').toBe(true)
    await contexto.close()
  })

  test('mientras la app no arranca, el cargador cubre el artículo', async ({ page }) => {
    await page.route('**/assets/index-*.js', (ruta) => ruta.abort())
    await page.goto('/es')

    const cargador = page.locator('.cargador')
    await expect(cargador).toBeVisible()
    const caja = await cargador.boundingBox()
    const ventana = page.viewportSize()
    expect(caja?.width).toBe(ventana?.width)
    expect(caja?.height).toBe(ventana?.height)
    // El artículo sigue en el documento para los buscadores, aunque el cargador lo tape.
    await expect(page.locator('.estatico')).toBeAttached()
  })
})
