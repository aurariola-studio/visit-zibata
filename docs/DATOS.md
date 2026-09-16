# Datos comerciales

Los datos viven en `data/commercial/` y están separados del código. Tras cualquier cambio ejecuta:

```bash
npm run data:validate          # añade -- --fix para recalcular placeIds y categories de las plazas
```

La validación también corre antes de cada build y en CI: un error detiene la publicación.
Los archivos declaran `$schema`, así que VS Code autocompleta y marca errores al editarlos.

| Archivo | Contenido |
| --- | --- |
| `categories.json` | Taxonomía: categorías, subcategorías, iconos y sinónimos de búsqueda. |
| `plazas.json` | Plazas: nombre, descripción, dirección, coordenadas, geometría, estado y procedencia. |
| `places.json` | Locales (establecimientos). |
| `imports/restaurantes-zibata.csv` | Hoja de importación equivalente al dataset verificado (con `id`). |
| `schemas/*.schema.json` | Generados por `data:validate`; no editar. |

> Los datos vigentes provienen de la investigación del 2026-09-14 ([research/](../research/methodology.md)), que
> auditó y sustituyó la lista beta «Restaurantes en Zibatá.xlsx» (archivada en `data/research/beta/`).
> `places.json` solo contiene lugares con estado `active` o `likely_active`; los cerrados, inciertos,
> rechazados y próximos se conservan con su evidencia en `data/research/`. No se inventan datos:
> descripciones, horarios, teléfonos y enlaces solo figuran cuando hay fuente.

## Qué contenido hay hoy (2026-09-15)

| Dato | Cobertura | Por qué |
| --- | --- | --- |
| Nombre, plaza, categoría, estado | 76/76 | Base de la guía; cada registro con fuente y fecha |
| Descripción | 75/76 | Solo cuando la fuente describe el negocio |
| Subcategoría | 45/76 | Ver el criterio más abajo |
| Enlaces (web o redes) | 65/76 | Perfil oficial verificado |
| Teléfono | 10/76 | Solo si la fuente oficial lo publica |
| WhatsApp | 1/76 | Ídem |
| Horario | 3/76 | Casi ningún negocio publica horarios en su propio sitio |
| Fotografías | 0/76 | Sin fotos con licencia propia; se usa una ilustración por categoría |

Esa cobertura es un límite de las fuentes públicas, no un pendiente de captura: las fichas de directorios y
mapas comerciales que sí traen horarios derivan de Google, cuya API y cuyo contenido este proyecto no usa
(ver [SEGURIDAD.md](SEGURIDAD.md) y las reglas de [AGENTS.md](../AGENTS.md)). Cuando el negocio publique sus
horarios en su propio sitio o red social, se añaden con la fuente en `research/decisions.json`.

### Criterio de subcategoría

Se asigna **solo si la evidencia lo sostiene** (nombre, descripción o carta de la fuente oficial). Ejemplos:
«Masaru Sushi & Beer» → `sushi`; «Panadería Santa Fe» → `panaderia`. No se asigna cuando la categoría ya
describe al negocio o cuando la especialidad no está documentada: una cafetería de cadena no se marca como
`cafe-de-especialidad` solo por ser cafetería. Los 31 locales sin subcategoría lo están por esa regla, no
por falta de revisión. La búsqueda funciona igual: encuentra por categoría, subcategoría, sinónimos,
nombre, plaza, etiquetas y descripción.

## Actualizar la investigación

Las decisiones por registro viven en `research/decisions.json` y la evidencia en `research/log/*.jsonl`.
`node scripts/research/build-dataset.ts` regenera `places.json`, `plazas.json`, `categories.json`, el CSV y los
entregables de auditoría. El procedimiento completo y las reglas de estado y confianza están en
[research/methodology.md](../research/methodology.md).

## Agregar o actualizar locales desde CSV (recomendado para cargas grandes)

1. Copia `imports/restaurantes-zibata.csv` o crea uno con estas columnas (UTF-8, con encabezado):

   `id, name, plaza, category, subcategory, localNumber, description, hours, lat, lng, googleMapsUri, website, instagram, facebook, tiktok, whatsapp, phone, tags, active`

2. Ejecuta `npm run data:import -- data/commercial/imports/mi-archivo.csv` (añade `--dry-run` para probar).

Reglas:

- `plaza` y `category` aceptan el nombre visible («Paseo Zibatá», «Tacos y antojitos») o el id.
  Sin categoría → `otros` (con aviso).
- `active`: `sí`/`no` (también `true`/`false`, `1`/`0`, `✔`). Vacío = inactivo.
- `hours`: texto compacto, p. ej. `lun-vie 08:00-22:00; sab,dom 09:00-14:00, 17:00-23:00; mie cerrado`.
  También `diario 13-2` (cruza medianoche) y `nota: Cocina cierra 30 min antes`.
- `whatsapp` / `phone`: 10 dígitos se interpretan como México (+52).
- `instagram` / `tiktok` / `facebook`: URL completa o `@usuario`.
- `tags`: separados por `|` (por ejemplo `terraza|pet friendly`).
- `id` (opcional) conserva el identificador aunque cambie el nombre. Si falta, se genera del nombre
  (`D’Lu Coffee & Bakery` → `dlu-coffee-bakery`) y, si el nombre se repite en otra plaza, se añade la plaza.
