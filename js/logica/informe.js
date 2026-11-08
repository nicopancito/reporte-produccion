// Cálculos del informe mensual. No toca pantalla ni base: recibe reportes y devuelve tablas.
// Regla de siempre: nunca se suman cantidades de unidades de medida distintas.
 
const porNombre = (a, b) => String(a).localeCompare(String(b), "es");
 
// Totales por procedimiento (un técnico o todos).
export function totalesPorProcedimiento(reportes) {
  const m = new Map();
  for (const r of reportes) {
    const p = r.procedimiento;
    const clave = `${p.id}|${r.unidad_medida}`;
    if (!m.has(clave)) m.set(clave, { proceso: p.proceso.nombre, procedimiento: p.nombre, color: p.proceso.color, medida: r.unidad_medida, total: 0, reportes: 0, dias: new Set(), tecnicos: new Set() });
    const fila = m.get(clave);
    fila.total += Number(r.cantidad || 0);
    fila.reportes++;
    fila.dias.add(r.fecha);
    fila.tecnicos.add(r.perfil_id);
  }
  return [...m.values()].sort((a, b) => porNombre(a.proceso, b.proceso) || porNombre(a.procedimiento, b.procedimiento));
}
 
// Cuánto aporta cada serie a la métrica principal del reporte, con su unidad de organización.
// Las solicitudes (servicios) se cuentan en la cabecera: van a la primera unidad del reporte.
function aportesPorUnidad(r) {
  const metrica = r.procedimiento.metrica;
  const sinUnidad = r.unidad || "SIN UNIDAD (OTRAS ACTIVIDADES)";
  if (metrica === "solicitudes" || !r.detalles.length) {
    return [{ unidad: r.detalles.find((d) => d.unidad)?.unidad || sinUnidad, valor: Number(r.cantidad || 0) }];
  }
  return r.detalles.map((d) => ({ unidad: d.unidad || sinUnidad, valor: Number(d[metrica] || 0) }));
}
 
// Resumen por unidad de organización: qué se trabajó de cada unidad, por procedimiento.
export function resumenPorUnidad(reportes) {
  const unidades = new Map();
  for (const r of reportes) {
    const p = r.procedimiento;
    for (const { unidad, valor } of aportesPorUnidad(r)) {
      if (!unidades.has(unidad)) unidades.set(unidad, new Map());
      const filas = unidades.get(unidad);
      const clave = `${p.id}|${r.unidad_medida}`;
      if (!filas.has(clave)) filas.set(clave, { proceso: p.proceso.nombre, procedimiento: p.nombre, color: p.proceso.color, medida: r.unidad_medida, total: 0, tecnicos: new Set(), reportes: new Set() });
      const f = filas.get(clave);
      f.total += valor;
      f.tecnicos.add(r.perfil_id);
      f.reportes.add(r.id);
    }
  }
  return [...unidades.entries()]
    .map(([unidad, filas]) => ({ unidad, filas: [...filas.values()].sort((a, b) => porNombre(a.proceso, b.proceso) || porNombre(a.procedimiento, b.procedimiento)) }))
    .sort((a, b) => (a.unidad.startsWith("SIN UNIDAD") ? 1 : 0) - (b.unidad.startsWith("SIN UNIDAD") ? 1 : 0) || porNombre(a.unidad, b.unidad));
}
 
// Textos cortos de las series de un reporte para la tabla del informe.
export function resumenSeries(r) {
  const ds = r.detalles;
  const series = [...new Set(ds.map((d) => [d.unidad, d.serie || d.tipo_documento].filter(Boolean).join(" — ")).filter(Boolean))];
  const desde = ds.map((d) => d.anio_desde).filter(Boolean), hasta = ds.map((d) => d.anio_hasta).filter(Boolean);
  const corrD = ds.map((d) => d.correlativo_desde).filter((x) => x !== null && x !== undefined);
  const corrH = ds.map((d) => d.correlativo_hasta).filter((x) => x !== null && x !== undefined);
  const fecD = ds.map((d) => d.fecha_desde).filter(Boolean).sort(), fecH = ds.map((d) => d.fecha_hasta).filter(Boolean).sort();
  const rango = (a, b) => (a === b ? String(a) : `${a}–${b}`);
  return {
    series: series.length > 3 ? [...series.slice(0, 3), `y ${series.length - 3} más`] : series,
    anios: desde.length ? rango(Math.min(...desde), Math.max(...(hasta.length ? hasta : desde))) : "",
    rangos: corrD.length ? rango(Math.min(...corrD), Math.max(...(corrH.length ? corrH : corrD)))
      : fecD.length ? rango(fecD[0], fecH.length ? fecH[fecH.length - 1] : fecD[0]) : "",
  };
}
 
// Cuántos reportes faltan revisar (para avisar que el informe es un borrador).
export function pendientesDeRevision(reportes) {
  return {
    sinRevisar: reportes.filter((r) => r.estado === "pendiente").length,
    observados: reportes.filter((r) => r.estado === "observado").length,
  };
}
 