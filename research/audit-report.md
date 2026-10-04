# ZIBATÁ FOOD & DRINK DATA RESEARCH REPORT

Dataset **2026.09.14** · generado con `node scripts/research/build-dataset.ts` · detalle por registro en
[`business-audit.json`](business-audit.json), [`plaza-audit.json`](plaza-audit.json) y
[`beta-vs-verified.csv`](beta-vs-verified.csv).

## 1. Executive Summary

Se auditaron **135 candidatos**: los 104 registros de la lista beta y 31 hallados con búsquedas por plaza,
categoría, aperturas y cierres. Tras cruzar **287 URLs de evidencia**, el dataset de producción queda en
**76 locales en 9 plazas activas**:

- 15 `active` y 61 `likely_active`.
- 66 proceden del beta (corregidos) y 10 son nuevos.
- Cada uno lleva estado, confianza, fecha y fuentes.

La lista beta era una buena hipótesis de partida, pero no una fuente fiable:

- **15 de sus 76 activos no pudieron verificarse**: sin rastro, solo en Juriquilla, solo en delivery, o un
  platillo registrado como negocio ("MEZCLA").
- **5 de sus 28 inactivos siguen operando**: Honu, Ciao Bella, Los Morros de Sonora, Burger & Fries Forever
  y Sixties Burger.
- **2 plazas mal asignadas**, **31 nombres** y **10 categorías** corregidos.
- **4 negocios cerrados o sustituidos**: Mr. Bagel, Grand Antonella, Tacos El Pata y Piotl Rosticería, hoy
  Ichos.
- Tres "plazas" sin oferta real de comida: FoodTrucks Pickleball, Plaza Walmart y Distrito Nandú (en obra).

No se afirma que la lista esté completa. Sin visitas presenciales, 48 candidatos quedan **inciertos** y 9
locales publicados tienen plaza de confianza baja: son los prioritarios para verificar en campo.

## 2. Research Date

**2026-09-14** (fotografía a esa fecha). Las fuentes fechadas van del 2021 al 2026-09-08. 25 registros tienen
al menos una señal fechada en los 12 meses previos. Cada registro publicado lleva
`verification.lastVerifiedAt: 2026-09-14`.

## 3. Methodology

Resumen de [`methodology.md`](methodology.md):

1. Inspección del esquema real.
2. Copia íntegra del beta en `data/research/beta/`.
3. Búsqueda individual de cada registro y descubrimiento por plaza, categoría, aperturas y cierres.
4. Registro de la evidencia en `research/log/*.jsonl` en el momento de encontrarla.
5. Decisión documentada por registro en `decisions.json`, con reglas explícitas de estado y confianza.
6. Generación del dataset con los esquemas y validadores de la app.
7. Pruebas de integración.

Técnica destacable: la fecha de publicaciones de Instagram y TikTok se obtuvo del identificador público de
la URL, sin leer contenido restringido. Sin scraping, sin Google Places y sin descargar fotos.

## 4. Geographic Scope

Solo Zibatá (El Marqués, C. P. 76269). Se descartaron o dejaron en duda los negocios con evidencia fuera del
desarrollo:

- Corazón de Maíz (El Refugio, rechazado).
- La Lorenza (Juriquilla).
- Grünen Lush (Álamos y Juriquilla).
- Heladería once:once (Juriquilla).
- 168 Ramen (Zákia).
- Repostería Eddi Mena (dirección contradictoria).

`withinZibata` sobre los 135: 105 `true`, 29 `uncertain`, 1 `false`.

## 5. Sources

Detalle generado en [`sources.md`](sources.md).

| Nivel | Citas | Principales |
| --- | --- | --- |
| 1 · primarias | 60 | Directorios oficiales de Xentric Zibatá y Paseo Zibatá, webs y localizadores oficiales, desarrolladores, club de golf, JETRO |
| 2 · canales del negocio | 116 | Instagram, Facebook y TikTok oficiales; páginas propias de pedidos |
| 3 · secundarias | 156 | Zibata Digital (fichas 2025-12 a 2026-09), zibatahoy.com (guía del 2026-08-10), Restaurant Guru, Tripadvisor, Rappi, Uber Eats, DiDi Food |
| 4 · apoyo | 8 | Publicaciones de usuarios, agregadores |

