// Estado de cada día del mes para el calendario del técnico.
import { diasEntre, diaSemana, inicioMes, finMes, hoyLima } from "./fechas.js";

// r = reportado, l = registrado tarde, f = faltó, j = justificado, h = feriado/evento, w = fin de semana, x = futuro
export function estadosDelMes(mesIso, reportes, noLaborables, justificaciones) {
  const hoy = hoyLima();
  const conReporte = new Map();
  reportes.forEach((r) => {
    const prev = conReporte.get(r.fecha);
    conReporte.set(r.fecha, prev === "r" ? "r" : r.tardio ? "l" : "r");
  });
  const libres = new Map(noLaborables.map((d) => [d.fecha, d.motivo]));
  const justif = new Map(justificaciones.map((j) => [j.fecha, j.motivo]));
  return diasEntre(inicioMes(mesIso), finMes(mesIso)).map((fecha) => {
    let estado;
    if (conReporte.has(fecha)) estado = conReporte.get(fecha);
    else if (diaSemana(fecha) > 5) estado = "w";
    else if (libres.has(fecha)) estado = "h";
    else if (justif.has(fecha)) estado = "j";
    else if (fecha >= hoy) estado = "x";
    else estado = "f";
    return { fecha, estado, motivo: libres.get(fecha) || justif.get(fecha) || "" };
  });
}

// Totales del mes por unidad de medida (nunca se suman unidades distintas).
export function totalesPorMedida(reportes) {
  const m = new Map();
  reportes.forEach((r) => m.set(r.unidad_medida, (m.get(r.unidad_medida) || 0) + Number(r.cantidad || 0)));
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}
