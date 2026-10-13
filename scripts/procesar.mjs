import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Proceso por lotes: lee las DOS fuentes originales (sin modificarlas),
// valida, integra y guarda las salidas en salida/.
const raiz = new URL('../', import.meta.url);
const texto = await readFile(new URL('datos/ventas.csv', raiz), 'utf8');
const productos = JSON.parse(await readFile(new URL('datos/productos.json', raiz), 'utf8'));

const PERIODO = { desde: '2026-10-01', hasta: '2026-10-07' };
const MONEDA = 'EUR';

// Lector válido SOLO para el CSV controlado de esta práctica:
// separador coma, sin campos entrecomillados, comas internas ni saltos en campos.
const lineas = texto.trim().split(/\r?\n/);
const columnas = lineas.shift().split(',').map((c) => c.trim());
const ventas = lineas.map((linea, indice) => {
  const campos = linea.split(',');
  if (campos.length !== columnas.length) throw new Error(`Fila ${indice + 2}: número de campos incorrecto`);
  const registro = Object.fromEntries(columnas.map((columna, i) => [columna, campos[i].trim()]));
  return { ...registro, fila_csv: indice + 2 }; // fila 1 = cabecera
});

console.log(`Entrada: ${ventas.length} filas de ventas y ${productos.length} productos.`);

// ---------------------------------------------------------------------------
// TODO 1: índice por producto_id y comprobación de unicidad del catálogo
// ---------------------------------------------------------------------------
const catalogo = new Map();
for (const p of productos) {
  if (!p.producto_id || !p.nombre || !p.categoria) {
    throw new Error(`Catálogo: producto incompleto ${JSON.stringify(p)}`);
  }
  if (catalogo.has(p.producto_id)) {
    throw new Error(`Catálogo: producto_id repetido ${p.producto_id}`);
  }
  catalogo.set(p.producto_id, p);
}
console.log(`Catálogo: ${catalogo.size} IDs únicos.`);

// ---------------------------------------------------------------------------
// Funciones de validación (TODO 3)
// ---------------------------------------------------------------------------
const CAMPOS_OBLIGATORIOS = ['venta_id', 'fecha', 'producto_id', 'unidades', 'precio_unitario'];

function esFechaReal(texto) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
  const [a, m, d] = texto.split('-').map(Number);
  const f = new Date(Date.UTC(a, m - 1, d));
  // Si el día no existe (p. ej. 2026-02-30), Date lo desplaza y no coincide
  return f.getUTCFullYear() === a && f.getUTCMonth() === m - 1 && f.getUTCDate() === d;
}

// Devuelve una lista de motivos (vacía si la venta es válida)
function validar(v) {
  const motivos = [];
  const vacios = CAMPOS_OBLIGATORIOS.filter((c) => v[c] === undefined || v[c] === '');
  // Un vacío es incidencia: NO se convierte a cero
  for (const c of vacios) motivos.push(`Campo obligatorio vacío: ${c}`);

  if (v.fecha !== '') {
    if (!esFechaReal(v.fecha)) motivos.push(`Fecha no válida: ${v.fecha}`);
    else if (v.fecha < PERIODO.desde || v.fecha > PERIODO.hasta) motivos.push(`Fecha fuera del periodo: ${v.fecha}`);
  }
  if (v.producto_id !== '' && !catalogo.has(v.producto_id)) {
    motivos.push(`Producto inexistente en el catálogo: ${v.producto_id}`);
  }
  if (v.unidades !== '') {
    const u = Number(v.unidades);
    if (!/^-?\d+$/.test(v.unidades) || !Number.isInteger(u)) motivos.push(`Unidades no enteras: ${v.unidades}`);
    else if (u <= 0) motivos.push(`Unidades no mayores que cero: ${v.unidades}`);
  }
  if (v.precio_unitario !== '') {
    const p = Number(v.precio_unitario);
    if (!Number.isFinite(p)) motivos.push(`Precio no numérico: ${v.precio_unitario}`);
    else if (p < 0) motivos.push(`Precio negativo: ${v.precio_unitario}`);
  }
  return motivos;
}

// ---------------------------------------------------------------------------
// TODO 2: copias exactas y conflictos de ID
// Se agrupan las filas por venta_id. Si todas las filas de un ID son idénticas,
// se conserva la primera y el resto son copias. Si difieren, es un conflicto:
// no se elige ninguna versión, todas van a revisión.
// ---------------------------------------------------------------------------
const firma = (v) => CAMPOS_OBLIGATORIOS.map((c) => v[c]).join('|');

const porId = new Map();
for (const v of ventas) {
  if (v.venta_id === '') continue; // sin ID no se puede agrupar: irá a incidencias
  if (!porId.has(v.venta_id)) porId.set(v.venta_id, []);
  porId.get(v.venta_id).push(v);
}

const candidatas = [];
const duplicados = [];
const incidencias = [];
const conflictos = [];

for (const v of ventas) {
  if (v.venta_id === '') {
    incidencias.push({ venta_id: null, fila_csv: v.fila_csv, motivo: 'Campo obligatorio vacío: venta_id' });
    continue;
  }
  const grupo = porId.get(v.venta_id);
  const primera = grupo[0];
  const hayConflicto = new Set(grupo.map(firma)).size > 1;

  if (hayConflicto) {
    const filas = grupo.map((g) => g.fila_csv);
    incidencias.push({ venta_id: v.venta_id, fila_csv: v.fila_csv, motivo: `Conflicto: el mismo ID tiene datos distintos (filas ${filas.join(', ')})` });
    if (v === primera) conflictos.push({ venta_id: v.venta_id, filas_csv: filas });
  } else if (v !== primera) {
    duplicados.push({ venta_id: v.venta_id, fila_csv: v.fila_csv, motivo: `Copia exacta de la fila ${primera.fila_csv}` });
  } else {
    candidatas.push(v);
  }
}