## 6. Plaza Coverage

| Plaza | Estado | Publicados (beta activos) | Cambios |
| --- | --- | --- | --- |
| Xentric Anáhuac | active · high | 20 (24) | 7 excluidos, 2 recuperados (Ciao Bella, Los Morros de Sonora), 1 nuevo (Pizca de Azúcar) |
| Anáhuac Querétaro | likely_active · medium | 1 (2) | Solo Tim Hortons verificado (acceso al campus sin verificar) |
| Paseo Zibatá | active · high | 22 (20) | Dirección oficial n.º 501; 1 excluido (All Berries), 3 nuevos |
| FoodTrucks Pickleball | uncertain → inactiva | 0 (1) | Pick Spot no menciona food trucks |
| Plaza Condesa | active · high | 7 (7) | Renombrada; 1 excluido (La Chilakleta); recibe Burger & Fries Forever |
| Plaza Walmart | removed → inactiva | 0 (0) | Supermercado |
| Xentric Zibatá | active · high | 11 (8) | Piotl → Ichos; Kekas incierto; Honu recuperado; 4 nuevos del directorio oficial |
| Plaza Zielo | active · high | 8 (9) | 2 inciertos (El Tapatío, Los del Mandil); 1 nuevo |
| MOL Pitahaya | active · medium | 1 (1) | Antes "Mol Jamadi"; dirección Cerro del Huizache 49 |
| Zibatá Golf | likely_active · medium | 1 (1) | Antes "Campo de Golf" |
| Centro Zibatá | active · medium | 5 (3) | Dirección Pitahayas 199; 1 nuevo (Starbucks), 1 recuperado (Sixties Burger) |
| Distrito Nandú | coming_soon → inactiva | 0 (0) | En desarrollo; rendimientos desde enero de 2027 |

Plazas nuevas: **ninguna operativa**. Se identificaron 3 desarrollos no operativos: Xenica (entregas en
diciembre de 2026), Plaza Nova (preventa; pertenencia a Zibatá incierta) y Pabellón Zibatá (finales de 2026).

## 7. Business Coverage

| Estado | Total | Del beta | Nuevos |
| --- | --- | --- | --- |
| active | 15 | 14 | 1 |
| likely_active | 61 | 52 | 9 |
| uncertain | 48 | 35 | 13 |
| closed | 3 | 2 | 1 |
| removed | 1 | 1 | 0 |
| rejected | 5 | 0 | 5 |
| duplicate | 1 | 0 | 1 |
| coming_soon | 1 | 0 | 1 |
| **Total** | **135** | **104** | **31** |

Completitud de los 76 publicados:

- descripción: 75;
- enlace oficial: 65;
- subcategoría: 45 (antes 0);
- número de local: 13;
- teléfono: 9;
- horario estructurado de fuente oficial: 3 (Cafele, Pizca de Azúcar, Tim Hortons).

## 8. New Places Discovered

Publicados (10):

- Pizca de Azúcar (Xentric Anáhuac, `active`).
- En Paseo Zibatá: La Gaspachería Tradicional, Panadería Santa Fe y Tacos La Capilla.
- En Xentric Zibatá: Ichos, La Borra del Café, Quetacos y La Michoacana.
- La Borra del Café (Plaza Zielo).
- Starbucks (Centro Zibatá).

No publicados:

- **Inciertos (13):** Maiztros, Punta Cacao, Buenos Días Café, El Sazón de Nassar, Enoff, Panio, Camelato, La
  Michoacana (Xentric Anáhuac), La Rue, Soba Express, Repostería Eddi Mena, Marie Panadería Artesanal y
  Parrilla de agave.
- **Rechazados (5):** Corazón de Maíz, Spiruleka, Meet & Eat by HEB, Las Chopeaditas (marca virtual) y
  "Emprendedor" (sin nombre real).
- **Duplicado:** Estación Boba (= Boba Station).
- **Próximamente:** Andador 58.

## 9. Businesses Removed

