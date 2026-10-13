# Auditoría de ventas: del dato al dashboard

Práctica 5074. Proceso local por lotes que lee dos fuentes, detecta incidencias, relaciona ventas con el catálogo y genera métricas verificadas para un dashboard estático publicado en Vercel.

## 1. Pregunta

**¿Qué categorías de producto generan más ingresos entre el 1 y el 7 de octubre de 2026 (ambos incluidos), en EUR?**

**Ingreso** de una operación = `unidades × precio_unitario` (precio histórico de la venta). No es beneficio: el modelo no incluye costes, impuestos, descuentos ni devoluciones.

## 2. Estructura del repositorio

| Ruta | Contenido |
| --- | --- |
| `datos/ventas.csv` | Fuente original de ventas (70 filas + cabecera). **No se modifica.** |
| `datos/productos.json` | Fuente original del catálogo (8 productos, 4 categorías). **No se modifica.** |
| `scripts/procesar.mjs` | Proceso de lectura, validación, integración y cálculo (Node.js, sin dependencias) |
| `salida/resumen.json` | Métricas para el dashboard |
| `salida/calidad.json` | Recuentos, duplicados e incidencias con `venta_id`, `fila_csv` y `motivo` |
| `salida/ventas.json` | Ventas válidas enriquecidas (nombre, categoría, ingreso) |
| `index.html` | Dashboard: lee los tres JSON de `salida/` |

Ejecución: `node scripts/procesar.mjs` (o `npm start`).

## 3. Campos utilizados

- **ventas.csv**: `venta_id` (identifica la operación, sirve para detectar copias), `fecha` (filtro de periodo), `producto_id` (clave de unión con el catálogo), `unidades` y `precio_unitario` (cálculo del ingreso).
- **productos.json**: `producto_id` (clave), `nombre` y `categoria` (enriquecimiento y agrupación).

La relación es **muchas ventas → un producto** mediante `producto_id`. Se usa un índice (`Map`) del catálogo, de modo que cada venta obtiene como máximo un producto: la unión no multiplica registros ni inventa nombres o categorías.

## 4. Reglas de limpieza

Orden de aplicación:

1. **Catálogo**: cada producto debe tener `producto_id`, `nombre` y `categoria`, y el `producto_id` debe ser único. Si no, el proceso se detiene (no se puede relacionar con fiabilidad).
2. **Copias y conflictos** (agrupando filas por `venta_id`):
   - Si todas las filas de un ID son idénticas en sus cinco campos → se conserva la primera y las demás cuentan como **copias duplicadas excluidas**.
   - Si un mismo ID tiene datos distintos → **conflicto**: todas sus filas van a incidencias para revisión; no se elige ninguna versión.
   - Dos IDs distintos con mismo producto, unidades y precio **no** son duplicados (p. ej. V001 y V009).
3. **Validación** de cada operación conservada:
   - Campo obligatorio vacío → incidencia (un vacío **nunca** se convierte en 0).
   - `fecha`: formato `YYYY-MM-DD`, día real del calendario (se rechaza p. ej. `2026-02-30`) y dentro de 2026-10-01 … 2026-10-07.
   - `producto_id` debe existir en el catálogo.
   - `unidades`: entero > 0.
   - `precio_unitario`: número finito ≥ 0.
   - Una fila con varios problemas registra todos los motivos.
4. Las operaciones válidas se enriquecen y se agregan. Los importes se suman en céntimos enteros para evitar errores de coma flotante.

El script comprueba automáticamente antes de guardar que `filas = válidas + copias + incidencias` y que la suma por categorías es igual al total; si no cuadra, se detiene sin escribir salidas.

## 5. Incidencias encontradas

**70 filas = 60 válidas + 5 copias duplicadas + 5 incidencias.** No hay conflictos de ID.

| Tipo | venta_id | Fila CSV | Motivo | Tratamiento |
| --- | --- | --- | --- | --- |
| Copia | V003 | 62 | Copia exacta de la fila 4 | Se conserva la fila 4 |
| Copia | V011 | 63 | Copia exacta de la fila 12 | Se conserva la fila 12 |
| Copia | V021 | 64 | Copia exacta de la fila 22 | Se conserva la fila 22 |
| Copia | V036 | 65 | Copia exacta de la fila 37 | Se conserva la fila 37 |
| Copia | V049 | 66 | Copia exacta de la fila 50 | Se conserva la fila 50 |
| Incidencia | V061 | 67 | `unidades` vacío | Excluida |
| Incidencia | V062 | 68 | `precio_unitario` vacío | Excluida |
| Incidencia | V063 | 69 | Producto P99 inexistente | Excluida |
| Incidencia | V064 | 70 | Unidades −2 (no > 0) | Excluida |
| Incidencia | V065 | 71 | Precio "gratis" no numérico | Excluida |

**Efecto en las métricas si no se hubieran tratado:** las 5 copias habrían sumado 185 EUR de más (36 + 36 + 8 + 100 + 5) y 12 unidades de más (3 + 3 + 1 + 4 + 1); además, el vacío de V061 tratado como 0 o el −2 de V064 habrían distorsionado unidades e ingresos.

## 6. Resultados

