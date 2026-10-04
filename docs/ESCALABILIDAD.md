# Evaluación: escalar más allá de comer y beber

Fecha: 2026-09-22 · Estado: **plan interno para después del MVP** (decidido el 2026-09-23: no se actúa
ahora; la guía se mantiene en "dónde comer y beber" hasta publicar)

La guía ya incluye negocios donde no se come en el local (Marie Panadería vende pan para llevar, Castore
MX es una barra de snacks con videojuegos). La pregunta es si la misma base sirve para **cualquier
establecimiento** de Zibatá (tintorería, veterinaria, gimnasio, consultorio) e incluso para **bienes y
servicios sin local físico** (una repostera que vende desde casa, un entrenador, un plomero).

Conclusión corta: **sí, con tres cambios de modelo bien acotados**, y conviene hacerlo por fases. Lo que
no conviene es mezclarlo todo en la misma lista: la guía vale porque responde "¿qué se me antoja hoy?",
y esa pregunta no la responde una tintorería.

## Qué aguanta ya sin tocar nada

| Pieza | Por qué aguanta |
|---|---|
| Taxonomía | Categorías, giros e iconos viven en `research/taxonomy.json`, no en el código. Añadir "Servicios" es un bloque más. |
| Datos | `PlacesRepository` es una interfaz; hoy la implementa el JSON estático y mañana una API. Los esquemas (Zod) ya validan por colección. |
| Mapa | El pipeline GIS no sabe qué se vende dentro: dibuja plazas, edificios y arbolado. Una plaza con consultorios se ve igual. |
| Búsqueda y filtros | Trabajan sobre categorías y sinónimos genéricos. |
| Orden personal | `rankPlaces` razona sobre categoría, giro y plaza; no sobre comida. |
| Ficha | Nombre, descripción, horario, contacto y ubicación sirven para cualquier negocio. |

## Los tres cambios de modelo

### 1. Un nivel por encima de la categoría: el sector

Hoy: `categoría → giro`. Haría falta `sector → categoría → giro`, con los sectores **Comer y beber**,
**Compras**, **Servicios** y **Salud y bienestar**. El sector decide qué se ve por defecto y qué
pregunta hace la interfaz ("¿qué se te antoja?" / "¿qué necesitas?"). Sin ese nivel, la barra de
categorías pasaría de 15 pastillas a 40 y dejaría de servir para decidir.

Coste: un campo en la taxonomía, un filtro más en la interfaz y un selector de sector. El resto del
código no cambia porque ya trabaja con identificadores.

### 2. Negocios sin local: "dónde lo encuentro" en vez de "dónde está"

Hoy cada local pertenece a una plaza y hereda su ubicación. Un servicio a domicilio no tiene plaza.
Opciones, de menor a mayor esfuerzo:

- **`serviceArea` en lugar de `plazaId`**: el negocio se asocia a Zibatá (o a un sector del
  fraccionamiento) y la ficha dice "a domicilio en Zibatá", sin marcador propio. Es lo mínimo honesto:
  no inventa una dirección.
- Una capa aparte en el mapa para "servicios a domicilio", apagada por defecto.
- Un directorio sin mapa para ese sector, con la misma ficha.

Recomendación: la primera. El mapa es el corazón del producto y meterle puntos que no existen lo
debilita.

### 3. Verificación: el cuello de botella real

Cada local publicado hoy tiene fuente pública o verificación en sitio. Un directorio de servicios
particulares multiplica los registros y son mucho más difíciles de verificar (no tienen fachada ni
directorio de plaza). Sin un flujo de alta y de caducidad, el directorio envejece en meses.

Necesita, antes de abrir ese sector:

- alta pedida por el propio negocio (el formulario de verificación ya es el esqueleto);
- fecha de última confirmación visible y **caducidad**: sin confirmar en 12 meses, sale de la guía;
- una regla explícita sobre qué no entra (nada que requiera licencia sanitaria o profesional sin
  comprobarla: consultorios, guarderías, cuidado de personas).

## Apoyar la guía (fuera del MVP)

La página "Apoyar la guía" se retiró el 2026-09-24: no tiene sentido publicarla hasta que exista la
forma de recibir el apoyo. Cuando toque, la vía prevista es un **link de pago de Mercado Pago México**
(sin pasarela propia, sin datos de tarjeta en el sitio y sin backend), enlazado desde "Tu Zibatá" y
citado en "Acerca de esta guía". Hasta entonces la guía no pide ni recibe dinero de nadie, que es
justo lo que la hace independiente.

## Riesgos

1. **Dilución.** La guía se usa porque en dos toques dice dónde comer. Si al abrir aparece "tintorería",
   pierde su razón de ser. Mitigación: sector por defecto "Comer y beber", el resto se elige.
2. **Mantenimiento.** 103 locales ya cuestan una ronda de verificación completa. 400 registros sin un
   flujo de alta propia son inviables para una persona.
3. **Responsabilidad.** Publicar servicios a domicilio de particulares implica reclamaciones,
   suplantaciones y expectativas de moderación. Hace falta una política y un modo de retirar una ficha
   rápido.
4. **Peso del dataset.** Hoy son 27 KB de JSON. Cuadruplicar los registros exigiría cargar por sector
   (ya hay un chunk por colección, así que es un cambio de empaquetado, no de arquitectura).

## Plan por fases (si se aprueba)

1. **Fase 0: terminar comer y beber.** Ubicaciones, fotos/logos y horarios al día. Es lo que da la
   credibilidad con la que se sostiene lo demás.
2. **Fase 1: sector en los datos.** Añadir `sector` a la taxonomía con un único valor (`comer-y-beber`)
   y dejar la interfaz igual. Cambio invisible y reversible.
3. **Fase 2: segundo sector con local físico** (compras y servicios de plaza: estéticas, veterinarias,
   gimnasios). Se reutiliza todo; se prueba si la gente usa el selector de sector.
4. **Fase 3: sin local físico**, con alta pedida por el negocio, caducidad y política publicada.

## Señal para decidir

Antes de abrir la fase 2 conviene medir si la gente vuelve a la guía (hoy no hay analítica; bastaría una
métrica agregada y anónima, o preguntar a un puñado de vecinos). Si la guía de comida todavía no es un
hábito, sumar sectores no la hará más útil: la hará más grande.
