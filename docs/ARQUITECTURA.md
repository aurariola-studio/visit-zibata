# Arquitectura

## Principios

- **El mapa es el producto.** La interfaz flota sobre él y revela contenido de forma progresiva:
  mapa → plaza → local → detalle.
- **Estático y portable.** Solo HTML, CSS, JS, JSON, GeoJSON, PMTiles, imágenes y fuentes. Sin backend,
  cuentas, API keys ni servicios de pago. Cualquier hosting estático sirve.
- **Datos separados del código** y validados dos veces: con Zod en el build y con comprobaciones ligeras
  (sin Zod) al cargarlos en el navegador, compartiendo las mismas reglas (`src/data/rules.ts`).

## Capas

```
src/
  app/            Composición, estado global (useReducer + Context), sincronización con la URL
  components/     UI genérica: panel lateral, hoja inferior, iconos, marca, estados vacíos
  config/         Cámara y límites del mapa (lee data/geographic/extent.json)
  data/           Esquemas Zod, validación de relaciones, repositorio y catálogo
  features/
    map/          MapView, marcadores de plaza, controles, cámara, estilo por capas, depuración
    plazas/       PlazaPanel, ResultsPanel, ExplorePanel, pastillas de categoría
    places/       PlaceCard, PlaceList, PlaceDetail, galería, horarios, ilustraciones
    search/       SearchBar e índice Fuse.js
    filters/      FilterBar y lógica de filtros
    favorites/    Favoritos en localStorage (opcional)
    onboarding/   Tutorial de 3 pasos
  hooks/ lib/ i18n/ styles/ types/
scripts/          Pipeline GIS, datos (validar/importar CSV) e imágenes
data/             Datos geográficos y comerciales (fuente de verdad)
public/           Assets publicados tal cual (map/, icons/, images/)
```

### Mapa (`src/features/map`)

- `MapView` crea MapLibre una vez, registra el protocolo `pmtiles://` y el worker, y traduce el estado a
  **feature-state** (hover, seleccionado, atenuado), marcadores y cámara. Recibe el espacio ocupado por los
  paneles como `padding` y no conoce su maquetación.
- El estilo se compone por capas en `style/layers/`: `ground.ts` (GreenLayer, WaterLayer), `roads.ts`
  (RoadLayer), `buildings.ts` (BuildingLayer), `plazas.ts` (PlazaLayer + PlazaHighlight) y `labels.ts`.
  Colores en `style/theme.ts`.
- `PlazaMarkers` son botones HTML accesibles (teclado, lector de pantalla) con resolución de colisiones:
  etiqueta completa → desplazada → solo cifra → oculta.
- Si no hay WebGL2, se muestra un aviso y la lista de plazas mantiene la guía utilizable.

### Estado

`src/app/state.ts` (reducer puro, testeado). Correspondencia con el brief: `selectedPlaza` (también actúa
como filtro de plaza), `selectedPlace`, `activeCategory`, `searchQuery`, `tutorialVisible`, `mapLoaded`
(`mapStatus`). `useExperience` deriva resultados, conteos y el modo del panel. La URL (`#/plaza/…`,
`#/lugar/…`, `?categoria=`) se sincroniza en `useUrlSync` y funciona en GitHub Pages sin reescrituras.

### Responsive

Un solo árbol de componentes. ≥ 900 px: panel lateral derecho (~28 % del ancho). < 900 px: hoja inferior
con dos estados (colapsada / expandida), arrastrable y operable con teclado; en vertical el mapa se gira
para aprovechar la pantalla.

## Datos: repositorio intercambiable

La UI solo depende de `PlacesRepository` (`src/data/PlacesRepository.ts`):

```ts
interface PlacesRepository {
  getCategories(): Promise<Category[]>
  getPlazas(): Promise<Plaza[]>
  getPlaces(): Promise<Place[]>
}
```

`StaticPlacesRepository` importa los JSON como chunks con hash (caché inmutable) y valida **registro a
registro** con `runtimeValidation.ts`: las mismas reglas que los esquemas Zod del build (identificadores,
enlaces seguros, teléfonos, horarios, fotos), pero sin cargar Zod en el navegador. Un registro inválido se
descarta con un aviso; solo se falla si un archivo es ilegible o se queda sin categorías ni plazas.
`loadCatalog` hace lo mismo con las relaciones: descarta o corrige lo que las rompe (plaza o categoría
inexistente, slug repetido, coordenadas fuera de Zibatá, estado no publicable) en vez de bloquear la guía.
Los tests comprueban que ambas validaciones aceptan y rechazan exactamente lo mismo.

### Futuro: CMS, Supabase o API

1. Crear `RemotePlacesRepository` que haga `fetch` al origen y valide con los esquemas de `src/data/schemas.ts`.
2. Cambiar la instancia en `src/app/App.tsx` (único punto de composición).
3. MapView, PlaceCard, PlaceDetail, búsqueda y filtros no cambian: consumen el mismo `Catalog`.

Un panel administrativo (edición de plazas, locales y fotos con autenticación administrativa) puede escribir
en ese origen y disparar un rebuild, o la app puede leerlo en vivo. La geometría 3D de plazas seguiría
generándose con `map:build`, o se serviría como GeoJSON dinámico con el mismo formato que
`plaza-buildings.geojson`.

## Rendimiento

- Chunk principal ~108 KB gzip; MapLibre (~284 KB gzip) en un chunk aparte que empieza a descargarse en
  paralelo a los datos. `npm run perf:budget` falla si el build supera el presupuesto acordado.
- PMTiles por rangos HTTP: solo se descargan las teselas visibles (~200 KB en la vista inicial).
- Edificios con altura progresiva por zoom y un único estilo sin reconstrucciones: hover y selección usan
  feature-state.
- Imágenes AVIF/WebP con `srcset`, `loading="lazy"`, `aspect-ratio` y color de relleno.
- Búsqueda en memoria con consulta diferida (`useDeferredValue`) y caché de la última consulta.
- Un único reloj compartido actualiza el estado «abierto/cerrado» de todas las tarjetas.

### Escalabilidad

Medido con datasets sintéticos fuera de producción (300 y 500 locales en 30 plazas): validación y catálogo
por debajo de 3 ms, índice de búsqueda ~6 ms, latencia de tecleo ≤ 0,3 s y ~50 MB de heap. Nada en el
código supone el tamaño actual del dataset. Dos puntos a vigilar si la guía creciera mucho:

- la colocación de marcadores es O(n²) sobre las plazas visibles (cómoda hasta unas decenas);
- las listas no están virtualizadas: por encima de ~1 000 locales convendría virtualizar los resultados.

## Accesibilidad

HTML semántico (landmarks, encabezados), foco visible, botones con nombre accesible, marcadores y controles
del mapa operables con teclado, foco gestionado al abrir paneles, `prefers-reduced-motion` (sin animaciones
ni vuelos de cámara), axe sin violaciones graves o críticas en los tests E2E, y la información nunca depende
solo del color (conteos y textos acompañan al verde). Una sola región `aria-live` anuncia resultados y
avisos. Verificado además con NVDA real: ver [ACCESIBILIDAD.md](ACCESIBILIDAD.md).

## Seguridad y privacidad

No hay secretos ni tokens: todo lo publicado es público, con una CSP declarada en el propio HTML y sin
recursos de terceros. Los enlaces externos usan `rel="noopener noreferrer"`. Los favoritos y el tutorial
usan almacenamiento local del navegador; no hay analítica ni rastreo, y la ubicación solo se pide tras una
acción explícita y nunca se guarda ni se envía. Detalle en [SEGURIDAD.md](SEGURIDAD.md).
