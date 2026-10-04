# Metodología de la investigación de datos

Fecha de ejecución: **2026-09-14** · versión del dataset **2026.09.14**.

Objetivo: sustituir la lista beta del propietario ("Restaurantes en Zibatá.xlsx", 12 plazas y 104 locales) por
la mejor representación verificable, a esa fecha, de los lugares de comida y bebida que operan dentro de Zibatá.

## 1. Alcance geográfico

Solo se incluyen establecimientos físicamente dentro de Zibatá (El Marqués, Querétaro, C. P. 76269): plazas
sobre Av. Paseo de las Pitahayas, Paseo Tunas, Cerro del Huizache y Circuito Universidades dentro del
desarrollo, el campus de la Universidad Anáhuac y el club de golf. La cercanía no basta: Zákia, El Refugio,
Juriquilla, La Pradera y otras colonias quedan fuera aunque estén a minutos (por ejemplo, Corazón de Maíz,
en El Refugio, se rechazó). Cada registro lleva `withinZibata: true | false | "uncertain"`.

## 2. Fuentes y jerarquía

| Nivel | Tipo | Ejemplos usados |
| --- | --- | --- |
| 1 | Primarias | Directorios oficiales de plaza (xentriczibata.com, paseozibata.mx), webs y localizadores oficiales (Tim Hortons, Cafele, Pizca de Azúcar, Los Tarascos, Ñam Ñam), desarrolladores (webuild.mx, zibata.com, Atlas Desarrollos), club de golf |
| 2 | Canales directos del negocio | Instagram, Facebook y TikTok oficiales; páginas propias de pedidos (ola.click, Wansoft) |
| 3 | Secundarias | Directorios locales (Zibata Digital, zibatahoy.com), Restaurant Guru, Tripadvisor, plataformas de delivery (Rappi, Uber Eats, DiDi Food), medios |
| 4 | Apoyo | Publicaciones de usuarios, agregadores |

Reglas de uso:

- Una fuente de nivel 3–4 nunca basta por sí sola para publicar un lugar.
- **Google Maps y Google Business Profile** se vieron solo como resultados de búsqueda. No se abrieron,
  descargaron ni extrajeron fichas, fotos o reseñas, y el sitio no depende de Google Places.
- Sin scraping: consultas individuales con el buscador web y lectura puntual de páginas públicas.
- Instagram y Facebook no son legibles sin sesión. Sus publicaciones se usaron por título y URL. Cuando la
  URL es de una publicación, su **fecha se obtiene del identificador público**
  (`scripts/research/post-date.ts`): en TikTok, 32 bits altos = segundos Unix; en Instagram, el shortcode
  codifica milisegundos desde el epoch de la plataforma.
- Los resúmenes automáticos del buscador pueden mezclar datos. Horarios y teléfonos que solo aparecen ahí
  quedan como nota ("sin confirmar") y no se publican.
- Las fechas de publicación de fichas en directorios locales (p. ej., Zibata Digital) son señales de
  vigencia débiles: indican que alguien publicó la ficha, no que se visitó el lugar.

## 3. Proceso

1. **Proyecto y esquema** (fase 1): datos en `data/commercial/*.json` validados por Zod
   (`src/data/schemas.ts`) y por `validateRelations`; la UI solo muestra locales activos de plazas activas.
2. **Beta** (fases 2–3): copia íntegra en `data/research/beta/` y una búsqueda por cada uno de los 104
   registros, activos o no.
3. **Plazas** (fases 4–5): búsqueda de plazas y desarrollos; lectura de directorios oficiales; verificación
   de dirección, nombre y pertenencia a Zibatá.
