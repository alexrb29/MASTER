import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const raiz = new URL('../', import.meta.url);
const texto = await readFile(new URL('datos/ventas.csv', raiz), 'utf8');
const productos = JSON.parse(await readFile(new URL('datos/productos.json', raiz), 'utf8'));

const lineas = texto.trim().split(/\r?\n/);
const columnas = lineas.shift().split(',');
const ventas = lineas.map((linea, indice) => {
  const campos = linea.split(',');
  if (campos.length !== columnas.length) throw new Error(`Fila ${indice + 2}: número de campos incorrecto`);
  return Object.fromEntries(columnas.map((columna, i) => [columna, campos[i]]));
});

const catalogoMap = new Map();
for (const p of productos) {
  catalogoMap.set(p.producto_id, p);
}

const operacionesValidas = [];
const duplicadasExcluidas = [];
const incidenciasExcluidas = [];
const idRegistros = new Map();

ventas.forEach((v, indice) => {
  const fila_csv = indice + 2;
  const venta_id = v.venta_id ? v.venta_id.trim() : '';
  const fecha = v.fecha ? v.fecha.trim() : '';
  const producto_id = v.producto_id ? v.producto_id.trim() : '';
  const unidadesStr = v.unidades;
  const precioStr = v.precio_unitario;

  if (!venta_id || !fecha || !producto_id || !unidadesStr || !precioStr) {
    incidenciasExcluidas.push({ venta_id: venta_id || 'VACIO', fila_csv, motivo: 'Campo obligatorio ausente o vacío' });
    return;
  }

  if (!fecha.startsWith('2026-10-0') || fecha.length !== 10) {
    incidenciasExcluidas.push({ venta_id, fila_csv, motivo: `Fecha no válida: ${fecha}` });
    return;
  }

  if (!catalogoMap.has(producto_id)) {
    incidenciasExcluidas.push({ venta_id, fila_csv, motivo: `Producto inexistente: ${producto_id}` });
    return;
  }

  const unidades = Number(unidadesStr);
  const precio_unitario = Number(precioStr);

  if (isNaN(unidades) || unidades <= 0 || isNaN(precio_unitario) || precio_unitario < 0) {
    incidenciasExcluidas.push({ venta_id, fila_csv, motivo: 'Valores numéricos no válidos' });
    return;
  }

  const firma = `${venta_id}|${fecha}|${producto_id}|${unidades}|${precio_unitario}`;
  if (idRegistros.has(venta_id)) {
    duplicadasExcluidas.push({ venta_id, fila_csv, motivo: 'Copia exacta de operación' });
    return;
  }
  idRegistros.set(venta_id, { firma });

  const productoInfo = catalogoMap.get(producto_id);
  operacionesValidas.push({
    venta_id,
    fecha,
    producto_id,
    nombre: productoInfo.nombre,
    categoria: productoInfo.categoria,
    unidades,
    precio_unitario,
    ingreso: unidades * precio_unitario
  });
});

let unidadesTotales = 0;
let ingresosTotales = 0;
const ingresosPorCat = {};

for (const p of productos) {
  ingresosPorCat[p.categoria] = 0;
}

for (const op of operacionesValidas) {
  unidadesTotales += op.unidades;
  ingresosTotales += op.ingreso;
  ingresosPorCat[op.categoria] += op.ingreso;
}

const ingresos_por_categoria = Object.entries(ingresosPorCat).map(([categoria, ingresos]) => ({
  categoria,
  ingresos: Number(ingresos.toFixed(2))
}));

const resumenResultado = {
  periodo: { desde: "2026-10-01", hasta: "2026-10-07" },
  moneda: "EUR",
  generado_en: new Date().toISOString(),
  operaciones_validas: operacionesValidas.length,
  unidades_totales: unidadesTotales,
  ingresos_totales: Number(ingresosTotales.toFixed(2)),
  ingresos_por_categoria
};

const informeCalidad = {
  filas_entrada: ventas.length,
  operaciones_validas: operacionesValidas.length,
  copias_duplicadas_excluidas: duplicadasExcluidas.length,
  incidencias_excluidas: incidenciasExcluidas.length,
  duplicados: duplicadasExcluidas,
  incidencias: incidenciasExcluidas
};

await mkdir(new URL('salida/', raiz), { recursive: true });
await writeFile(new URL('salida/resumen.json', raiz), JSON.stringify(resumenResultado, null, 2) + '\n');
await writeFile(new URL('salida/calidad.json', raiz), JSON.stringify(informeCalidad, null, 2) + '\n');

console.log('¡Proceso ETL completado con éxito!');
console.log(`- Operaciones válidas: ${operacionesValidas.length}`);
console.log(`- Ingresos totales: ${ingresosTotales.toFixed(2)} EUR`);