- Reimportar actualiza los locales existentes con las columnas no vacías y conserva lo demás (fotos, tags,
  `verification`). Un local nuevo importado sin `verification` genera un aviso de validación hasta añadir sus
  fuentes (ver abajo).

## Editar un local a mano (`places.json`)

```json
{
  "id": "cafe-ejemplo",
  "slug": "cafe-ejemplo",
  "name": "Café Ejemplo",
  "plazaId": "paseo-zibata",
  "category": "desayunos-y-cafe",
  "subcategory": "cafe-de-especialidad",
  "description": "Café de especialidad y panadería de masa madre.",
  "localNumber": "12",
  "hours": { "mon": ["08:00-20:00"], "tue": ["08:00-20:00"], "sun": [], "note": "Horario de verano" },
  "location": { "lat": 20.67935, "lng": -100.31497 },
  "googleMapsUri": null,
  "googlePlaceId": null,
  "phone": "+524421234567",
  "photos": [],
  "links": {
    "website": "https://cafeejemplo.mx",
    "instagram": "https://www.instagram.com/cafeejemplo/",
    "facebook": null,
    "tiktok": null,
    "whatsapp": "+524421234567"
  },
  "tags": ["terraza"],
  "active": true,
  "verification": {
    "status": "likely_active",
    "confidence": "medium",
    "lastVerifiedAt": "2026-09-14",
    "sources": ["https://www.instagram.com/cafeejemplo/"]
  }
}
```

- Solo se muestran los campos con valor: nunca aparecen botones vacíos.
- `active: false` oculta el local sin borrarlo (útil para cierres temporales).
- `verification`: estado de la investigación (`active` o `likely_active` para publicarse), confianza
  (`high`/`medium`/`low`), fecha de la última verificación y URLs de las fuentes. Un local activo sin
  `verification` produce un aviso; con un estado no publicable (`closed`, `uncertain`…), un error.
- Tras añadir o quitar locales: `npm run data:validate -- --fix` para sincronizar la plaza.

### Horarios

Cada día (`mon`…`sun`) es una lista de rangos `"HH:MM-HH:MM"` en hora de Querétaro:

- Día ausente → sin información (no se muestra).
- Lista vacía `[]` → cerrado ese día.
- Varios turnos → `["08:00-14:00", "17:00-22:00"]`; cruzar medianoche → `["18:00-02:00"]`.

La tarjeta muestra «Abierto · Cierra a las 22:00» y la ficha agrupa días iguales («Lun–Vie 08:00–22:00»).

### Google Maps («Cómo llegar»)

El botón abre Google Maps en una pestaña nueva (Google no se usa para mostrar el mapa ni datos). Orden de
preferencia:

1. `googleMapsUri` (enlace de Google Maps del negocio) tal cual.
2. Indicaciones a `location` del local, con `googlePlaceId` si existe.
3. Indicaciones a las coordenadas de su plaza (siempre disponibles).

## Fotografías

Solo fotos propias, aportadas por el negocio o con licencia adecuada. **Nunca** descargarlas de Google
Places, Google Maps ni redes sociales.

1. Coloca los originales en `data/commercial/photos-src/<id-del-lugar>/` (no se versionan).
   Opcional: `foto.txt` junto a `foto.jpg` con el texto alternativo en la primera línea y el crédito en la segunda.
2. Ejecuta `npm run images:optimize` (o `-- --place <id>`).
3. Se generan WebP y AVIF (máx. 1600 px) con variantes de 480 px (miniatura) y 960 px en
   `public/images/places/<id>/`, y se registran en `places.json` con dimensiones y color de relleno.

Sin fotos, la interfaz muestra una ilustración de la categoría (claramente una ilustración, no una foto).

## Plazas (`plazas.json`)

Campos: `id`, `slug`, `name`, `description`, `address`, `coordinates`, `geometry` (Polygon o MultiPolygon),
`active`, `placeIds` y `categories` (derivados, se recalculan con `--fix`), `locationConfidence`
(`high`/`medium`/`low`), `locationSource` (evidencia de la ubicación) y `verification` (como en los locales).

Para agregar una plaza:

1. Obtén sus coordenadas y geometría (ver [PIPELINE-GIS.md](PIPELINE-GIS.md#añadir-o-corregir-la-geometría-de-una-plaza)).
2. Añádela con `placeIds: []` y `categories: []`.
3. Importa o crea sus locales y ejecuta `npm run data:validate -- --fix`.
4. Ejecuta `npm run map:build` para asociar sus edificios en 3D.

Una plaza con `active: false` no aparece como interactiva en el mapa ni en los filtros.

## Categorías (`categories.json`)

Se pueden renombrar, reordenar (`order`), añadir o cambiar de icono sin tocar componentes.

- `icon`: uno de `coffee`, `chef-hat`, `taco`, `fish`, `beef`, `hamburger`, `pizza`, `pasta`, `chopsticks`,
  `salad`, `sandwich`, `drumstick`, `utensils`, `ice-cream`, `cup-soda`, `beer`, `utensils-crossed`
  (un nombre desconocido usa un icono genérico). Se amplían en `src/components/icons/CategoryIcon.tsx`.
- `synonyms`: palabras con las que la búsqueda encuentra la categoría («coffee», «nieve», «boba»…).
- Las categorías sin locales activos no aparecen en los filtros.
- Si cambias el `id` de una categoría, actualiza los locales que la usan (la validación te avisará).
