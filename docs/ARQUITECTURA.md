# Arquitectura

## Principios

- **El mapa es el producto.** La interfaz flota sobre él y revela contenido de forma progresiva:
  mapa → zona → local → detalle.
- **"Zona" en la interfaz, `plaza` en el código.** Lo que agrupa locales no siempre es una plaza
  comercial (el campus de la Anáhuac o el campo de golf no lo son), así que la interfaz los llama
  zonas. El tipo de dominio, los datos y las rutas (`#/plaza/…`) mantienen `plaza` como identificador
  estable: la palabra visible vive solo en `src/i18n`.
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
    ranking/      Orden personal de las listas (gustos + descubrimiento)
    about/        Idioma, franja de la guía y las páginas de información
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
`#/lugar/…`, `?categoria=`, `#/info/…`) se sincroniza en `useUrlSync` y funciona en GitHub Pages sin
reescrituras.

### Información de la guía

"Acerca de esta guía", "Privacidad" y "Corregir un dato" son **tres rutas propias** (`#/info/acerca`,
`#/info/privacidad`, `#/info/corregir`): se enlazan y comparten por separado, y al cerrarlas se vuelve a
la plaza o ficha que seguía en el estado. En escritorio se llega desde la franja inferior del mapa
(`GuideBar`); en móvil, donde esa franja se pelearía con la hoja y con la atribución, desde el botón de
información de la barra superior. Cada página es su propia hoja (`InfoDialog`) y lleva a las otras dos.

### Tu Zibatá (perfil local)

No hay cuentas, pero sí hay algo que es de quien usa la guía, todo en su dispositivo: **visitas**
marcadas a mano (`zibata:visitas`), **favoritos**, **notas en estrellas** y las fichas que ha abierto.
El sello del final de la barra superior (`features/profile/ProfileButton.tsx`) se llena cuando ya hay
marcas, lleva la cifra de favoritos y abre la hoja (`ProfileSheet.tsx`, en su propio trozo de JS porque
casi nunca se abre).

La hoja no es un panel de métricas ni una lista de recomendaciones, y tampoco un menú de enlaces: es
una foto del presente, para mirar. **Tu paso por Zibatá** es una frase con lo que llevas y las zonas de
la guía en insignias del color que cada plaza tiene en el mapa, llenas las estrenadas y en contorno las
que faltan; son un cuadro, no controles. **Tus tres de siempre** son los tres lugares que salen de tus
propias marcas, en cascada: estrellas, visitas, corazón, fichas abiertas, visita más reciente,
frecuencia a esa plaza y, si todo empata, orden alfabético. Ese orden es interno: en pantalla es un
podio, con el primero al centro y más alto, donde solo se ve el lugar, sus giros y su puesto. El
orden del documento sigue siendo 1, 2, 3, que es el que se lee y se recorre con el teclado; el 2, 1, 3
del podio lo pone `order` en CSS. La hoja está pensada para caber sin desplazarse, y en pantallas de
menos de 740 px de alto suelta el subtítulo y los iconos del podio para seguir cabiendo. **Lo que más se te antoja** son los tres giros donde más marcas hay,
contando solo las que se ponen a propósito (visitas, notas y corazones), nunca las fichas abiertas. Una
**visita** se marca desde la ficha ("Registrar visita"): guarda la fecha, el mismo día se puede deshacer
y a partir del siguiente se acumula. Pesa en el orden personal más que abrir una ficha, porque la pone
la persona a propósito.