Del dataset activo salen **15 registros que el beta daba por activos**:

- **Inciertos:**
  - La Lorenza, Loreto Taco Fish, Nutrisa y MEZCLA (posible platillo).
  - Chick In, El Edén, Mesón Cristi y Grünen Lush.
  - All Berries, Trompochtitlán, La Chilakleta y Kekas El Xavi.
  - Taquería El Tapatío y Los del Mandil.
- **Sustituido:** Piotl Rosticería (→ Ichos).

Quedan fuera también los 23 inactivos del beta que siguen sin evidencia suficiente. Nada se borró: todos
están en `data/research/` con su evidencia.

## 10. Businesses Marked Closed

| Negocio | Evidencia |
| --- | --- |
| Mr. Bagel | Restaurant Guru "Permanently closed" y anuncio de cierre indefinido; estaba en Paseo Zibatá, no en Xentric Anáhuac |
| Grand Antonella Café | Página oficial "CERRADO PERMANENTEMENTE" |
| Tacos El Pata Zibatá | La lista oficial de sucursales omite Zibatá; tienda de delivery cerrada desde 2025-07-22 |
| Piotl Rosticería (`removed`) | Su local 208 y su teléfono aparecen hoy como Ichos en el directorio oficial |

## 11. Uncertain Businesses

48, en [`data/research/uncertain.json`](../data/research/uncertain.json). Patrones:

- **Solo delivery (sin redes de sucursal ni fecha):** Koi Ramen House, Gorditas Doña Tota, El Edén, Chickin,
  Kekas Fritas el Xavi, Taquería El Tapatío, Marie Panadería y Maiztros.
- **Posible cierre:**
  - Zafrina: última evidencia de 2022.
  - Freestyle Pizza: abrió en 2022 y su subdominio ya no existe.
  - Mamba Pizza: ausente del directorio oficial.
  - Soba Express: cerrado temporalmente.
- **Sin resultados:** Loreto Taco Fish, Tlaxcalli, All Berries, Bad Doggie, Melonio, Il Diavolo, San Cosme,
  La Casa y El Ahijao'.
- **Ubicación en duda:** La Lorenza, Grünen Lush, Heladería once:once, Mesón Cristi (web con dirección en la
  CDMX), Nutrisa (Circuito Universidades), Trompochtitlán y Repostería Eddi Mena.

## 12. Category Changes

La taxonomía conserva sus 17 categorías y pasa de 24 a 27 subcategorías:

- `pollo` pasa a llamarse "Pollo y alitas" y gana la subcategoría `alitas`.
- `tacos-y-antojitos` gana `esquites-y-snacks`.
- `postres` gana `pasteleria`.

Recategorizaciones (10):

| Local | Antes | Después |
| --- | --- | --- |
| Mirrus Kitchen | Bistró | Desayunos y café |
| Sinforosa | Bistró | Desayunos y café |
| Rometta | Italiana | Bistró |
| La 880 | Bar y pub | Pollo y alitas |
| La Marmota | Hamburguesas | Pollo y alitas |
| Lion Reef | Bar y pub | Mariscos |
| Tacos Carly | Tacos y antojitos | Mariscos |
| Birria Jáuregui | Carne y parrilla | Tacos y antojitos |
| Agave Grill | Carne y parrilla | Tacos y antojitos |
| DiezyNueve (Hoyo 19) | Bistró | Bar y pub |

Las categorías sin locales (`otros`) siguen ocultas en la interfaz. Con subcategorías asignadas, "panadería",
"alitas" y "esquites" ya encuentran resultados; antes, "panadería" devolvía 0.

## 13. Location Corrections

- **Plaza:** Burger & Fries Forever pasa de Plaza Walmart a Plaza Condesa (local 111). Mr. Bagel estaba en
  Paseo Zibatá (cerrado).
- **Direcciones de plaza:**
  - Paseo Zibatá: Av. Paseo de las Pitahayas 13 → 501 (web oficial).
  - MOL Pitahaya: Av. Huizache 49 → Cerro del Huizache 49.
  - Centro Zibatá: dirección genérica → Pitahayas 199.
