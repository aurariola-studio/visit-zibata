# Mapa: decisiones cartográficas

Cómo se construye y se dibuja el mapa 3D, y por qué. El *cómo ejecutarlo* está en
[PIPELINE-GIS.md](PIPELINE-GIS.md); las licencias de los datos, en [LICENCIAS.md](LICENCIAS.md).

## Qué se dibuja

| Capa | Origen | Notas |
| --- | --- | --- |
| Contorno de Zibatá | Envolvente cóncava de la red vial de OSM sobre el polígono semilla | `config.json → zibataSeedPolygon` |
| Vialidades | OpenStreetMap (Overpass) | Clasificadas en `scripts/map/lib/classify.ts` |
| Usos de suelo, agua | OpenStreetMap | Parques, golf, escuelas, comercio |
| Edificios | Overture Maps (agrega OSM, Microsoft ML y Google Open Buildings) | Volumen 3D (`fill-extrusion`) |
| Edificios de plazas | Overture + geometría de `plazas.json` | Capa propia e interactiva (`public/map/plaza-buildings.geojson`) |
| Etiquetas de lugares | OpenStreetMap | Parques, golf, residenciales, escuelas, hitos |

Todo el procesamiento GIS ocurre en `scripts/map` (Node) y se publica como PMTiles + GeoJSON. El navegador
no calcula geometría: solo dibuja.

## Alturas de los edificios

En la extracción de Overture usada (release 2026-08-19.0) **ninguna de las 14 402 huellas trae altura
medida** y solo 5 declaran número de niveles. Es decir: **las alturas del mapa son estimaciones**, no
mediciones, y así se declara en `data/geographic/manifest.json` y en este documento.

Prioridad de la estimación (`estimateHeight`):

1. `height` de la fuente, si existe.
2. `num_floors` × 3,2 m + 0,6 m.
3. Heurística por tipo y superficie (vivienda, comercio, educación, otros) con una variación determinista
   derivada del identificador del edificio (hash FNV-1a) y redondeo a 0,1 m.

La variación determinista evita el aspecto de "todo igual" sin alterar la realidad: Zibatá es un
fraccionamiento con vivienda repetida, así que las alturas *son* parecidas entre sí. Con este método el
mapa pasó de 13 a 59 valores de altura distintos. El resultado es estable entre compilaciones (el mismo
identificador da siempre la misma altura), lo que mantiene el PMTiles reproducible byte a byte.

**Suelo planeado sin calles todavía:** el contorno se calcula a partir de la red vial existente, así que
la expansión del Master Plan (la zona norte donde irá Town Center) no entra sola. `config.json` acepta
`boundaryExtensions`: polígonos con su procedencia que se suman al contorno.

`npm run map:masterplan -- --source <captura.png>` genera esa entrada a partir del contorno del Master Plan
que aporta el propietario (una captura de mapa con el polígono del desarrollo pintado en color plano). La
captura se **georreferencia sola contra las vías de OpenStreetMap** ·dos anclas aproximadas y después la
escala y el desplazamiento con los que la 540, la 57D y las avenidas de OSM caen sobre las vías de la
imagen; el comando imprime la coincidencia (hoy 88 %) y se niega a seguir por debajo del 80 %· y su borde se
traza y simplifica a ~10 m. Nadie dibuja vértices a mano. La captura no se versiona (lleva cartografía de
terceros); se versiona el polígono con su procedencia.

El contorno final es la unión de la red vial y el Master Plan (10,3 km²): así el campus Anáhuac y Plaza Loop,
que el polígono del desarrollo deja justo fuera, siguen dentro, y el terreno entre la QRO 540 y el brazo
norte del desarrollo (al oriente del Ejido San Vicente), que no es Zibatá, queda fuera. La versión anterior
rellenaba toda la cuña entre la 57D y la 540 e incluía ese romboide.

**Limitación aceptada:** sin trabajo de campo ni una fuente con alturas medidas, la silueta 3D es
verosímil pero aproximada. No debe usarse para nada que dependa de la altura real de un edificio.

## Árboles

Zibatá es muy verde, pero OpenStreetMap no tiene ni un árbol mapeado en la zona (ni `natural=tree` ni
bosques). La única fuente abierta que dice **dónde** hay arbolado es la cobertura de suelo de Overture
(`land_cover`, subtipo `forest`), que deriva de ESA WorldCover: clasificación de imágenes Sentinel a 10 m.
Coincide con lo que se ve en sitio: las cañadas, el corredor central y el campo de golf.

