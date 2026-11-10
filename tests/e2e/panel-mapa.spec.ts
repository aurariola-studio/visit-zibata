import { readFileSync } from 'node:fs'
import { expect, type Locator, type Page, test } from '@playwright/test'
import extentJson from '../../data/geographic/extent.json' with { type: 'json' }
import { puntoEnContorno, puntoInterior } from '../../src/data/geometria.ts'

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

/* ------------------------------------------------------------------ ajustar un edificio desde el mapa */

/**
 * Edificios reales de `public/map/plaza-buildings.geojson`: el panel real los dibuja, así que la prueba pulsa uno
 * de verdad. El 9439 es una huella de Microsoft en Plaza Walmart; el 16041 es un volumen sintético en Paseo Zibatá.
 */
interface EdificioDePrueba {
  properties: { id: number; src: string; plazaId: string }
  geometry: { coordinates: number[][][] }
}
const edificiosDelMapa = (
  JSON.parse(
    readFileSync(new URL('../../public/map/plaza-buildings.geojson', import.meta.url), 'utf8'),
  ) as { features: EdificioDePrueba[] }
).features
const edificio = (id: number): EdificioDePrueba => {
  const encontrado = edificiosDelMapa.find((f) => f.properties.id === id)
  if (!encontrado) throw new Error(`el edificio ${id} ya no está en plaza-buildings.geojson`)
  return encontrado
}
const interiorDe = (id: number) => {
  const punto = puntoInterior(edificio(id).geometry.coordinates)
  if (!punto) throw new Error(`el edificio ${id} no tiene punto interior`)
  return { lat: seis(punto.lat), lng: seis(punto.lng) }
}

const REAL = 9439
const SINTETICO = 16041
const walmart = interiorDe(REAL)
const paseo = interiorDe(SINTETICO)

const contenidoEdificios = (ajustes: object[] = []) => ({
  ref: 'main',
  seco: true,
  pr: null,
  categories: [],
  places: [],
  plazas: [
    {
      id: 'plaza-walmart',
      slug: 'plaza-walmart',
      name: 'Plaza Walmart',
      description: null,
      address: null,
      coordinates: walmart,
      geometry: cuadradoEn(walmart.lng, walmart.lat, 0.004),
      active: true,
    },
    {
      id: 'paseo-zibata',
      slug: 'paseo-zibata',
      name: 'Paseo Zibatá',
      description: null,
      address: null,
      coordinates: paseo,
      geometry: cuadradoEn(paseo.lng, paseo.lat, 0.004),
      active: true,
    },
  ],
  edificios: { valido: true, ajustes },
})

const RUTA_EDIFICIO = /\/api\/panel\/contenido\/edificio$/

async function abrirAjuste(page: Page, datos: object = contenidoEdificios()) {
  await page.route(/\/api\/panel\?dias=\d+$/, (ruta) => ruta.fulfill({ json: estadisticas }))
  await page.route(/\/api\/panel\/contenido$/, (ruta) => ruta.fulfill({ json: datos }))
  await page.goto('./panel.html')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Resumen')
  await page.locator('[data-vista="edificios"]').click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Edificios')
  await page.getByRole('button', { name: 'Elegir en el mapa' }).click()
  const dialogo = page.locator('#editor')
  return { dialogo, caja: dialogo.locator('[data-edificios-mapa]') }
}

/** Centra el mapa en una plaza y pulsa en el centro del lienzo, que es donde queda el punto. */
async function pulsarCentro(page: Page, dialogo: Locator, caja: Locator, plaza: string) {
  await expect(caja).toHaveAttribute('data-listo', 'si', { timeout: 60_000 })
  await dialogo.getByLabel('Centrar el mapa en una plaza').selectOption({ label: plaza })
  // Con WebGL por software la pasada tarda: se espera a que haya edificios que pulsar.
  await page.waitForTimeout(2500)
  const marco = await caja.boundingBox()
  if (!marco) throw new Error('el mapa no tiene caja')
  await page.mouse.click(marco.x + marco.width / 2, marco.y + marco.height / 2)
}

