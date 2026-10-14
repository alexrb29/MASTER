# 5074 · Práctica: auditoría de ventas, del dato al dashboard

**Duración de trabajo en clase: 135 minutos.**

## Contexto profesional

Una tienda necesita conocer qué categorías generan más ingresos entre el 1 y el 7 de octubre de 2026. Dispone de una exportación de ventas y un catálogo de productos. Antes de presentar resultados, debes comprobar si los registros permiten calcularlos correctamente.

Trabajarás con datos sintéticos, sin información personal. Son pocos registros para aprender el proceso completo en una sesión. El ejercicio utiliza procesamiento local por lotes. Con mayor volumen habría que estudiar lectura por partes, memoria, particiones y, si los requisitos lo justifican, procesamiento distribuido.

## Objetivo

Construir un proceso reproducible que lea dos fuentes, detecte incidencias, relacione datos y genere métricas verificadas para el dashboard que ya has iniciado. Debes poder explicar de dónde sale cada cifra.

## Referencia curricular

Los siguientes CE se trabajan con evidencias parciales. Fuente: programación didáctica de 5074, página 19.

- **RA1**, integración, procesamiento y análisis de información. **CE 1.3:** «Combina diferentes fuentes y tipos de datos».
- **RA3**, gestión y almacenamiento de datos. **CE 3.1:** «Extrae y almacena datos de diversas fuentes, para ser tratados a diferentes escenarios».
- **RA2**, configuración de cuadros de mando. **CE 2.2:** «Cruza información sobre el objetivo a conseguir y la naturaleza de los datos».
- **RA2 · CE 2.3:** «Hace un cuadro de mando utilizando técnicas sencillas».

## Material y preparación

- Node.js instalado y accesible desde el terminal de VS Code.
- Tu proyecto de dashboard, Git, GitHub y su publicación en Vercel.
- Los archivos `datos/ventas.csv`, `datos/productos.json` y `scripts/procesar.mjs`.
- No necesitas instalar paquetes para el script inicial.

Copia las carpetas `datos` y `scripts` a la raíz de tu proyecto. Abre allí el terminal y ejecuta:

```bash
node --version
node scripts/procesar.mjs
```

El script inicial lee las entradas y muestra sus tamaños. **Todavía no calcula métricas ni genera los archivos de salida.** Tu trabajo consiste en completar los TODO. Las funciones para guardar los JSON ya están preparadas.

La carpeta `profesor` contiene material de corrección y no forma parte de los recursos que debes utilizar.

## Datos y reglas del caso

Consulta `DICCIONARIO-DATOS.md` antes de programar.

- Cada operación corresponde a una única línea de venta. `venta_id` identifica esa operación.
- Todos los importes están en EUR. No hay impuestos, descuentos, costes ni devoluciones en este modelo.
- Calcula el ingreso como unidades multiplicadas por el precio histórico de la venta.
- Admite unidades enteras mayores que cero y precios numéricos finitos mayores o iguales que cero.
- Un campo obligatorio vacío es una incidencia. No conviertas un vacío en cero.
- Un producto de la venta debe existir en el catálogo. No inventes nombres ni categorías.
- Conserva una sola copia de una operación repetida con todos sus campos idénticos.
- Dos operaciones con IDs distintos pueden coincidir en producto, unidades y precio. Eso no las convierte en duplicados.
- Si un mismo ID tiene datos contradictorios, registra un conflicto para revisión. No elijas una versión arbitrariamente.
- Separa las operaciones inválidas y registra el motivo. No las incluyas en las métricas validadas.
- Conserva intactas las fuentes originales.

## Fases de trabajo

| Tiempo | Trabajo | Comprobación |
| --- | --- | --- |
| 10 min | Definir la pregunta y explorar campos y unidades | Explicar qué significa ingreso y qué datos necesitas |
| 20 min | Leer las entradas y preparar el índice de productos | Mostrar tamaños y ejemplos de registros |
| 25 min | Detectar duplicados e incidencias | Registrar IDs, filas y motivos |
| 25 min | Relacionar, calcular y guardar resultados | Generar `resumen.json` y `calidad.json` |
| 25 min | Incorporar métricas y gráfica al dashboard | Mostrar valores calculados desde el JSON |
| 20 min | Comprobar un subconjunto manual y revisar con un compañero | Documentar operaciones y sumas |
| 10 min | Preparar entrega y responder el cierre individual | Explicar decisiones y actualización |

**Total: 135 minutos.** El profesor indicará la fecha límite y si el trabajo se realiza individualmente o por parejas. Si trabajas en pareja, cada integrante debe justificar sus decisiones y aportar respuestas individuales.

### 1. Inspección y validación

Comprueba los campos obligatorios, tipos numéricos, fecha y referencias. Valida que las fechas son días reales dentro del periodo del caso. Comprueba también la unicidad del catálogo.