A esa cobertura se suman las **áreas verdes de OpenStreetMap** (parques, jardines, pasto y el campo de
golf), que en Zibatá están arboladas y que una clasificación de 10 m no siempre distingue; ahí la
densidad es menor (un árbol cada ~32 m, frente a ~19 m en la cañada).

`npm run map:fetch:trees` descarga la cobertura y `map:build` coloca los árboles (`scripts/map/lib/trees.ts`):
retícula con desplazamiento determinista, **descontando el radio de la copa** para que ninguna invada una
vía (el despeje depende de la clase: 14 m en la autopista, 7 m en una calle, 3 m en un andador) ni se
monte sobre un edificio. Cada árbol son tres volúmenes (tronco, copa ancha y copa estrecha) para que la
silueta sea de árbol y no de prisma; el tronco solo entra en z16 y la copa se apoya en el suelo hasta
entonces. Verdes apagados y ligeramente traslúcidos: entorno, no protagonistas.

**La posición de cada árbol es aproximada; la del arbolado, real.** Donde la fuente no ve arbolado no se
dibuja ninguno. Hoy: ~7 100 árboles, 2 093 KB de teselas (límite 2 100 KB; la tesela más pesada, que es
lo que afecta al render, son 98 KB de 140 KB).

## Volúmenes de plaza generados

Las plazas sin huella propia llevan un volumen generado a partir de su propio polígono (escala y altura en
`config.json → buildings.plazaSynthetic`). El motivo de cada una queda registrado en el manifiesto
(`outputs → plaza-buildings.geojson → synthesisDetail`):

- **Sin huellas abiertas dentro de la plaza** (Overture no publica ninguna): `foodtrucks-pickleball`,
  `distrito-nandu`, `plaza-luna`, `xenica` y `centro-medico-comercial-zibata`. Plaza Luna ya opera, pero el
  último release de Overture (2026-08-19) aún no trae su edificio: **pendiente** sustituir el volumen
  generado por la huella real en cuanto aparezca (basta con `map:fetch:buildings` + `map:build`).
- Tras añadir o mover una plaza hay que ejecutar `map:build`: una prueba
  (`scripts/map/map-assets.test.ts`) falla si alguna plaza del dataset no tiene volumen en el mapa.
- `map:build` avisa si la geometría de una plaza cruza una calle. `map:suggest-plaza` ya no centra el
  rectángulo en el punto del enlace (que suele caer en la banqueta): lo coloca del lado de la calle que no
  choca con vías ni edificios.
- **Huellas abiertas incompletas** que no representan el conjunto comercial, sustituidas a propósito
  (`replaceExisting`): `paseo-zibata`, `xentric-zibata`, `campo-de-golf`.

No hay huellas mejores disponibles en fuentes abiertas (OSM, Microsoft y Google llegan vía Overture). Si
en el futuro aparecen, basta con quitar `replaceExisting` y reconstruir.

## Teselas

- MVT (geojson-vt, extent 4096, tolerancia 3) empaquetadas en PMTiles v3, z12–z16, gzip.
- **Edificios desde z13**, pero en z13 solo las huellas ≥ 60 m²: a esa escala las casetas y los fragmentos
  no se distinguen y encarecían la primera vista en móvil (z13 pasó de 300,9 a 230,6 KB, −23 %; la tesela
  mayor, de 130 a 95 KB).
- El archivo completo pesa ~1,6 MB y se sirve por rangos HTTP: el navegador descarga solo las teselas que
  necesita. El hosting debe admitir `Range` (GitHub Pages lo hace).

## Rótulos y marcadores

Los marcadores de plaza son DOM (botones accesibles), no símbolos del mapa: por eso el estilo no puede
evitar por sí solo que un rótulo del mapa quede debajo de uno.

- Los nombres se rotulan con **capital inicial** aunque OSM los guarde en mayúsculas ("PARQUE NANDÚ" →
  "Parque Nandú", `displayName()` en `scripts/map/lib/classify.ts`). Un nombre que ya trae minúsculas se
  respeta tal cual: sus mayúsculas son intencionadas (siglas, marcas).
- El pipeline **omite los rótulos a menos de 130 m de una plaza activa** (la plaza ya se nombra en su
  marcador). Se probó con 250 m y se descartó: borraba los nombres de los residenciales del entorno.
