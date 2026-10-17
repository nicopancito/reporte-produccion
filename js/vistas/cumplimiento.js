// Cumplimiento del mes: días reportados por técnico, justificaciones, eventos SALUDPOL y cierre de mes.
import { $, esc, avisar, mensajeError } from "../util/dom.js";
import { hoyLima, finMes, nombreMes, fechaLarga, fechaCorta } from "../logica/fechas.js";
import {
  cumplimiento, diasFaltantes, justificaciones, justificar, quitarJustificacion,
  diasNoLaborables, agregarEvento, quitarEvento, cierre, cerrarMes, reabrirMes, reportesDeTodos,
} from "../datos/gestion.js";
import { nombreCorto } from "./panel.js";

let perfil, mes, desde, hasta, filas = [], justif = [], cerrado = null;
const esSupervisor = () => perfil.rol === "supervisor";

export async function vistaCumplimiento(p, params) {
  perfil = p;
  mes = params.get("mes") || hoyLima().slice(0, 7);
  desde = mes + "-01";
  hasta = finMes(desde);
  return `<div class="head"><div><div class="eyebrow">Gestión</div><h1>Cumplimiento</h1>
      <p>Días con al menos un reporte ÷ días hábiles (sin fines de semana, feriados, eventos SALUDPOL ni días justificados).</p></div>
    <div class="filtros"><div class="f"><label for="mes">Mes</label><input type="month" id="mes" value="${mes}" max="${hoyLima().slice(0, 7)}"></div></div></div>
    <div id="cierre"></div>
    <div class="card"><div class="tablewrap"><table><thead><tr><th>Técnico</th><th>Archivo</th><th>Reportados</th><th>Justificados</th><th>Faltan</th><th style="min-width:140px">Cumplimiento</th></tr></thead>
      <tbody id="filas"><tr><td colspan="6" class="cargando-vista">Cargando…</td></tr></tbody></table></div>
      <p class="small muted" style="margin:10px 0 0">${esSupervisor() ? "Toca una fila para ver los días que faltan y justificarlos." : "Toca una fila para ver los días que faltan."}</p></div>
    <div class="card" id="eventos"></div>`;
}

export function montarCumplimiento() {
  $("#mes").addEventListener("change", (e) => { if (e.target.value) location.hash = "#cumplimiento?mes=" + e.target.value; });
  $("#filas").addEventListener("click", alClicFila);
  $("#eventos").addEventListener("click", alClicEventos);
  $("#cierre").addEventListener("click", alClicCierre);
  cargar();
}

async function cargar() {
  [filas, justif, cerrado] = await Promise.all([cumplimiento(desde, hasta), justificaciones(desde, hasta), cierre(desde)]);
  pintarFilas();
  pintarEventos();
  pintarCierre();
}

function pintarFilas() {
  $("#filas").innerHTML = filas.map((f) => {
    const pct = f.porcentaje;
    const color = pct === null ? "var(--line)" : pct === 100 ? "var(--ok)" : pct < 60 ? "var(--bad)" : "var(--blue)";
    return `<tr class="click" data-perfil="${f.perfil_id}"><td><b>${esc(nombreCorto(f.nombre))}</b></td><td class="small">${f.archivo === "ARCHIVO CENTRAL" ? "AC" : "AG"}</td>
      <td class="num">${f.dias_reportados} / ${f.dias_esperados}</td><td class="num">${f.dias_justificados || ""}</td>
      <td class="num">${f.dias_faltantes ? `<span class="chip c-bad">${f.dias_faltantes}</span>` : ""}</td>
      <td><div class="pct"><div class="meter"><i style="width:${pct ?? 0}%;background:${color}"></i></div><b class="num">${pct === null ? "—" : pct + "%"}</b></div></td></tr>
      <tr hidden id="fila-${f.perfil_id}"><td colspan="6"></td></tr>`;
  }).join("") || `<tr><td colspan="6" class="vacio">No hay técnicos que reporten producción.</td></tr>`;
}

async function alClicFila(e) {
  const b = e.target.closest("button");
  if (b) return alClicDetalle(b);
  const tr = e.target.closest("tr[data-perfil]");
  if (!tr) return;
  const pid = Number(tr.dataset.perfil);
  const det = $(`#fila-${pid}`);
  if (!det.hidden) { det.hidden = true; return; }
  det.hidden = false;
  det.firstElementChild.innerHTML = `<span class="muted small">Cargando…</span>`;
  await pintarDetalle(pid);
}

async function pintarDetalle(pid) {
  const det = $(`#fila-${pid}`);
  const faltan = await diasFaltantes(pid, desde, hasta);
  const suyas = justif.filter((j) => j.perfil_id === pid);
  const editable = esSupervisor() && !cerrado;
  det.firstElementChild.innerHTML = `<div class="grid" style="gap:10px;padding:6px 0">
    ${faltan.length ? `<div><b class="small">Días sin reporte</b><div class="pend" style="margin-top:6px">${faltan.map((d) => `<span class="chip c-bad">${esc(fechaCorta(d))}</span>${editable ? `<button type="button" class="btn sm ghost" data-justificar="${pid}" data-fecha="${d}">Justificar</button>` : ""}`).join("")}</div></div>` : `<span class="small" style="color:var(--ok)">No le falta ningún día.</span>`}
    ${suyas.length ? `<div><b class="small">Justificados</b>${suyas.map((j) => `<div class="kv small"><span>${esc(fechaLarga(j.fecha))}: ${esc(j.motivo)}</span>${editable ? `<button type="button" class="btn sm danger" data-quitar-just="${j.id}" data-perfil="${pid}">Quitar</button>` : ""}</div>`).join("")}</div>` : ""}
    <div class="small"><a href="#revisar?mes=${mes}&tecnico=${pid}&estado=">Ver sus reportes del mes</a></div>
  </div>`;
}

