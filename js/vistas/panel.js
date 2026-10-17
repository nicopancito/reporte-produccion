// Panel del mes: cuánto se produjo, qué falta revisar y quién no reportó hoy.
import { $, esc, formatoNumero, medida } from "../util/dom.js";
import { hoyLima, finMes, nombreMes, diaSemana } from "../logica/fechas.js";
import { totalesPorMedida } from "../logica/cumplimiento.js";
import { reportesDeTodos, cumplimiento, perfilesQueReportan, diasNoLaborables } from "../datos/gestion.js";
import { cap } from "./tarjeta-reporte.js";

export async function vistaPanel(perfil, params) {
  const mes = params.get("mes") || hoyLima().slice(0, 7);
  const desde = mes + "-01", hasta = finMes(desde), hoy = hoyLima();
  const [reportes, cumpl, gente, libres] = await Promise.all([
    reportesDeTodos(desde, hasta), cumplimiento(desde, hasta), perfilesQueReportan(), diasNoLaborables(hoy, hoy),
  ]);
  const pendientes = reportes.filter((r) => r.estado === "pendiente").length;
  const observados = reportes.filter((r) => r.estado === "observado").length;
  const esperados = cumpl.reduce((s, c) => s + c.dias_esperados, 0);
  const hechos = cumpl.reduce((s, c) => s + c.dias_reportados, 0);
  const general = esperados ? Math.round((100 * hechos) / esperados) : null;

  // Hoy (solo si el mes mostrado es el actual y hoy es hábil)
  let hoyHTML = "";
  if (mes === hoy.slice(0, 7) && diaSemana(hoy) <= 5 && !libres.length) {
    const conReporte = new Set(reportes.filter((r) => r.fecha === hoy).map((r) => r.perfil_id));
    const faltan = gente.filter((g) => !conReporte.has(g.id));
    hoyHTML = `<div class="card"><h3>Hoy: ${conReporte.size} de ${gente.length} ya reportaron</h3>
      ${faltan.length ? `<p class="small muted" style="margin:8px 0 0">Aún no: ${faltan.map((g) => esc(nombreCorto(g.nombre))).join(", ")}</p>` : `<p class="small" style="color:var(--ok)">Todos reportaron.</p>`}</div>`;
  }

  // Por proceso, separado por unidad de medida
  const porProceso = new Map();
  reportes.forEach((r) => {
    const p = r.procedimiento.proceso;
    if (!porProceso.has(p.id)) porProceso.set(p.id, { p, n: 0, medidas: new Map() });
    const x = porProceso.get(p.id);
    x.n++;
    x.medidas.set(r.unidad_medida, (x.medidas.get(r.unidad_medida) || 0) + Number(r.cantidad));
  });
  const procesosHTML = [...porProceso.values()].sort((a, b) => b.n - a.n).map(({ p, n, medidas }) =>
    `<tr><td><span style="color:${esc(p.color)}">${esc(p.icono)}</span> ${esc(cap(p.nombre))}</td><td class="num">${n}</td>
      <td>${[...medidas].map(([m, v]) => `<b class="num">${formatoNumero(v)}</b> ${esc(medida(m))}`).join(" · ")}</td></tr>`).join("");

  const totales = totalesPorMedida(reportes);
  const bajos = [...cumpl].filter((c) => c.porcentaje !== null).sort((a, b) => a.porcentaje - b.porcentaje).slice(0, 8);

  return `
  <div class="head"><div><div class="eyebrow">Gestión</div><h1>Panel de producción</h1><p>${esc(nombreMes(desde))}${perfil.rol === "supervisor" ? "" : " · solo lectura"}</p></div>
    <div class="filtros"><div class="f"><label for="mes">Mes</label><input type="month" id="mes" value="${mes}" max="${hoy.slice(0, 7)}"></div></div></div>
  <div class="grid g4">
    <div class="card stat"><small>Reportes del mes</small><div class="big num">${reportes.length}</div></div>
    <div class="card stat"><small>Sin revisar</small><div class="big num">${pendientes}</div>${pendientes ? `<a class="small" href="#revisar?mes=${mes}&estado=pendiente">Revisar</a>` : ""}</div>
    <div class="card stat"><small>Observados</small><div class="big num">${observados}</div></div>
    <div class="card stat"><small>Cumplimiento general</small><div class="big num">${general === null ? "—" : general + "%"}</div>
      ${general === null ? "" : `<div class="meter" style="margin-top:8px"><i style="width:${general}%"></i></div>`}</div>
  </div>
  ${hoyHTML}
  <div class="grid g2">
    <div class="card"><h3>Producción por proceso</h3>
      ${procesosHTML ? `<div class="tablewrap" style="margin-top:12px"><table><thead><tr><th>Proceso</th><th>Reportes</th><th>Cantidad</th></tr></thead><tbody>${procesosHTML}</tbody></table></div>` : `<p class="muted small">Sin reportes.</p>`}</div>
    <div class="grid">
      <div class="card"><h3>Total del mes por unidad de medida</h3>
        ${totales.length ? totales.map(([m, v]) => `<div class="kv"><span>${esc(medida(m))}</span><b class="num">${formatoNumero(v)}</b></div>`).join("") : `<p class="muted small">Sin reportes.</p>`}</div>
      <div class="card"><h3>Cumplimiento más bajo</h3>
        ${bajos.length ? `<div class="bars" style="margin-top:12px">${bajos.map((c) => `<div class="bar"><span title="${esc(c.nombre)}">${esc(nombreCorto(c.nombre))}</span><div class="meter"><i style="width:${c.porcentaje}%"></i></div><b class="num">${c.porcentaje}%</b></div>`).join("")}</div>
          <p class="small" style="margin-top:10px"><a href="#cumplimiento?mes=${mes}">Ver cumplimiento completo</a></p>` : `<p class="muted small">Sin días hábiles todavía.</p>`}</div>
    </div>
  </div>`;
}

export function montarPanel() {
  $("#mes").addEventListener("change", (e) => { if (e.target.value) location.hash = "#panel?mes=" + e.target.value; });
}

export function nombreCorto(n) {
  const p = String(n || "").split(/\s+/).filter((x) => !["DE", "LA", "DEL", "LOS", "LAS", "Y"].includes(x));
  const c = (s) => (s ? s[0] + s.slice(1).toLowerCase() : "");
  return p.length >= 3 ? `${c(p[2])} ${c(p[0])}` : c(n);
}
