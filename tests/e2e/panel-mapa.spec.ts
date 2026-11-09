import { expect, type Page, test } from '@playwright/test'
import extentJson from '../../data/geographic/extent.json' with { type: 'json' }

/**
 * El lienzo con el mapa del contorno de una plaza, en el panel con el Worker simulado.
 *
 * Va aparte de `panel.spec.ts` porque necesita WebGL (cuenta como una prueba de mapa en el CI, ver
 * `tests/e2e/grupos.ts`). Lo que fija: que MapLibre solo se descarga al pedir el mapa, que arrastrar un vértice y
 * pulsar un punto entre dos cambian **la lista** (que es la única fuente de verdad), que cerrar el mapa lo
 * destruye, y que si no hay WebGL la lista sigue sirviendo y se dice por qué.
 *
 * Los datos son de la prueba: dos plazas en el centro real de Zibatá, ninguna de verdad.
 */

const hoy = new Date().toISOString().slice(0, 10)
const [centroLng = 0, centroLat = 0] = extentJson.center as [number, number]
const seis = (n: number) => Number(n.toFixed(6))
const cuadradoEn = (lng: number, lat: number, lado = 0.002) => ({
  type: 'Polygon' as const,
  coordinates: [
    [
      [seis(lng - lado / 2), seis(lat - lado / 2)],
      [seis(lng + lado / 2), seis(lat - lado / 2)],
      [seis(lng + lado / 2), seis(lat + lado / 2)],
      [seis(lng - lado / 2), seis(lat + lado / 2)],
      [seis(lng - lado / 2), seis(lat - lado / 2)],
    ],
  ],
})

const estadisticas = {
  dias: 30,
  desde: hoy,
  resumen: {
    visitas: 1,
    paginas: 1,
    comparticiones: 0,
    cuentas: 0,
    corazones: 0,
    notas: 0,
    visitasMarcadas: 0,
  },
  porDia: [{ fecha: hoy, visitas: 1 }],
  porPagina: [],
  porIdioma: [],
  compartidas: [],
  guardados: [],
  calificados: [],
  sugerencias: [],
  sinAtender: 0,
}

const contenido = {
  ref: 'main',
  seco: true,
  pr: null,
  categories: [],
  places: [],
  plazas: [
    {
      id: 'plaza-uno',
      slug: 'plaza-uno',
      name: 'Plaza Uno',
      description: null,
      address: null,
      coordinates: { lat: centroLat, lng: centroLng },
      geometry: cuadradoEn(centroLng, centroLat),
      active: true,
    },
    {
      id: 'plaza-dos',
      slug: 'plaza-dos',
      name: 'Plaza Dos',
      description: null,
      address: null,
      coordinates: { lat: centroLat, lng: seis(centroLng + 0.004) },
      geometry: cuadradoEn(centroLng + 0.004, centroLat),
      active: true,
    },
  ],
}

async function abrirPlaza(page: Page) {
  await page.route(/\/api\/panel\?dias=\d+$/, (ruta) => ruta.fulfill({ json: estadisticas }))
  await page.route(/\/api\/panel\/contenido$/, (ruta) => ruta.fulfill({ json: contenido }))
  await page.goto('./panel.html')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Resumen')
  await page.locator('[data-vista="plazas"]').click()
  await page.getByRole('button', { name: 'Editar Plaza Uno' }).click()
  const dialogo = page.locator('#editor')
  await expect(dialogo.getByRole('heading', { level: 3, name: 'Contorno' })).toBeVisible()
  return {
    dialogo,
    lista: dialogo.locator('[data-contorno-lista]'),
    caja: dialogo.locator('[data-contorno-mapa]'),
    alternar: dialogo.getByRole('button', { name: /sobre el mapa|Ocultar el mapa/ }),
  }
}

/** Espera a que el mapa esté listo y devuelve dónde cae cada tirador, en la página. */
async function tiradores(page: Page, caja: ReturnType<typeof page.locator>) {
  await expect(caja).toHaveAttribute('data-listo', 'si', { timeout: 60_000 })
  // Con WebGL por software, la primera pasada tarda: se espera a que haya algo que acertar. Y el desplazamiento
  // suave que deja el mapa a la vista (el pie fijo tapa lo de abajo) tiene que haber terminado.
  await page.waitForTimeout(1500)
  // Lo que se arrastra tiene que estar visible, no detrás del pie del formulario.
  const sobrepuesto = await caja.evaluate((el) => {
    const pie = el.closest('.editor-caja')?.querySelector('.editor-pie')
    if (!pie) return false
    const a = el.getBoundingClientRect()
    const b = pie.getBoundingClientRect()
    return a.bottom > b.top && a.top < b.bottom
  })
  expect(sobrepuesto, 'el pie del formulario tapa el mapa').toBe(false)
  const marco = await caja.boundingBox()
  if (!marco) throw new Error('el mapa no tiene caja')
  const leer = async (clave: 'vertices' | 'medios') =>
    (JSON.parse((await caja.getAttribute(`data-${clave}`)) ?? '[]') as number[][]).map(
      ([x = 0, y = 0]) => ({
        x: marco.x + x,
        y: marco.y + y,
      }),
    )
  return { vertices: await leer('vertices'), medios: await leer('medios') }
}