| Métrica | Valor |
| --- | --- |
| Operaciones válidas | 60 |
| Unidades totales | 150 |
| Ingresos totales | 2343,00 EUR |

| Categoría | Ingresos (EUR) | % |
| --- | ---: | ---: |
| Hogar | 1088,00 | 46,4 % |
| Deporte | 875,00 | 37,3 % |
| Tecnología | 308,00 | 13,1 % |
| Papelería | 72,00 | 3,1 % |

## 7. Comprobaciones realizadas

**a) Cálculo manual de V001–V004** (una sola copia; V003 aparece dos veces, filas 4 y 62, y se cuenta una vez):

| ID | Cálculo | Ingreso |
| --- | --- | ---: |
| V001 | 1 × 5 | 5 |
| V002 | 2 × 2 | 4 |
| V003 | 3 × 12 | 36 |
| V004 | 4 × 25 | 100 |
| **Suma** | | **145 EUR** |

En `salida/ventas.json` esas cuatro operaciones tienen ingresos 5, 4, 36 y 100 → 145 EUR. **Coinciden.**

**b) Total por un segundo camino.** Las ventas válidas V001–V060 siguen un ciclo de 8 productos con precios fijos (P01 1×5=5, P02 2×2=4, P03 3×12=36, P04 4×25=100, P05 1×8=8, P06 2×18=36, P07 3×15=45, P08 4×20=80; ciclo = 314 EUR y 20 unidades). 60 ventas = 7 ciclos completos (56 ventas) + V057–V060 (P01–P04):
- Ingresos: 7 × 314 + (5 + 4 + 36 + 100) = 2198 + 145 = **2343 EUR** ✔
- Unidades: 7 × 20 + (1 + 2 + 3 + 4) = 140 + 10 = **150** ✔

**c) Suma de categorías = total:** 1088 + 875 + 308 + 72 = **2343 EUR** ✔ (también lo verifica el script).

Comprobación de una categoría: Papelería = P01 (8 ventas × 5 = 40) + P02 (8 ventas × 4 = 32) = 72 EUR ✔.

**d) Cuadre de filas:** 60 + 5 + 5 = 70 ✔.

**e) Repetibilidad:** se ejecutó el proceso dos veces y `resumen.json` y `calidad.json` son idénticos salvo `generado_en`. Las fuentes `datos/*` tienen el mismo hash antes y después de ejecutar (no se modifican).

**f) Casos límite probados** con un CSV de prueba aparte: fecha inexistente (`2026-02-30`), fecha fuera de periodo, unidades decimales (1.5), precio `Infinity`, `venta_id` vacío y un mismo ID con datos distintos (registrado como conflicto en ambas filas). Todos se detectan con su motivo.

**g) URL publicada:** tras el despliegue, comprobar que la fecha "Resumen generado" del dashboard coincide con `generado_en` de `salida/resumen.json` del último commit.

## 8. Dashboard

Muestra ingresos totales (EUR), operaciones válidas, unidades totales, registros excluidos por duplicación y por incidencias, periodo y fecha de generación, una gráfica de barras de ingresos por categoría, la tabla de categorías y el listado de excluidos. **Ninguna cifra está escrita a mano**: todo se lee con `fetch` desde `salida/*.json`.

**¿Por qué barras?** Comparar categorías es comparar magnitudes de elementos discretos sin orden temporal. La longitud de una barra desde una base común en cero es lo que el ojo compara con más precisión (mejor que ángulos de un gráfico circular). Las barras son horizontales para que los nombres de categoría se lean sin girar, y están ordenadas de mayor a menor para responder directamente a la pregunta. Al ser una sola serie, se usa un único color.

## 9. Mecanismo de actualización

No hay ingestión continua ni streaming. Es un proceso **por lotes y manual**:

1. Sustituir/añadir los datos en `datos/ventas.csv` (y `datos/productos.json` si cambia el catálogo).
2. Ejecutar `node scripts/procesar.mjs` → regenera `salida/resumen.json`, `salida/calidad.json` y `salida/ventas.json`.
3. Revisar `calidad.json` y la salida de consola.
4. `git add datos salida && git commit -m "Actualiza datos" && git push`.
5. Vercel detecta el push y publica una nueva versión; el dashboard lee los JSON nuevos (con `cache: 'no-store'`).

Las nuevas ventas **solo** aparecen en el dashboard tras completar los pasos 2–5. Vercel no ejecuta el script: publica los JSON ya generados en el repositorio.

## 10. Limitaciones

- Datos sintéticos y pequeños; no permiten conclusiones sobre comercios reales.
- El lector CSV solo sirve para este formato controlado (sin comillas, comas internas ni saltos de línea en campos). Para CSV arbitrarios habría que usar un parser adecuado.
- Todo se carga en memoria. Con mucho volumen habría que medir requisitos y valorar lectura por partes (streams), persistencia en base de datos, particiones y deduplicación entre procesos; añadir máquinas no garantiza mejora automática.
- La deduplicación compara filas dentro de un mismo lote; no recuerda lotes anteriores.
- Los conflictos de ID se excluyen y se informan, pero su resolución requiere revisión humana.
- Ingreso ≠ beneficio: no hay costes, impuestos, descuentos ni devoluciones.
