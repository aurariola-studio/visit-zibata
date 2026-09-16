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

**Limitación aceptada:** sin trabajo de campo ni una fuente con alturas medidas, la silueta 3D es
verosímil pero aproximada. No debe usarse para nada que dependa de la altura real de un edificio.

## Volúmenes de plaza generados

Cinco plazas llevan un volumen generado a partir de su propio polígono (escala y altura en
`config.json → buildings.plazaSynthetic`). El motivo de cada una queda registrado en el manifiesto
(`outputs → plaza-buildings.geojson → synthesisDetail`):

- **Sin huellas abiertas dentro de la plaza** (Overture no publica ninguna): `foodtrucks-pickleball`,
  `distrito-nandu` (ambas inactivas en la guía).
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

- El pipeline **omite los rótulos a menos de 130 m de una plaza activa** (la plaza ya se nombra en su
  marcador). Se probó con 250 m y se descartó: borraba los nombres de los residenciales del entorno.
- La colocación de marcadores (`PlazaMarkers.tsx`) reserva el espacio de la barra superior, la hoja y los
  controles, prueba variantes (nombre, compacto, elevado) y agrupa en "+N" lo que no cabe. Pulsar "+N"
  acerca la cámara por pasos mientras queden plazas ocultas y el grupo siga cabiendo en el área libre.
- El marcador con foco de teclado nunca se oculta, para no perder el foco mientras la cámara se mueve.

## Cámara

- Vista inicial: encuadre de las plazas activas con `pitch` 55° (50° en móvil) y zoom máximo 15,2.
- **Rumbo:** el eje largo de Zibatá se gira a vertical (−80°) solo cuando el área libre es más alta que
  ancha. Un teléfono en horizontal usa el rumbo de escritorio (−10°), porque su área libre es apaisada.
- El *padding* del mapa se calcula midiendo la barra superior real y la hoja: los marcadores nunca quedan
  bajo la interfaz.

## Fidelidad respecto al plano del cliente

Comparación independiente (render de solo vialidades contra el plano georreferenciado, binarizados):

| Tolerancia | Vialidades dibujadas que caen sobre el plano | Plano cubierto por el render |
| --- | --- | --- |
| 2 px ≈ 11 m | 96,1 % | 88,5 % |
| 4 px ≈ 22 m | 96,7 % | 95,7 % |

La diferencia restante corresponde sobre todo a calles del plano aún no cartografiadas en OSM.