4. **Categorías, aperturas y cierres** (fases 6–8): búsquedas por categoría y término ("cafetería nueva
   Zibatá 2026", "inauguración", "cerró"…) y en guías y directorios locales.
5. **Deduplicación** (fase 9): nombres traducidos o con sufijo de sucursal (Estación Boba = Boba Station),
   renombres (Margaritas Restaurante Bar → Bistró Margaritas by Kaos) y sustituciones en el mismo local y
   teléfono (Piotl Rosticería → Ichos).
6. **Validación y decisión** (fases 10–14): cada candidato recibe estado, confianza, confianza de plaza y
   motivo en `research/decisions.json`. La evidencia se registra durante la búsqueda en
   `research/log/businesses.jsonl` y `research/log/sources.jsonl`.
7. **Generación e integración** (fases 15–18): `node scripts/research/build-dataset.ts` fusiona decisiones y
   evidencia y escribe el dataset de producción validado con los esquemas y relaciones de la app, el CSV de
   importación y los entregables. Después: `npm run check`, E2E en raíz y en subruta de GitHub Pages, y
   recorridos en navegador.

## 4. Estados

| Estado | Criterio | ¿Se publica? |
| --- | --- | --- |
| `active` | Canal oficial del negocio o directorio oficial de la plaza **y** al menos una señal fechada en los últimos 12 meses (desde 2025-09-14), o dos fuentes independientes fechadas en ese periodo; ubicación corroborada | Sí |
| `likely_active` | Evidencia específica de la sucursal (oficial, o dos fuentes independientes, al menos una no de delivery) sin señal fechada reciente y sin indicios de cierre | Sí |
| `uncertain` | Solo plataformas de delivery o una fuente secundaria; contradicciones; sin resultados; o última evidencia muy antigua | No |
| `closed` | Evidencia explícita de cierre, o lista oficial de sucursales que la omite más cierre en plataforma | No |
| `removed` | Sustituido por otro negocio en el mismo local | No |
| `duplicate` | Mismo negocio registrado con otro nombre | No |
| `rejected` | Fuera de Zibatá, no es comida/bebida, supermercado, marca virtual o sin nombre comercial | No |
| `coming_soon` | Apertura anunciada, no confirmada | No |

"Solo delivery" significa que la única evidencia de la sucursal son tiendas en Rappi, Uber Eats o DiDi. Esas
tiendas suelen seguir listadas tras un cierre, por eso esos casos quedan `uncertain`.

## 5. Confianza

- `confidence` (existencia y operación): **high** = fuente oficial específica + corroboración independiente
  coherente; **medium** = dos fuentes independientes coherentes o una oficial sin corroboración;
  **low** = evidencia parcial.
- `plazaConfidence`: **high** = directorio oficial o página oficial de la sucursal que nombra la plaza;
  **medium** = dirección o plaza en dos fuentes, o una fuente más el beta; **low** = plaza tomada del beta sin
  corroboración (se conserva la hipótesis del propietario, marcada para verificación presencial).

## 6. Qué se publica y cómo

- `data/commercial/places.json` contiene **solo** `active` y `likely_active`. Cada local incluye
  `verification` (estado, confianza, `lastVerifiedAt` y URLs de fuentes). El validador avisa si un local
  activo no la tiene y da error si su estado no es publicable.
- Nombre comercial actual, sin sufijos de sucursal ("Sushi Itto", no "Sushi Itto Xentric Anáhuac"). Los ids
  del beta se conservan aunque cambie el nombre, para no romper enlaces.
- Descripciones cortas y factuales, sintetizadas de las fuentes, sin lenguaje publicitario. Sin descripción
  verificable → `null`.
- Horarios, teléfonos y números de local solo con fuente oficial o dos fuentes coincidentes. Horarios en
  conflicto o ambiguos no se estructuran.
- Sin coordenadas propias por local (ninguna fuente permitida las da con precisión verificable): la app usa
  las de la plaza. Sin fotos (ninguna con licencia compatible).
- El resto de registros se conserva con su evidencia en `data/research/` (`closed`, `uncertain`,
  `rejected`, `coming-soon`) y en `research/business-audit.json`.

## 7. Limitaciones

- Sin visitas presenciales ni llamadas: la operación real de los `likely_active` no se comprobó en sitio.
- Instagram y Facebook no se leyeron por dentro (requieren sesión). Algunas webs oficiales no eran legibles
  (JavaScript, 403, dominios caídos).
- El buscador web es de EE. UU.; la cobertura de negocios pequeños sin presencia web es menor.
- Los directorios oficiales de plaza no tienen fecha y están incompletos (el de Paseo Zibatá omite negocios
  con web oficial propia).

## 8. Cómo repetir la investigación

1. Copiar el dataset vigente a `data/research/beta/` (será la nueva línea base) y fijar `researchDate` y
   `datasetVersion` en `research/decisions.json`.
2. Por cada registro y cada plaza, repetir búsquedas (nombre + "Zibatá", plaza, categoría) y revisar los
   directorios oficiales; añadir cada hallazgo a `research/log/businesses.jsonl` con URL, nivel, tipo,
   `sourceDate` (usar `node scripts/research/post-date.ts <url>` para publicaciones) y qué respalda.
3. Buscar aperturas y cierres del periodo ("apertura", "inauguración", "cerrado permanentemente") y
   revisar los inciertos de `data/research/uncertain.json`: son los primeros candidatos a cambiar.
4. Actualizar `research/decisions.json` aplicando las reglas de las secciones 4–6.
5. `node scripts/research/build-dataset.ts`, `npm run check` y `npm run test:e2e`.
6. Comparar versiones con `research/beta-vs-verified.csv` y `research/metrics.json`.

Para cambios puntuales entre investigaciones (un local nuevo o un horario) sigue valiendo el CSV
(`npm run data:import`): la columna `id` conserva los identificadores y la verificación existente.