async function alClicDetalle(b) {
  try {
    if (b.dataset.justificar) {
      const motivo = prompt(`Motivo de la justificación del ${fechaLarga(b.dataset.fecha)} (descanso médico, comisión, permiso…):`);
      if (!motivo?.trim()) return;
      await justificar(Number(b.dataset.justificar), b.dataset.fecha, motivo.trim());
      avisar("Día justificado.");
    } else if (b.dataset.quitarJust) {
      await quitarJustificacion(Number(b.dataset.quitarJust));
      avisar("Justificación quitada.");
    } else return;
    const pid = Number(b.dataset.justificar || b.dataset.perfil);
    [filas, justif] = await Promise.all([cumplimiento(desde, hasta), justificaciones(desde, hasta)]);
    pintarFilas();
    $(`#fila-${pid}`).hidden = false;
    await pintarDetalle(pid);
  } catch (err) {
    avisar(mensajeError(err), "bad");
  }
}

// ---------- eventos SALUDPOL ----------
async function pintarEventos() {
  const dias = await diasNoLaborables(desde, hasta);
  const editable = (esSupervisor() || perfil.rol === "programador") && !cerrado;
  $("#eventos").innerHTML = `<h3>Feriados y eventos SALUDPOL</h3>
    <p class="small muted" style="margin:4px 0 10px">Días sin producción para todos. No cuentan como falta.</p>
    ${dias.length ? dias.map((d) => `<div class="kv small"><span>${esc(fechaLarga(d.fecha))} · ${esc(d.motivo)} <span class="chip ${d.tipo === "feriado" ? "c-mute" : "c-info"}">${d.tipo === "feriado" ? "Feriado" : "Evento"}</span></span>
      ${editable && d.tipo === "evento" ? `<button type="button" class="btn sm danger" data-quitar-evento="${d.fecha}">Quitar</button>` : ""}</div>`).join("") : `<p class="small muted">Ninguno este mes.</p>`}
    ${editable ? `<div class="form f3" style="margin-top:12px;align-items:end">
      <div class="f"><label for="evFecha">Fecha</label><input type="date" id="evFecha" min="${desde}" max="${hasta}"></div>
      <div class="f"><label for="evMotivo">Motivo</label><input id="evMotivo" placeholder="Ej. aniversario SALUDPOL"></div>
      <div class="f"><button type="button" class="btn primary" id="evAgregar">Agregar evento</button></div></div>` : ""}`;
}

async function alClicEventos(e) {
  const b = e.target.closest("button");
  if (!b) return;
  try {
    if (b.id === "evAgregar") {
      const fecha = $("#evFecha").value, motivo = $("#evMotivo").value.trim();
      if (!fecha || !motivo) return avisar("Indica la fecha y el motivo.", "bad");
      await agregarEvento(fecha, motivo);
      avisar("Evento agregado.");
    } else if (b.dataset.quitarEvento) {
      await quitarEvento(b.dataset.quitarEvento);
      avisar("Evento quitado.");
    } else return;
    await pintarEventos();
    filas = await cumplimiento(desde, hasta);
    pintarFilas();
  } catch (err) {
    avisar(/duplicate key/.test(err.message || "") ? "Ese día ya está marcado como no laborable." : mensajeError(err), "bad");
  }
}

// ---------- cierre de mes ----------
function pintarCierre() {
  const caja = $("#cierre");
  if (cerrado) {
    caja.innerHTML = `<div class="aviso ok" style="justify-content:space-between;flex-wrap:wrap"><span>El mes de ${esc(nombreMes(desde))} está cerrado desde el ${esc(fechaLarga(cerrado.cerrado_en.slice(0, 10)))}. Los reportes ya no se pueden cambiar y el informe mensual sale como definitivo.</span>
      ${esSupervisor() ? `<button type="button" class="btn sm ghost" id="reabrir">Reabrir mes</button>` : ""}</div>`;
  } else {
    caja.innerHTML = `<div class="aviso warn" style="justify-content:space-between;flex-wrap:wrap"><span>El mes de ${esc(nombreMes(desde))} está abierto: los técnicos aún pueden corregir y el informe mensual sale como borrador.</span>
      ${esSupervisor() ? `<button type="button" class="btn sm primary" id="cerrar">Cerrar mes</button>` : ""}</div>`;
  }
}

async function alClicCierre(e) {
  const b = e.target.closest("button");
  if (!b) return;
  try {
    if (b.id === "cerrar") {
      const rep = await reportesDeTodos(desde, hasta);
      const pend = rep.filter((r) => r.estado === "pendiente").length, obs = rep.filter((r) => r.estado === "observado").length;
      const aviso = pend || obs ? `\n\nOjo: quedan ${pend} sin revisar y ${obs} observados.` : "";
      if (!confirm(`¿Cerrar ${nombreMes(desde)}? Nadie podrá registrar, corregir ni revisar reportes de ese mes.${aviso}`)) return;
      await cerrarMes(desde);
      avisar("Mes cerrado.");
    } else if (b.id === "reabrir") {
      if (!confirm(`¿Reabrir ${nombreMes(desde)}? Los reportes se podrán corregir otra vez.`)) return;
      await reabrirMes(desde);
      avisar("Mes reabierto.");
    }
    cerrado = await cierre(desde);
    pintarCierre();
    pintarEventos();
    $$(`tr[id^="fila-"]`).forEach((x) => (x.hidden = true));
  } catch (err) {
    avisar(mensajeError(err), "bad");
  }
}
const $$ = (s) => [...document.querySelectorAll(s)];
