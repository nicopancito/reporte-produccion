// Inicio del técnico: hoy, días que faltan, calendario del mes y totales.
import { esc, formatoNumero, medida } from "../util/dom.js";
import { hoyLima, inicioMes, finMes, nombreMes, fechaLarga, fechaCorta, sumarDias } from "../logica/fechas.js";
import { estadosDelMes, totalesPorMedida } from "../logica/cumplimiento.js";
import { misReportes, diasNoLaborables, misJustificaciones, miCumplimiento } from "../datos/reportes.js";
import { DIAS_ATRASO_MAX } from "../config.js";

const LEYENDA = [["r", "c-ok", "Reportado"], ["l", "c-late", "Registrado tarde"], ["f", "c-bad", "Falta"], ["j", "c-info", "Justificado"], ["h", "c-mute", "Feriado o evento"]];

export async function vistaInicio(perfil) {
  if (!perfil.reporta_produccion) {
    return `<div class="head"><div><div class="eyebrow">Bienvenido</div><h1>Hola, ${esc(nombreCorto(perfil.nombre))}</h1>
      <p>Tu cuenta es de consulta. El panel con la producción de todos llega en la etapa 3.</p></div></div>`;
  }
  const hoy = hoyLima(), desde = inicioMes(hoy), hasta = finMes(hoy);
  const [reportes, libres, justif, cumpl] = await Promise.all([
    misReportes(perfil.id, desde, hasta), diasNoLaborables(desde, hasta), misJustificaciones(perfil.id, desde, hasta),
    miCumplimiento(perfil.id, desde, hoy),
  ]);
  const dias = estadosDelMes(hoy, reportes, libres, justif);
  const deHoy = dias.find((d) => d.fecha === hoy);
  const hechosHoy = reportes.filter((r) => r.fecha === hoy).length;
  const limite = sumarDias(hoy, -DIAS_ATRASO_MAX);
  const faltan = dias.filter((d) => d.estado === "f");

  let hoyHTML;
  if (deHoy.estado === "w" || deHoy.estado === "h") {
    hoyHTML = `<div class="card today libre"><div><span class="chip c-mute">${deHoy.estado === "h" ? esc(deHoy.motivo) : "Fin de semana"}</span>
      <h2>Hoy no es día laborable</h2><p class="muted">${esc(fechaLarga(hoy))}</p></div></div>`;
  } else if (hechosHoy) {
    hoyHTML = `<div class="card today done"><div><span class="chip c-ok">Listo</span>
      <h2>Ya registraste ${hechosHoy === 1 ? "1 actividad" : hechosHoy + " actividades"} hoy</h2>
      <p class="muted">Si hiciste otra actividad, regístrala también.</p></div>
      <div><a class="btn ghost" href="#registrar">Registrar otra</a></div></div>`;
  } else {
    hoyHTML = `<div class="card today"><div><span class="chip c-warn">Pendiente</span>
      <h2>Registra tu producción de hoy</h2><p class="muted">${esc(fechaLarga(hoy))}</p></div>
      <div><a class="btn primary big" href="#registrar">Registrar producción</a></div></div>`;
  }

  const recientes = faltan.filter((d) => d.fecha >= limite);
  const vencidos = faltan.filter((d) => d.fecha < limite);
  const faltanHTML = !faltan.length ? "" : `<div class="miss"><div>Te ${faltan.length === 1 ? "falta 1 día" : `faltan ${faltan.length} días`} este mes
      ${vencidos.length ? `<div class="small" style="font-weight:600">${vencidos.map((d) => esc(fechaCorta(d.fecha))).join(", ")}: pasó el plazo de ${DIAS_ATRASO_MAX} días, avisa al supervisor.</div>` : ""}</div>
    <div class="pend">${recientes.map((d) => `<a class="btn sm ghost" href="#registrar?fecha=${d.fecha}">Registrar ${esc(fechaCorta(d.fecha))}</a>`).join("")}</div></div>`;

  const primerDia = new Date(desde + "T12:00:00Z").getUTCDay() || 7;
  const calHTML = ["L", "M", "M", "J", "V", "S", "D"].map((x) => `<div class="dow">${x}</div>`).join("")
    + Array.from({ length: primerDia - 1 }, () => `<div class="day vacio"></div>`).join("")
    + dias.map((d) => `<div class="day ${d.estado}${d.fecha === hoy ? " t" : ""}" title="${esc(fechaCorta(d.fecha) + (d.motivo ? " · " + d.motivo : ""))}">${Number(d.fecha.slice(8))}</div>`).join("");

  const totales = totalesPorMedida(reportes);
  const pct = cumpl?.porcentaje ?? null;

  return `
  <div class="head"><div><div class="eyebrow">Mi trabajo</div><h1>Hola, ${esc(nombreCorto(perfil.nombre))}</h1>
    <p>${esc(perfil.archivo === "ARCHIVO CENTRAL" ? "Archivo Central" : "Archivo de Gestión")} · ${esc(nombreMes(hoy))}</p></div></div>
  ${hoyHTML}
  ${faltanHTML}
  <div class="grid g2">
    <div class="card"><h3>Mi mes</h3><div class="cal" style="margin-top:12px">${calHTML}</div>
      <div class="legend">${LEYENDA.map(([, c, t]) => `<span class="chip ${c}">${t}</span>`).join("")}</div></div>
    <div class="grid">
      <div class="card stat"><small>Cumplimiento del mes</small><div class="big num">${pct === null ? "—" : pct + "%"}</div>
        ${pct === null ? "" : `<div class="meter" style="margin-top:8px"><i style="width:${pct}%"></i></div>
        <p class="small muted">${cumpl.dias_reportados} de ${cumpl.dias_esperados} días hábiles reportados${cumpl.dias_justificados ? ` · ${cumpl.dias_justificados} justificados` : ""}</p>`}</div>
      <div class="card"><h3>Lo que llevo este mes</h3>
        ${totales.length ? totales.map(([m, v]) => `<div class="kv"><span>${esc(medida(m))}</span><b class="num">${formatoNumero(v)}</b></div>`).join("") : `<p class="muted small">Aún no hay reportes este mes.</p>`}
        <p class="small muted" style="margin-top:8px">${reportes.length} ${reportes.length === 1 ? "reporte" : "reportes"} · <a href="#mis-reportes">ver todos</a></p></div>
    </div>
  </div>`;
}

function nombreCorto(n) {
  // Padrón: APELLIDO APELLIDO NOMBRES → primer nombre + primer apellido
  const p = String(n || "").split(/\s+/).filter((x) => !["DE", "LA", "DEL", "LOS", "LAS", "Y"].includes(x));
  const cap = (s) => (s ? s[0] + s.slice(1).toLowerCase() : "");
  return p.length >= 3 ? `${cap(p[2])} ${cap(p[0])}` : cap(n);
}