const respuestaDeAjuste = (confirmado: boolean) => ({
  ok: true,
  confirmado,
  seco: false,
  pr: confirmado ? { url: 'https://example.test/pr/9', numero: 9, creada: true } : null,
  mensaje: confirmado ? 'Ajuste enviado a la PR.' : 'Esto es lo que cambiaría.',
  resumen: {
    operacion: 'ajustar',
    total: 1,
    avisos: ['El edificio desaparece del mapa, en 2D y en 3D.', 'Se revierte con git.'],
    ajuste: {},
  },
})

test.describe('ajustar un edificio desde el mapa', () => {
  test('MapLibre solo se descarga cuando se pide el mapa', async ({ page }) => {
    const archivos: string[] = []
    page.on('request', (peticion) => archivos.push(new URL(peticion.url()).pathname))
    await page.route(/\/api\/panel\?dias=\d+$/, (ruta) => ruta.fulfill({ json: estadisticas }))
    await page.route(/\/api\/panel\/contenido$/, (ruta) =>
      ruta.fulfill({ json: contenidoEdificios() }),
    )
    await page.goto('./panel.html')
    await page.locator('[data-vista="edificios"]').click()
    await expect(page.getByRole('button', { name: 'Elegir en el mapa' })).toBeVisible()
    expect(archivos.filter((ruta) => /buildMapStyle|maplibre/i.test(ruta))).toEqual([])

    await page.getByRole('button', { name: 'Elegir en el mapa' }).click()
    await expect(page.locator('[data-edificios-mapa]')).toHaveAttribute('data-listo', 'si', {
      timeout: 60_000,
    })
    expect(archivos.filter((ruta) => /buildMapStyle|maplibre/i.test(ruta)).length).toBeGreaterThan(
      0,
    )
  })

  test('pulsar un edificio real manda un punto dentro de su huella, lejos del borde', async ({
    page,
  }) => {
    test.slow()
    const { dialogo, caja } = await abrirAjuste(page)
    await pulsarCentro(page, dialogo, caja, 'Plaza Walmart')
    await expect(caja).toHaveAttribute('data-seleccion', /./, { timeout: 15_000 })
    const elegido = JSON.parse((await caja.getAttribute('data-seleccion')) ?? '{}') as {
      id: number
      punto: { lat: number; lng: number }
      margenM: number
      fuente: string
    }
    expect(elegido.id).toBe(REAL)
    expect(elegido.margenM).toBeGreaterThanOrEqual(1)
    // El punto cae dentro de la huella de verdad, y es el que ve el formulario.
    expect(puntoEnContorno(elegido.punto, edificio(REAL).geometry.coordinates[0] ?? [])).toBe(true)
    await expect(dialogo.locator('input[name="lat"]')).toHaveValue(String(elegido.punto.lat))
    await expect(dialogo.locator('input[name="lng"]')).toHaveValue(String(elegido.punto.lng))
    await expect(dialogo.locator('[data-edificio-elegido]')).toContainText(elegido.fuente)
  })

  test('el flujo completo: elegir, ocultar, ver lo que cambia y enviar lo que se vio', async ({
    page,
  }) => {
    test.slow()
    const cuerpos: Record<string, unknown>[] = []
    await page.route(RUTA_EDIFICIO, async (ruta) => {
      const cuerpo = ruta.request().postDataJSON() as Record<string, unknown>
      cuerpos.push(cuerpo)
      await ruta.fulfill({ json: respuestaDeAjuste(Boolean(cuerpo.confirmar)) })
    })
    const { dialogo, caja } = await abrirAjuste(page)
    await pulsarCentro(page, dialogo, caja, 'Plaza Walmart')
    await expect(dialogo.locator('input[name="lat"]')).not.toHaveValue('')
    await dialogo.getByRole('radio', { name: /Ocultarlo/ }).check()
    await dialogo.locator('textarea[name="motivo"]').fill('Se demolió en 2026')
    await dialogo.getByRole('button', { name: 'Ver lo que cambiaría' }).click()
    await expect(dialogo.getByRole('heading', { name: 'Se ocultará este edificio' })).toBeVisible()
    await dialogo.getByRole('button', { name: 'Enviar a la PR' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'PR abierta #9' })).toBeVisible()

    expect(cuerpos).toHaveLength(2)
    expect(cuerpos[0]).toMatchObject({
      operacion: 'ajustar',
      accion: 'ocultar',
      motivo: 'Se demolió en 2026',
    })
    expect(cuerpos[0]?.confirmar).toBeUndefined()
    expect(cuerpos[1]).toEqual({ ...cuerpos[0], confirmar: true })
  })

  test('un volumen generado se rechaza con su motivo y no rellena nada', async ({ page }) => {
    test.slow()
    const { dialogo, caja } = await abrirAjuste(page)
    await pulsarCentro(page, dialogo, caja, 'Paseo Zibatá')
    await expect(dialogo.locator('[data-edificio-aviso]')).toContainText('volumen generado', {
      timeout: 15_000,
    })
    await expect(dialogo.locator('input[name="lat"]')).toHaveValue('')
    await expect(caja).not.toHaveAttribute('data-seleccion', /./)
  })

  test('un edificio que ya tiene un ajuste se rechaza y manda a quitarlo', async ({ page }) => {
    test.slow()
    const ajuste = {
      accion: 'ocultar',
      punto: walmart,
      motivo: 'Ya estaba',
      creado: hoy,
    }
    const { dialogo, caja } = await abrirAjuste(page, contenidoEdificios([ajuste]))
    await pulsarCentro(page, dialogo, caja, 'Plaza Walmart')
    await expect(dialogo.locator('[data-edificio-aviso]')).toContainText('ya tiene un ajuste', {
      timeout: 15_000,
    })
    await expect(dialogo.locator('input[name="lat"]')).toHaveValue('')
  })

  test('cerrar el formulario destruye el mapa', async ({ page }) => {
    test.slow()
    const { dialogo, caja } = await abrirAjuste(page)
    await expect(caja).toHaveAttribute('data-listo', 'si', { timeout: 60_000 })
    await expect(caja.locator('canvas')).toHaveCount(1)
    await dialogo.getByRole('button', { name: 'Cancelar' }).click()
    await expect(dialogo).toBeHidden()
    await expect(page.locator('[data-edificios-mapa] canvas')).toHaveCount(0)
  })

  test('sin WebGL se dice por qué y el ajuste se hace igual con coordenadas', async ({ page }) => {
    await page.addInitScript(() => {
      HTMLCanvasElement.prototype.getContext = () => null
    })
    const cuerpos: Record<string, unknown>[] = []
    await page.route(RUTA_EDIFICIO, async (ruta) => {
      const cuerpo = ruta.request().postDataJSON() as Record<string, unknown>
      cuerpos.push(cuerpo)
      await ruta.fulfill({ json: respuestaDeAjuste(Boolean(cuerpo.confirmar)) })
    })
    const { dialogo } = await abrirAjuste(page)
    await expect(dialogo.locator('[data-edificio-aviso]')).toContainText(
      'No se pudo cargar el mapa',
    )
    await dialogo.locator('input[name="lat"]').fill(String(walmart.lat))
    await dialogo.locator('input[name="lng"]').fill(String(walmart.lng))
    await expect(dialogo.locator('[data-edificio-elegido]')).toContainText('a mano')
    await dialogo.getByRole('radio', { name: /Fijarle la altura/ }).check()
    await dialogo.locator('input[name="alturaM"]').fill('9,5')
    await dialogo.locator('textarea[name="motivo"]').fill('Medida en el sitio')
    await dialogo.getByRole('button', { name: 'Ver lo que cambiaría' }).click()
    await expect(
      dialogo.getByRole('heading', { name: /Se fijará su altura a 9[.,]5 m/ }),
    ).toBeVisible()
    expect(cuerpos[0]).toMatchObject({
      operacion: 'ajustar',
      accion: 'altura',
      alturaM: 9.5,
      punto: walmart,
    })
  })

  test('sin elegir nada, acción o motivo, se avisa en el formulario y no se llama al servidor', async ({
    page,
  }) => {
    let llamado = false
    await page.route(RUTA_EDIFICIO, async (ruta) => {
      llamado = true
      await ruta.fulfill({ json: respuestaDeAjuste(false) })
    })
    await page.addInitScript(() => {
      HTMLCanvasElement.prototype.getContext = () => null
    })
    const { dialogo } = await abrirAjuste(page)
    await dialogo.getByRole('button', { name: 'Ver lo que cambiaría' }).click()
    await expect(dialogo.locator('.campo-error.dinamico, [data-problemas] p').first()).toBeVisible()
    await expect(dialogo.locator('.campo-error.dinamico').first()).toContainText(
      'Elige un edificio',
    )
    expect(llamado).toBe(false)
  })
})