- **Nombres de plaza:** Condesa → Plaza Condesa; Mol Jamadi → MOL Pitahaya; Campo de Golf → Zibatá Golf.
- **Coordenadas:** no se añadieron coordenadas por local, porque ninguna fuente permitida las da con
  precisión verificable; se usan las de la plaza.

## 14. Beta vs Verified Comparison

Matriz completa de 135 filas en [`beta-vs-verified.csv`](beta-vs-verified.csv), con las columnas `betaName`,
`status`, `currentName`, `betaPlaza`, `currentPlaza`, `betaCategory`, `currentCategory`, `locationChanged`,
`statusChanged`, `nameChanged`, `categoryChanged`, `newRecord` y `notes`.

| Medida | Resultado |
| --- | --- |
| Beta activos que se confirman (publicados) | 61 de 76 (80 %) |
| Beta activos no verificables o sustituidos | 15 (20 %) |
| Beta inactivos que siguen operando | 5 de 28 |
| Beta con plaza incorrecta | 2 |
| Beta con nombre corregido | 31 |
| Beta con categoría corregida | 10 |

## 15. Data Quality

Validación técnica:

- **Validación de datos:** `npm run data:validate` da 0 errores y 0 avisos.
- **Esquemas y relaciones:** los Zod estrictos y las relaciones pasan con ids únicos, plazas, categorías,
  subcategorías y URLs `https` válidos.
- **Nuevo campo `verification`:** está presente en los 76 locales y 12 plazas. El validador avisa si un local
  activo no lo tiene y da error si su estado no es publicable (con test unitario).
- **Estructura:** sin coordenadas fuera del área, ids del beta conservados y slugs estables.
- **CSV de importación:** regenerado con columna `id`, de modo que reimportarlo es idempotente (antes el id
  salía del nombre y un renombre creaba duplicados).

Observaciones:

- **Búsqueda por "bar":** devuelve Sinforosa y Cafele por el sinónimo "barista" de la subcategoría café de
  especialidad. Es el comportamiento previo de coincidencia literal, que no distingue palabras; no se tocó el
  motor de búsqueda.
- **Datos de contacto incompletos:** 67 locales sin teléfono y 73 sin horario, porque solo se publicaron datos
  de fuente oficial o doble.

## 16. Confidence Distribution

| | high | medium | low |
| --- | --- | --- | --- |
| Existencia y operación (76 publicados) | 25 | 49 | 2 |
| Plaza (76 publicados) | 33 | 34 | 9 |

Los dos locales publicados con confianza baja son Husky's Ice Cream (sucursal citada en su web, no legible) y
Romelia Café (una sola publicación local, aunque de 2026).

Plaza de confianza baja (tomada del beta, pendiente de campo):

- Carl's Jr., Domino's y Husky's Ice Cream.
- D'Lu Coffee & Bakery y Holy Kebabs.
- Taquería Casa Vieja y Donatto Pizza.
- Agave Grill y Sixties Burger.

## 17. Remaining Gaps

- **Verificación presencial:** nadie visitó Zibatá, así que los 61 `likely_active` no tienen confirmación de
  operación en sitio. Esa verificación es lo que haría falta para marcarlos `active`.
- **Plazas:** 9 plazas de local con confianza baja. FoodTrucks Pickleball y el acceso público al campus
  Anáhuac y al restaurante del golf siguen sin comprobar.