Ese sello es también el sitio reservado para la cuenta el día que exista: mismo lugar, misma forma, sin
tener que rehacer la barra. En un teléfono es además el único camino hacia las páginas de información
(en escritorio está la franja del mapa), y por eso la hoja las lista todas.

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
`loadCatalog` hace lo mismo con las relaciones: descarta o corrige lo que las rompe (plaza o giro
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

## Orden personal de las listas

Las listas de una plaza y de resultados (sin texto de búsqueda) se ordenan con `rankPlaces`
(`src/features/ranking/`), una función pura:

- **Gusto.** Favoritos (+3), calificaciones (estrellas − 3) × 1,2, así que una de 1 o 2 resta, y fichas abiertas
  (log₂ de las aperturas y de las visitas marcadas, con vida media de 30 días) suman afinidad al lugar, a cada uno de sus giros, a sus categorías y un
  poco a su plaza. Un sushi que nunca abrió sube si abre mucho otro sushi.
- **Comunidad (opcional).** `rankPlaces` acepta las señales que hoy no existen (cuántas personas
  guardaron el lugar y su calificación media, con un factor de confianza por número de valoraciones) y
  pesan 0,3 como mucho: orientan, nunca mandan sobre el gusto propio. En la interfaz solo se publican
  los **corazones**; la media de estrellas ordena pero no se enseña junto al negocio, porque un promedio
  público es un arma de doble filo para un local pequeño.
- **Descubrimiento y segundas oportunidades.** Una de cada cuatro posiciones es para un lugar que no ha
  abierto nunca **o que no abre desde hace más de 60 días**, con una rotación diaria determinista: lo
  nuevo tiene sitio y lo que se descartó hace tiempo puede volver.
- **Las pastillas de categoría** también se ordenan por afinidad (`categoryAffinity`), con el orden
  curado como desempate: quien siempre busca tacos los encuentra primero.
- **Sin señales**, el orden curado de la guía, tal cual. Con texto de búsqueda manda la relevancia.
- Las señales se leen una vez por lista: marcar un favorito dentro de ella no la reordena bajo el dedo.

Las señales vienen de una `PreferenceSource` (`preferences.ts`). Hoy es local (`zibata:favoritos`,
`zibata:calificaciones`, `zibata:interacciones`, máx. 300 lugares); con cuentas y base de datos basta con
`setPreferenceSource()` hacia una API, y `rankPlaces` puede correr igual en el servidor. El historial local
viaja una vez en `localProfileSnapshot()` para no empezar de cero.

## Tipografía

Dos familias y una sola escala, ambas en `src/styles/tokens.css`. Nada de tamaños sueltos en los
componentes: si un texto necesita otro cuerpo, se elige el peldaño más cercano.

| Token | Tamaño | Dónde se usa |
| --- | --- | --- |
| `--text-2xs` | 11 px | Leyenda de la guía, versión, notas al pie |
| `--text-xs` | 12 px | Versalitas de sección (HORARIO, CONTACTO Y REDES), enlaces de la franja |
| `--text-sm` | 13 px | Metadatos, giros de la ficha, botones secundarios |
| `--text-base` | 15 px | Cuerpo: descripciones y textos de las hojas |
| `--text-md` | 17 px | Nombre del lugar en listas y tarjetas |
| `--text-lg` | 22 px | Subtítulos: nombre de plaza en la lista, estados vacíos |
| `--text-xl` | 24 px | Título de la ficha de un lugar |
| `--text-2xl` | 30 px | Título de panel y de hoja (plaza, información, tu perfil) |

- **Fraunces 600** (`--font-display`) solo en títulos: `--text-xl` y `--text-2xl`, más el nombre de la
  marca. Es ancha, así que por encima de 30 px los nombres largos empiezan a partirse en tres líneas.
- **Instrument Sans** (`--font-sans`) en todo lo demás: 400 para cuerpo, 500 para datos, 600 para
  etiquetas y botones, 700 para cifras.
- Las versalitas llevan `letter-spacing: 0.08em`; los títulos, `-0.015em`.
- Cifras que se comparan en columna (horarios, conteos) con `font-variant-numeric: tabular-nums`.

## Idioma

Los textos de interfaz viven en `src/i18n/<locale>.ts` y TypeScript exige que cada catálogo tenga todas
las claves (`satisfies Messages`), así que no se publica media traducción. El idioma activo es el
elegido a mano (se recuerda en este dispositivo), y si no, el primero del navegador que exista. Cambiarlo
con `setLocale()` avisa a `useLocale()`, que re-renderiza la interfaz desde la raíz: no hace falta
recargar ni pasar el idioma por props. Se cambia desde `LocaleSwitch`, en la barra superior: un botón
que nombra el idioma al que lleva, visible en cualquier vista y sin abrir nada. Los datos (nombres y descripciones de los negocios) se quedan en
el idioma en que los escribió su dueño; las categorías sí están traducidas.

## Enlaces y compartir

El estado compartible vive en el hash (`src/lib/url-state.ts`), que es lo que permite publicar en
GitHub Pages sin reescrituras: `#/lugar/<slug>`, `#/plaza/<slug>` y `#/info/<tema>`, con la
categoría activa como parámetro.

El botón de compartir de la ficha (`src/lib/share.ts`) **no** comparte el hash de la vista: arma la
URL canónica del lugar, sin la categoría ni ningún otro estado. Si la compartiera tal cual, el mismo
local daría una URL distinta por cada filtro desde el que alguien lo compartiera, y los enlaces
entrantes se repartirían entre todas. La raíz sale de `SITE_URL` cuando se compiló con ella, para
que compartir desde github.io y desde el dominio propio produzca el mismo enlace.

Lo que esto **no** resuelve, para no darlo por hecho: los rastreadores no indexan fragmentos, así que
`#/lugar/tomassa` es para Google la misma URL que la portada, y la vista previa de un enlace
compartido es siempre la de Open Graph de `index.html`, porque los rastreadores de los chats no
ejecutan JavaScript. Que cada ficha se indexe y previsualice por separado depende de sacar el
enrutado del hash, que está planteado en [MARCA.md](MARCA.md) §6.

Compartir usa la hoja del sistema (`navigator.share`) cuando existe y el portapapeles cuando no. Si
el navegador no trae ninguna de las dos, el botón no se dibuja.

## Rendimiento

- Chunk principal ~108 KB gzip; MapLibre (~284 KB gzip) en un chunk aparte que empieza a descargarse en
  paralelo a los datos. `npm run perf:budget` falla si el build supera el presupuesto acordado.
- PMTiles por rangos HTTP: solo se descargan las teselas visibles (~200 KB en la vista inicial).
- Edificios con altura progresiva por zoom y un único estilo sin reconstrucciones: hover y selección usan
  feature-state.
- Imágenes AVIF/WebP con `srcset`, `loading="lazy"`, `aspect-ratio` y color de relleno.
- Búsqueda en memoria con consulta diferida (`useDeferredValue`) y caché de la última consulta.
- Un único reloj compartido actualiza el estado "abierto/cerrado" de todas las tarjetas.

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
recursos de terceros. Los enlaces externos usan `rel="noopener noreferrer"`. Los favoritos, las calificaciones,
las fichas abiertas (para el orden personal), el idioma elegido y el tutorial usan almacenamiento local
del navegador; no hay analítica ni rastreo, y la ubicación solo se pide tras una
acción explícita y nunca se guarda ni se envía. Detalle en [SEGURIDAD.md](SEGURIDAD.md).
