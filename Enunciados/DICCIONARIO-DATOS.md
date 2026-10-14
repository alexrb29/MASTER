# Datos de la práctica

## Origen y alcance

Datos sintéticos creados para esta actividad. No representan ventas reales ni permiten extraer conclusiones sobre comercios reales. No contienen datos personales.

Periodo: 1–7 de octubre de 2026, inclusive. Moneda: EUR. Cada venta tiene una sola línea. El modelo excluye impuestos, descuentos, costes, devoluciones y conversiones de moneda.

## ventas.csv

70 filas de datos y una cabecera. Codificación UTF-8, separador coma, punto para decimales, sin comillas ni comas internas en campos. Los números llegan al lector inicial como texto.

| Campo | Tipo esperado | Significado y regla |
| --- | --- | --- |
| venta_id | Texto | Identificador obligatorio de la operación, único después de resolver copias |
| fecha | Fecha YYYY-MM-DD | Día real dentro del periodo del caso |
| producto_id | Texto | Identificador obligatorio existente en productos.json |
| unidades | Entero | Cantidad de unidades, mayor que cero |
| precio_unitario | Número | EUR por unidad en esa venta, finito y mayor o igual que cero |

Ingreso de la operación: unidades × precio_unitario. No equivale a beneficio.

Hay copias exactas y registros con campos ausentes, referencia inexistente o valores no válidos. Se introducen deliberadamente para aprender validación, trazabilidad y efecto de la calidad sobre las métricas. Debes detectarlos, contarlos y explicar su tratamiento.

## productos.json

8 objetos, 4 categorías. JSON con estructura homogénea en este archivo.

| Campo | Tipo | Significado |
| --- | --- | --- |
| producto_id | Texto | Clave única del catálogo |
| nombre | Texto | Nombre del producto |
| categoria | Texto | Papelería, Hogar, Tecnología o Deporte |

El catálogo no contiene precio actual: el cálculo utiliza el precio histórico de la venta. La ausencia de un producto en el catálogo constituye una incidencia en la integración.

## Limitaciones

Datos pequeños y controlados, cargables en memoria. Sin conexiones a APIs, autenticación, concurrencia ni cambios durante la ejecución. El lector CSV proporcionado solo cubre este formato restringido.

Para escalar habría que medir primero los requisitos. Podrían cambiar la lectura en memoria, la persistencia, el tratamiento de fallos, las particiones y la deduplicación entre procesos. Añadir máquinas no garantiza una mejora automática.