- **Contenido:** horarios (73 sin horario), teléfonos, fotos con licencia y coordenadas por local.
- **Fuentes no legibles:** Instagram y Facebook por dentro; localizadores oficiales con JavaScript (Carl's Jr.,
  Starbucks, Subway, Domino's, Nutrisa, KFC).
- **Negocios sin presencia web:** pueden faltar negocios pequeños (pozolería "Emprendedor", food trucks
  eventuales).

## 18. Recommendations

1. **Recorrido en campo** con [`uncertain.json`](../data/research/uncertain.json) y la lista de plaza de
   confianza baja: una tarde por plaza bastaría para resolver la mayoría.
2. **Horarios y contacto:** pedir a cada plaza su directorio actualizado y a los negocios sus horarios; los
   directorios oficiales de Xentric Zibatá y Paseo Zibatá ya dan contacto por local.
3. **Revisión trimestral** con el procedimiento de [`methodology.md`](methodology.md#8-cómo-repetir-la-investigación).
   Prioridad: aperturas en Distrito Nandú, Xenica y Pabellón Zibatá, y los `likely_active` sin señal
   reciente.
4. **Búsqueda:** valorar coincidencia literal por palabra, para que "bar" no encuentre "barista".
5. **UI:** mostrar la fecha de verificación en la ficha; el dato ya viene en el dataset.

---

## Tabla final de auditoría

| Campo | Resultado |
| --- | --- |
| Fecha de investigación | 2026-09-14 (dataset 2026.09.14) |
| Plazas beta | 12 (10 activas) |
| Plazas verificadas | 9 activas (7 `active`, 2 `likely_active`) |
| Plazas nuevas | 0 operativas; 3 desarrollos futuros identificados |
| Plazas desactivadas | 3 (FoodTrucks Pickleball, Plaza Walmart, Distrito Nandú) |
| Negocios beta | 104 (76 activos) |
| Candidatos revisados | 135 |
| Negocios activos (publicados) | 76 (15 `active`, 61 `likely_active`) |
| Nuevos negocios | 31 descubiertos, 10 publicados |
| Cerrados | 3 cerrados + 1 sustituido |
| Duplicados | 1 |
| Rechazados | 5 |
| Inciertos | 48 |
| Próximamente | 1 |
| Categorías finales | 17 (16 en uso) · 27 subcategorías |
| URLs de evidencia | 287 |

## Validación e integración con el MVP

Resultados de la ejecución del 2026-09-14/15:

- **Gate y validación técnica:**
  - `npm run check`: exit 0 (lint, tipos, 97 tests unitarios, datos y build).
  - Tests nuevos: verificación en el validador y decodificación de fechas de publicaciones.
  - JSON y esquemas: `data:validate` con 0 errores y 0 avisos. Ids únicos, relaciones plaza–local–categoría
    y URLs verificadas por Zod y `validateRelations`.
- **E2E:**
  - En raíz: 50 superadas, 4 omitidas por diseño.
  - Con subruta de GitHub Pages: 50 superadas, 4 omitidas.
  - Se ajustaron solo las expectativas ligadas a datos (conteos de plaza, "Plaza Condesa", "Rometta
    Gastrobar" y el enlace oficial de Bendito Bocado).
  - Una prueba medía distancias con un selector que dejaba de encontrar la plaza renombrada; se corrigió.
- **Carga (build estático con subruta, 9 viewports):** 0 errores de consola y de página, 0 peticiones
  fallidas, solo el propio host y 0 marcadores bajo la interfaz o fuera de pantalla. Las 9 plazas activas
  quedan representadas en escritorio y tablet vertical.
- **Plazas (escritorio y móvil):** en las 9 plazas activas, panel con conteo, nombres y orden idénticos al
  dataset, URL, marcador seleccionado, "Cómo llegar" y cierre (18/18). También funcionan el cambio de plaza,
  atrás, zoom y clic fuera.
- **Recorridos críticos J1–J5:** 10/10 en escritorio y móvil.
- **Accesibilidad:** axe sin violaciones en 16/16 estados.
- **Integración específica del nuevo dataset:**
  - Selector con las 9 plazas y nombres corregidos ("Plaza Condesa", "MOL Pitahaya", "Zibatá Golf").
  - Pastilla "Pollo y alitas" con 2 locales.
  - "panadería" → 4 resultados (antes 0), "alitas" → 2, "esquites" → 2.
  - Ficha de Cafele con horario oficial (`Lun–Dom 07:00–21:30`, estado abierto/cerrado calculado por la app)
    y enlace oficial.
  - "Cómo llegar" del local nuevo Pizca de Azúcar a las coordenadas de Xentric Anáhuac.
  - Enlaces a registros retirados (Piotl Rosticería, Mr. Bagel) muestran el inicio. Es el comportamiento
    previo P4-URL-021: sin aviso.
