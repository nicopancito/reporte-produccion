// Revisar reportes: el supervisor marca Revisado, Observa (con texto) o Corrige. El administrador solo mira.
import { $, esc, avisar, mensajeError } from "../util/dom.js";
import { hoyLima, finMes, nombreMes } from "../logica/fechas.js";
import { reportesDeTodos, perfilesQueReportan, revisarReporte, cierre } from "../datos/gestion.js";
import { cargarCatalogos } from "../datos/catalogos.js";
import { tarjetaReporte, activarDetalles, cap } from "./tarjeta-reporte.js";
import { nombreCorto } from "./panel.js";

let perfil, filtro, reportes = [], cerrado = false;

export async function vistaRevisar(p, params) {
  perfil = p;
  const supervisor = p.rol === "supervisor";
  filtro = {
    mes: params.get("mes") || hoyLima().slice(0, 7),
    tecnico: params.get("tecnico") || "",
    estado: params.has("estado") ? params.get("estado") : supervisor ? "pendiente" : "",
    proceso: params.get("proceso") || "",
  };
  const [gente, cat] = await Promise.all([perfilesQueReportan(), cargarCatalogos()]);
  const op = (v, t, sel) => `<option value="${esc(v)}"${String(v) === String(sel) ? " selected" : ""}>${esc(t)}</option>`;
  return `<div class="head"><div><div class="eyebrow">Gestión</div><h1>${supervisor ? "Revisar reportes" : "Reportes"}</h1>
      <p>${supervisor ? "Marca cada reporte como revisado u obsérvalo para que el técnico lo corrija." : "Vista de solo lectura."}</p></div></div>
    <div class="card filtros" id="filtros">
      <div class="f"><label for="fMes">Mes</label><input type="month" id="fMes" value="${filtro.mes}" max="${hoyLima().slice(0, 7)}"></div>
      <div class="f"><label for="fTec">Técnico</label><select id="fTec">${op("", "Todos", filtro.tecnico)}${gente.map((g) => op(g.id, nombreCorto(g.nombre), filtro.tecnico)).join("")}</select></div>
      <div class="f"><label for="fEstado">Estado</label><select id="fEstado">${op("", "Todos", filtro.estado)}${op("pendiente", "Sin revisar", filtro.estado)}${op("observado", "Observados", filtro.estado)}${op("revisado", "Revisados", filtro.estado)}</select></div>
      <div class="f"><label for="fProceso">Proceso</label><select id="fProceso">${op("", "Todos", filtro.proceso)}${cat.procesos.map((x) => op(x.id, cap(x.nombre), filtro.proceso)).join("")}</select></div>
    </div>
    <div id="resumen"></div>
    <div id="lista" class="list"><div class="cargando-vista">Cargando…</div></div>`;
}

export function montarRevisar() {
  $("#filtros").addEventListener("change", () => {
    const q = new URLSearchParams({ mes: $("#fMes").value || filtro.mes, tecnico: $("#fTec").value, estado: $("#fEstado").value, proceso: $("#fProceso").value });
    location.hash = "#revisar?" + q;
  });
  const lista = $("#lista");
  activarDetalles(lista);
  lista.addEventListener("click", alClic);
  $("#resumen").addEventListener("click", (e) => { if (e.target.closest("#todosRevisados")) marcarTodos(); });
  cargar();
}

async function cargar() {
  const desde = filtro.mes + "-01";
  const [datos, c] = await Promise.all([
    reportesDeTodos(desde, finMes(desde), { perfilId: filtro.tecnico || null, estado: filtro.estado || null }),
    cierre(desde),
  ]);
  reportes = filtro.proceso ? datos.filter((r) => String(r.procedimiento.proceso.id) === filtro.proceso) : datos;
  cerrado = !!c;
  pintar();
}

const puedeActuar = () => perfil.rol === "supervisor" && !cerrado;