test.describe('el mapa del contorno', () => {
  test('MapLibre solo se descarga cuando se pide el mapa', async ({ page }) => {
    const archivos: string[] = []
    page.on('request', (peticion) => archivos.push(new URL(peticion.url()).pathname))
    const { caja, alternar } = await abrirPlaza(page)
    expect(archivos.filter((ruta) => /buildMapStyle|maplibre/i.test(ruta))).toEqual([])

    await alternar.click()
    await expect(caja).toHaveAttribute('data-listo', 'si', { timeout: 60_000 })
    expect(archivos.filter((ruta) => /buildMapStyle|maplibre/i.test(ruta)).length).toBeGreaterThan(
      0,
    )
  })

  test('arrastrar un vértice cambia sus coordenadas en la lista', async ({ page }) => {
    test.slow()
    const { lista, caja, alternar } = await abrirPlaza(page)
    const primero = lista.locator('li').first()
    const lngAntes = Number(await primero.locator('[data-contorno-campo="lng"]').inputValue())
    const latAntes = Number(await primero.locator('[data-contorno-campo="lat"]').inputValue())

    await alternar.click()
    const { vertices } = await tiradores(page, caja)
    const origen = vertices[0]
    if (!origen) throw new Error('no hay vértices')
    await page.mouse.move(origen.x, origen.y)
    await page.mouse.down()
    await page.mouse.move(origen.x + 20, origen.y - 15, { steps: 4 })
    await page.mouse.move(origen.x + 40, origen.y - 30, { steps: 4 })
    await page.mouse.up()

    // Hacia la derecha y hacia arriba en pantalla: más longitud y más latitud.
    await expect
      .poll(async () => Number(await primero.locator('[data-contorno-campo="lng"]').inputValue()))
      .toBeGreaterThan(lngAntes)
    expect(
      Number(await primero.locator('[data-contorno-campo="lat"]').inputValue()),
    ).toBeGreaterThan(latAntes)
    // Y sigue siendo la lista la que manda: los demás vértices no se tocaron.
    expect(await lista.locator('li').count()).toBe(4)
  })

  test('pulsar un punto entre dos vértices añade uno ahí', async ({ page }) => {
    test.slow()
    const { lista, caja, alternar } = await abrirPlaza(page)
    await alternar.click()
    const { medios } = await tiradores(page, caja)
    const medio = medios[0]
    if (!medio) throw new Error('no hay puntos medios')
    await page.mouse.click(medio.x, medio.y)
    await expect(lista.locator('li')).toHaveCount(5)
  })

  test('cerrar el mapa lo destruye y devuelve el dibujo plano', async ({ page }) => {
    test.slow()
    const { dialogo, caja, alternar } = await abrirPlaza(page)
    await alternar.click()
    await expect(caja).toHaveAttribute('data-listo', 'si', { timeout: 60_000 })
    await expect(caja.locator('canvas')).toHaveCount(1)
    await expect(dialogo.locator('[data-contorno-vista]')).toBeHidden()

    await dialogo.getByRole('button', { name: 'Ocultar el mapa' }).click()
    await expect(caja.locator('canvas')).toHaveCount(0)
    await expect(dialogo.locator('[data-contorno-vista]')).toBeVisible()
    await expect(dialogo.getByRole('button', { name: 'Dibujar sobre el mapa' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })

  test('sin WebGL la lista sigue sirviendo y se dice por qué', async ({ page }) => {
    await page.addInitScript(() => {
      HTMLCanvasElement.prototype.getContext = () => null
    })
    const { dialogo, lista, alternar } = await abrirPlaza(page)
    await alternar.click()
    await expect(dialogo.locator('[data-problemas]')).toContainText('No se pudo cargar el mapa', {
      timeout: 30_000,
    })
    await expect(lista.locator('li')).toHaveCount(4)
    await expect(dialogo.getByRole('button', { name: 'Dibujar sobre el mapa' })).toBeVisible()
    await expect(dialogo.locator('[data-contorno-vista]')).toBeVisible()
  })
})