El lector inicial funciona con el CSV controlado que te proporcionamos. No es un parser general de CSV. No lo reutilices para archivos con comas dentro de campos, comillas o saltos internos sin adaptarlo o utilizar una librería adecuada.

### 2. Integración y transformación

Para cada operación válida, añade el nombre y categoría del producto y calcula su ingreso. Acumula ingresos por categoría.

Guarda un JSON de resumen con esta estructura. Los valores mostrados son marcadores de formato y deben sustituirse por tus cálculos:

```json
{
  "periodo": { "desde": "2026-10-01", "hasta": "2026-10-07" },
  "moneda": "EUR",
  "generado_en": "fecha y hora ISO de ejecución",
  "operaciones_validas": 0,
  "unidades_totales": 0,
  "ingresos_totales": 0,
  "ingresos_por_categoria": [
    { "categoria": "nombre de categoría", "ingresos": 0 }
  ]
}
```

Guarda también `salida/calidad.json` con los recuentos de entrada, operaciones válidas, copias duplicadas excluidas e incidencias excluidas. Incluye el listado de duplicados y el de incidencias con `venta_id`, `fila_csv` y `motivo`. La primera línea del CSV es la cabecera: el primer registro está en la fila 2.

Cada fila de entrada debe pertenecer a una sola categoría de recuento. Comprueba:

**filas de entrada = válidas + copias duplicadas excluidas + incidencias excluidas.**

### 3. Dashboard

Muestra:

- Ingresos totales, indicando EUR.
- Número de operaciones válidas.
- Unidades totales.
- Una gráfica de barras con los ingresos por categoría.
- Periodo analizado y fecha de generación del resumen.
- Número de registros excluidos por duplicación y por incidencias.

Los valores deben proceder del resultado generado, no de cifras escritas a mano en las cards. Justifica brevemente por qué eliges barras para comparar categorías.

Puedes copiar `salida/resumen.json` a `public/datos/resumen.json` y leerlo desde el dashboard. Si utilizas esta opción, tras regenerar los datos debes copiar la nueva salida y publicar una nueva versión para actualizar el archivo servido. El directorio `public` debe estar en la raíz de la aplicación Next.js que despliegas, aunque esté dentro de otra carpeta del repositorio.

Describe exactamente tu mecanismo de actualización. Este ejercicio no incluye ingestión continua ni streaming.

### 4. Comprobaciones

- Calcula a mano el ingreso de las operaciones V001, V002, V003 y V004. Usa una sola copia por operación.
- Compara tu suma manual con la de esas operaciones en el proceso.
- Comprueba que la suma de categorías coincide con el ingreso total.
- Ejecuta el proceso dos veces: las métricas y recuentos deben ser iguales. La fecha de generación puede variar.
- Revisa la URL publicada y comprueba que muestra el último resultado incorporado.

Documenta las comprobaciones, no solo «funciona».

## Entrega y evidencias

Entrega en el Campus un documento o texto con:

1. Enlace al repositorio accesible para el profesor.
2. Enlace público al dashboard.
3. Ubicación de `salida/resumen.json` y `salida/calidad.json` en el repositorio.
4. README con la pregunta, campos utilizados, reglas de limpieza, incidencias, cálculos comprobados, mecanismo de actualización y limitaciones.
5. Una captura del dashboard como evidencia complementaria.
6. Respuestas individuales a las preguntas del cierre, identificadas por alumno.

## Criterios de corrección

| CE | Evidencia observable | Instrumento y valoración |
| --- | --- | --- |
| 1.3 | Ventas relacionadas con productos mediante su ID, sin multiplicar ni inventar registros | Revisión del código, entradas y resultados: relación correcta y explicable |
| 3.1 | Lectura de ambas fuentes y almacenamiento separado de salidas | Ejecución del script y revisión de archivos: proceso repetible y fuentes conservadas |
| 2.2 | Pregunta, periodo, unidades y decisiones justificados | README y explicación individual: coherencia entre objetivo, campos y métricas |
| 2.3 | Cards y gráfica alimentadas por cálculos verificados | Revisión funcional y contraste manual: valores correctos y representación adecuada |

Se valorarán además las comprobaciones y la trazabilidad como evidencias de la corrección del proceso. Un diseño cuidado con cálculos incorrectos requiere revisión. No se establecen ponderaciones ni una nota automática en este enunciado.

## Cierre individual

- ¿Qué incidencia encontraste y cómo la trataste? Indica un ID concreto.
- ¿Cómo sabes que dos filas son copias de una operación?
- ¿Cómo comprobaste el ingreso total?
- ¿Cuándo aparecen nuevas ventas en tu dashboard y qué pasos debes realizar?

## Ampliación opcional

Genera un listado de ventas enriquecidas y contrasta sus agregaciones con SQL en PostgreSQL/Supabase. Antes de implementarlo, explica qué datos cargarías y dónde realizarías la transformación principal: ETL o ELT.