function acciones(r) {
  if (!puedeActuar()) return "";
  return (r.estado !== "revisado" ? `<button type="button" class="btn sm primary" data-revisado="${r.id}">Revisado</button>` : "")
    + `<button type="button" class="btn sm ghost" data-observar="${r.id}">${r.estado === "observado" ? "Editar observación" : "Observar"}</button>`
    + `<a class="btn sm ghost" href="#corregir/${r.id}">Corregir</a>`;
}

function pintar() {
  const lista = $("#lista");
  if (!lista) return;
  const pendientes = reportes.filter((r) => r.estado === "pendiente").length;
  $("#resumen").innerHTML = (cerrado ? `<div class="aviso">El mes de ${esc(nombreMes(filtro.mes + "-01"))} está cerrado: no se puede revisar ni corregir.</div>` : "")
    + `<div class="wfoot" style="align-items:center"><span class="muted small">${reportes.length} ${reportes.length === 1 ? "reporte" : "reportes"}${pendientes ? ` · ${pendientes} sin revisar` : ""}</span>
      ${puedeActuar() && pendientes ? `<button type="button" class="btn sm ghost" id="todosRevisados">Marcar los ${pendientes} sin revisar como revisados</button>` : ""}</div>`;
  lista.innerHTML = reportes.length
    ? reportes.map((r) => tarjetaReporte(r, { tecnico: true, acciones: acciones(r) })).join("")
    : `<div class="card vacio">No hay reportes con estos filtros.</div>`;
}

async function alClic(e) {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.revisado) return cambiar(b, Number(b.dataset.revisado), "revisado");
  if (b.dataset.observar) {
    const item = b.closest(".item");
    if (item.querySelector(".obs-form")) return;
    const r = reportes.find((x) => x.id === Number(b.dataset.observar));
    item.insertAdjacentHTML("beforeend", `<div class="obs-form"><label class="small" style="font-weight:800" for="obs-${r.id}">¿Qué debe corregir el técnico?</label>
      <textarea id="obs-${r.id}">${esc(r.observacion_supervisor || "")}</textarea>
      <div style="display:flex;gap:6px"><button type="button" class="btn sm primary" data-guardar-obs="${r.id}">Guardar observación</button>
      <button type="button" class="btn sm ghost" data-cancelar-obs>Cancelar</button></div></div>`);
    item.querySelector("textarea").focus();
    return;
  }
  if (b.dataset.cancelarObs !== undefined) return b.closest(".obs-form").remove();
  if (b.dataset.guardarObs) {
    const texto = b.closest(".obs-form").querySelector("textarea").value.trim();
    if (!texto) return avisar("Escribe qué hay que corregir.", "bad");
    return cambiar(b, Number(b.dataset.guardarObs), "observado", texto);
  }
}

async function cambiar(boton, id, estado, observacion = null) {
  boton.classList.add("cargando");
  try {
    await revisarReporte(id, estado, observacion);
    const r = reportes.find((x) => x.id === id);
    r.estado = estado;
    r.observacion_supervisor = observacion;
    // Si se filtra por "sin revisar", el reporte sale de la lista
    if (filtro.estado && filtro.estado !== estado) reportes = reportes.filter((x) => x.id !== id);
    pintar();
    avisar(estado === "revisado" ? "Marcado como revisado." : "Observación enviada al técnico.");
  } catch (err) {
    boton.classList.remove("cargando");
    avisar(mensajeError(err), "bad");
  }
}

async function marcarTodos() {
  const ids = reportes.filter((r) => r.estado === "pendiente").map((r) => r.id);
  if (!confirm(`¿Marcar ${ids.length} reportes como revisados?`)) return;
  const btn = $("#todosRevisados");
  btn.classList.add("cargando");
  let errores = 0;
  for (const id of ids) {
    try {
      await revisarReporte(id, "revisado");
      reportes.find((x) => x.id === id).estado = "revisado";
    } catch { errores++; }
  }
  if (filtro.estado === "pendiente") reportes = reportes.filter((r) => r.estado === "pendiente");
  pintar();
  avisar(errores ? `${ids.length - errores} revisados, ${errores} con error.` : `${ids.length} reportes marcados como revisados.`, errores ? "bad" : "");
}