// ---------------------------------------------------------------------------
// TODO 3 + 4: validar y separar incidencias con ID, fila y motivo
// TODO 5: enriquecer las válidas con nombre, categoría e ingreso
// ---------------------------------------------------------------------------
const validas = [];
for (const v of candidatas) {
  const motivos = validar(v);
  if (motivos.length > 0) {
    incidencias.push({ venta_id: v.venta_id, fila_csv: v.fila_csv, motivo: motivos.join('; ') });
    continue;
  }
  const producto = catalogo.get(v.producto_id);
  const unidades = Number(v.unidades);
  const precio_unitario = Number(v.precio_unitario);
  validas.push({
    venta_id: v.venta_id,
    fila_csv: v.fila_csv,
    fecha: v.fecha,
    producto_id: v.producto_id,
    nombre: producto.nombre,
    categoria: producto.categoria,
    unidades,
    precio_unitario,
    // Se trabaja en céntimos para evitar errores de coma flotante
    ingreso: Math.round(unidades * precio_unitario * 100) / 100,
  });
}
incidencias.sort((a, b) => a.fila_csv - b.fila_csv);

// ---------------------------------------------------------------------------
// TODO 6: totales y agrupación por categoría
// ---------------------------------------------------------------------------
let unidadesTotales = 0;
let centimosTotales = 0;
const centimosPorCategoria = new Map();
// Todas las categorías del catálogo aparecen, aunque sumen 0
for (const p of productos) centimosPorCategoria.set(p.categoria, 0);

for (const v of validas) {
  const centimos = Math.round(v.ingreso * 100);
  unidadesTotales += v.unidades;
  centimosTotales += centimos;
  centimosPorCategoria.set(v.categoria, centimosPorCategoria.get(v.categoria) + centimos);
}

const ingresos_por_categoria = [...centimosPorCategoria]
  .map(([categoria, c]) => ({ categoria, ingresos: c / 100 }))
  .sort((a, b) => b.ingresos - a.ingresos || a.categoria.localeCompare(b.categoria, 'es'));

// ---------------------------------------------------------------------------
// TODO 7: resumen
// ---------------------------------------------------------------------------
const resumen = {
  periodo: PERIODO,
  moneda: MONEDA,
  generado_en: new Date().toISOString(),
  operaciones_validas: validas.length,
  unidades_totales: unidadesTotales,
  ingresos_totales: centimosTotales / 100,
  ingresos_por_categoria,
};

// ---------------------------------------------------------------------------
// TODO 8: informe de calidad
// ---------------------------------------------------------------------------
const calidad = {
  generado_en: resumen.generado_en,
  fuentes: { ventas: 'datos/ventas.csv', productos: 'datos/productos.json' },
  filas_entrada: ventas.length,
  productos_catalogo: productos.length,
  operaciones_validas: validas.length,
  copias_duplicadas_excluidas: duplicados.length,
  incidencias_excluidas: incidencias.length,
  conflictos_de_id: conflictos,
  duplicados,
  incidencias,
};

// Comprobaciones automáticas: si fallan, no se guarda nada
const cuadre = validas.length + duplicados.length + incidencias.length;
if (cuadre !== ventas.length) {
  throw new Error(`Recuento no cuadra: ${ventas.length} filas ≠ ${cuadre}`);
}
const sumaCategorias = ingresos_por_categoria.reduce((s, c) => s + Math.round(c.ingresos * 100), 0);
if (sumaCategorias !== centimosTotales) {
  throw new Error('La suma por categorías no coincide con el ingreso total');
}

await guardarResultado(resumen);
await guardarCalidad(calidad);
await guardarVentas(validas);

async function guardarResultado(resultado) {
  await mkdir(new URL('salida/', raiz), { recursive: true });
  await writeFile(new URL('salida/resumen.json', raiz), JSON.stringify(resultado, null, 2) + '\n');
}

async function guardarCalidad(informe) {
  await mkdir(new URL('salida/', raiz), { recursive: true });
  await writeFile(new URL('salida/calidad.json', raiz), JSON.stringify(informe, null, 2) + '\n');
}

// Salida adicional: ventas enriquecidas (tabla del dashboard y ampliación SQL)
async function guardarVentas(lista) {
  await mkdir(new URL('salida/', raiz), { recursive: true });
  await writeFile(new URL('salida/ventas.json', raiz), JSON.stringify(lista, null, 2) + '\n');
}

console.log(`Filas: ${ventas.length} = ${validas.length} válidas + ${duplicados.length} copias + ${incidencias.length} incidencias`);
console.log(`Unidades: ${unidadesTotales} · Ingresos: ${(centimosTotales / 100).toFixed(2)} ${MONEDA}`);
for (const c of ingresos_por_categoria) console.log(`  ${c.categoria}: ${c.ingresos.toFixed(2)} ${MONEDA}`);
for (const i of incidencias) console.log(`  Incidencia fila ${i.fila_csv} (${i.venta_id}): ${i.motivo}`);
console.log(`Salidas guardadas en ${fileURLToPath(new URL('salida/', raiz))}`);
