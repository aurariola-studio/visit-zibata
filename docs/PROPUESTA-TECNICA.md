# Propuesta técnica (Fase 0)

Resumen de la investigación previa a la implementación y de las decisiones que la guiaron. El detalle
operativo vive en [PIPELINE-GIS.md](PIPELINE-GIS.md), [DATOS.md](DATOS.md) y
[ARQUITECTURA.md](ARQUITECTURA.md).

## 1. Insumos analizados

| Insumo | Hallazgo | Consecuencia |
| --- | --- | --- |
| Plano del cliente (`plano-zibata.png`, 2551×3295) | Póster generado con terraink.app a partir de OpenStreetMap, centrado en 20.6701 N / 100.3401 O. | La referencia visual y OSM comparten geometría. Georreferenciado automáticamente: **98,1 %** de coincidencia de la red vial a 3,35 m/px. |
| `Restaurantes en Zibatá.xlsx` | 104 locales, 12 plazas, 16 rubros, columna "¿Activo?". Incluye calificaciones personales. | Se importan nombre, plaza, rubro y estado. Las calificaciones y "¿He ido?" **no** se usan (el producto no tiene reseñas). |
| OpenStreetMap (Overpass, 14-sep-2026) | ~4 000 vialidades, usos de suelo, parques, agua y nombres. Solo 28 edificios. | Vialidades, verdes, agua y etiquetas salen de OSM. |
| Overture Maps (release 2026-08-19.0) | 14 402 huellas de edificios (Microsoft ML, Google Open Buildings, OSM) sin alturas; 1 030 POIs. | Edificios 3D desde Overture con alturas estimadas; POIs usados solo para **ubicar** plazas. |

## 2. Ubicación de las plazas

Ninguna plaza está trazada como tal en OSM. Se ubicaron con evidencia verificable (detalle en
`locationSource` de cada plaza):

- **Alta confianza (7):** Xentric Anáhuac, Paseo Zibatá, Condesa, Xentric Zibatá, Plaza Zielo,
  Centro Zibatá y Plaza Walmart: cúmulos de POIs con la dirección de la plaza o ubicación publicada.
- **Media (3):** Anáhuac Querétaro (campus verificado, edificio por confirmar), Campo de Golf (restaurante
  del club), Mol Jamadi (= MOL Pitahaya, Cerro del Huizache 49, frente a Parque Jamadi).
- **Baja (2):** FoodTrucks Pickleball (junto a Paseo Zibatá según Pick Spot) y Distrito Nandú (junto a
  Parque Nandú, proyecto en desarrollo). **Conviene verificarlas en campo.**

Plaza Walmart y Distrito Nandú quedan inactivas porque ninguno de sus locales está marcado como activo.

## 3. Decisiones de arquitectura

1. **Sitio 100 % estático** (React + TypeScript + Vite). Sin backend, cuentas ni claves.
2. **MapLibre GL JS 6** como motor del mapa, con estilo propio. Sin servidores de mapas externos:
   Google Maps solo se abre como enlace "Cómo llegar".
3. **Datos geográficos por tamaño:** capas base (edificios, calles, verdes, agua, etiquetas) en un único
   **PMTiles** de 1,6 MB servido por rangos HTTP; la vista inicial descarga ~200 KB. Edificios de plazas
   (interactivos) en un **GeoJSON** de 8 KB.
4. **Pipeline GIS en Node/TypeScript**, ejecutado solo al preparar datos: descarga (Overpass, DuckDB sobre
   GeoParquet de Overture), clasificación, contorno de Zibatá, alturas, asociación edificio→plaza, teselado
   (geojson-vt + vt-pbf) y escritor PMTiles propio verificado contra el lector oficial.
5. **Datos comerciales en JSON** separados del código, validados con Zod en build y en runtime, detrás de
   una interfaz `PlacesRepository` (hoy `StaticPlacesRepository`).
6. **Tipografía en el mapa sin glifos PBF:** MapLibre 6.7+ admite `font-faces`; el mapa usa los mismos
   archivos Instrument Sans / Serif que la interfaz.
7. **GitHub Pages** con base configurable (`BASE_PATH`) y rutas en hash (`#/plaza/…`), que no fallan al
   recargar. Portable a cualquier hosting estático.

## 4. Limitaciones conocidas de las fuentes

- Overture/ML no trae alturas: se estiman por tipo y superficie (documentado en
  `scripts/map/lib/classify.ts`). Algunas construcciones recientes no tienen huella; para plazas sin huella
  se genera un volumen a partir de su geometría.
- Horarios, descripciones, teléfonos, enlaces y fotografías no existen en los datos del cliente: la
  estructura los soporta y la interfaz los muestra en cuanto se capturan. No se inventan.
- GitHub Pages sirve con caché de 10 minutos y no permite cabeceras personalizadas; es suficiente para el MVP.