- La colocación de marcadores (`PlazaMarkers.tsx`) reserva el espacio de la barra superior, la hoja y los
  controles, y prueba variantes en orden de calidad: nombre + cifra, solo la cifra, etiqueta elevada con
  el tallo más largo y, como último recurso, **un punto pulsable de 24 px** con el color de la plaza. Así
  ninguna plaza desaparece del mapa por falta de sitio; el punto conserva su nombre en `aria-label`.
- Un punto puede quedar sobre el borde de una etiqueta vecina (va por encima para poder pulsarlo), pero
  nunca sobre otro punto.
- Lo único que se oculta es la plaza cuyo punto cae fuera de la franja libre (detrás del panel), y las
  que no caben cuando esa franja es mínima: un teléfono en horizontal deja poco más de 100 px de mapa
  entre la barra y la hoja, donde no entran diez marcadores ni reducidos a un punto. Esas plazas se
  alcanzan por el selector de plazas o por la lista.
- El marcador con foco de teclado nunca se oculta, para no perder el foco mientras la cámara se mueve.

## Color

Dos dimensiones, cada una donde responde a la pregunta del usuario (`src/config/palette.ts`):

- **Mapa: un tono por plaza.** El suelo, el volumen y el marcador de cada plaza comparten color, y el
  panel de esa plaza lo repite en su antetítulo: al abrirlo se reconoce de dónde viene. Los estados
  (cursor encima, seleccionada) se derivan del mismo tono aclarándolo u oscureciéndolo, en vez de volver
  todas al verde de marca. Las plazas sin lugares publicados quedan en arena, sin identidad.
- **Listas y fichas: un tono por categoría.** Responde a "¿qué tipo de comida es?", que es lo que se
  decide ahí. Antes el color de la placa salía de un hash del identificador: dos negocios de la misma
  categoría podían salir uno verde y otro café sin significar nada.

Las dos familias se generan desde HSL para que nunca parezca que una plaza y una categoría "comparten"
color, que no significaría nada: **la plaza usa color pleno** (saturación media-alta, siempre en una
forma sólida: suelo y volumen del mapa, rombo, punto del marcador) y **la categoría un tinte muy claro**
con el icono en tinta oscura. Una prueba comprueba que cualquier tinte de categoría es más claro que
cualquier superficie de plaza.

El tono de cada categoría vive en los datos (`hue` en `research/taxonomy.json`), no en el código: añadir
una categoría no obliga a tocar la paleta, y una sin tono usa el neutro. Los de plaza se reparten en el
orden del dataset, así que añadir una plaza al final no recolorea las demás.

## Cámara

- Vista inicial: encuadre de las plazas activas con `pitch` 55° (50° en móvil) y zoom máximo 15,2.
- **Rumbo:** el eje largo de Zibatá se gira a vertical (−80°) solo cuando el área libre es más alta que
  ancha. Un teléfono en horizontal usa el rumbo de escritorio (−10°), porque su área libre es apaisada.
- El *padding* del mapa se calcula midiendo la barra superior real y la hoja, y reserva también la
  columna de controles del borde derecho: los marcadores nunca quedan bajo la interfaz.
- El margen inferior del encuadre general es mayor que el superior: `fitBounds` calcula sobre el plano,
  sin la inclinación, y con ella los puntos cercanos (los de abajo) caen más bajo de lo previsto.
- **Límites de exploración:** el **centro de la pantalla** no sale del contorno real de Zibatá más ~440 m
  (`MAP_LIMITS.centerBounds`); si un gesto lo saca, la cámara vuelve al punto más cercano al soltar. Se
  limita el centro y no el encuadre completo (`maxBounds`): con la cámara inclinada el encuadre abarca
  mucho más terreno que el área de datos, y un `maxBounds` ajustado obligaba a MapLibre a recentrar el
  mapa, lo que dejaba plazas fuera de la pantalla en los teléfonos.
- El encuadre general se calcula **sin inclinación** y después se aplica el *pitch*: una cámara inclinada
  necesita alejarse mucho más para meter el mismo terreno, y en pantallas bajas eso dejaba Zibatá
  diminuto. Al inclinar solo se ve más terreno, nunca menos.

## Fidelidad respecto al plano del cliente

Comparación independiente (render de solo vialidades contra el plano georreferenciado, binarizados):

| Tolerancia | Vialidades dibujadas que caen sobre el plano | Plano cubierto por el render |
| --- | --- | --- |
| 2 px ≈ 11 m | 96,1 % | 88,5 % |
| 4 px ≈ 22 m | 96,7 % | 95,7 % |

La diferencia restante corresponde sobre todo a calles del plano aún no cartografiadas en OSM.
