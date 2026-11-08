// Informe mensual: por técnico, consolidado del equipo y resumen por unidad de organización.
// Lo ven supervisor y administrador; solo el supervisor descarga (PDF, imagen y Excel).
import { $, esc, avisar, formatoNumero, mensajeError, medida } from "../util/dom.js";
import { hoyLima, finMes, nombreMes, fechaCorta, diaSemana } from "../logica/fechas.js";
import { estadosDelMes, totalesPorMedida } from "../logica/cumplimiento.js";
import { totalesPorProcedimiento, resumenPorUnidad, resumenSeries, pendientesDeRevision } from "../logica/informe.js";
import { reportesDeTodos, cumplimiento, perfilesQueReportan, cierre, diasNoLaborables, justificaciones } from "../datos/gestion.js";
import { imprimir, descargarImagen, descargarExcel } from "../util/exportar.js";
import { ESTADOS, cap } from "./tarjeta-reporte.js";
 
let perfil, mes, desde, hasta, ver, d = null;
const puedeDescargar = () => perfil.rol === "supervisor";
const ARCHIVO = { "ARCHIVO CENTRAL": "Archivo Central", "ARCHIVO DE GESTIÓN": "Archivo de Gestión" };
 
export async function vistaInforme(p, params) {
  perfil = p;
  mes = params.get("mes") || hoyLima().slice(0, 7);
  desde = mes + "-01";
  hasta = finMes(desde);
  ver = params.get("ver") || "equipo";
  d = null;
  return `<div class="head"><div><div class="eyebrow">Gestión</div><h1>Informe mensual</h1>
      <p>Se arma solo con lo que cada técnico registró. Las unidades de medida distintas nunca se suman entre sí.</p></div>
    <div class="filtros">
      <div class="f"><label for="mes">Mes</label><input type="month" id="mes" value="${mes}" max="${hoyLima().slice(0, 7)}"></div>
      <div class="f"><label for="ver">Ver</label><select id="ver"><option value="equipo">Consolidado del equipo</option></select></div></div></div>
    <div id="estadoMes"></div>
    ${puedeDescargar() ? `<div class="descargas">
      <button type="button" class="btn primary" data-accion="pdf">Descargar PDF</button>
      <button type="button" class="btn ghost" data-accion="png">Imagen PNG</button>
      <button type="button" class="btn ghost" data-accion="excel">Excel (datos)</button>
      <button type="button" class="btn ghost" data-accion="todos">PDF de todos los técnicos</button></div>`
    : `<p class="small muted">Solo el supervisor puede descargar los informes.</p>`}
    <div id="hoja"><div class="cargando-vista">Armando el informe…</div></div>`;
}
 
export function montarInforme() {
  $("#mes").addEventListener("change", (e) => { if (e.target.value) location.hash = `#informe?mes=${e.target.value}&ver=${ver}`; });
  $("#ver").addEventListener("change", (e) => {
    ver = e.target.value;
    history.replaceState(null, "", `#informe?mes=${mes}&ver=${ver}`);
    pintar();
  });
  $(".descargas")?.addEventListener("click", alClicDescarga);
  cargar().catch((err) => { $("#hoja").innerHTML = `<div class="card aviso bad">No se pudo armar el informe: ${esc(mensajeError(err))}</div>`; });
}
 
async function cargar() {
  const [reportes, cumpl, perfiles, cerrado, noLab, justif] = await Promise.all([
    reportesDeTodos(desde, hasta), cumplimiento(desde, hasta), perfilesQueReportan(),
    cierre(desde), diasNoLaborables(desde, hasta), justificaciones(desde, hasta),
  ]);
  reportes.sort((a, b) => a.fecha.localeCompare(b.fecha) || String(a.registrado_en).localeCompare(String(b.registrado_en)));
  // Técnicos: los activos que reportan y cualquiera que tenga reportes en el mes.
  const tecnicos = new Map(perfiles.map((t) => [t.id, t]));
  reportes.forEach((r) => { if (!tecnicos.has(r.perfil_id)) tecnicos.set(r.perfil_id, r.perfil || { id: r.perfil_id, nombre: "—", archivo: "" }); });
  d = {
    reportes, cerrado, noLab, justif,
    cumpl: new Map(cumpl.map((c) => [c.perfil_id, c])),
    tecnicos: [...tecnicos.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
  };
  $("#ver").innerHTML = `<option value="equipo">Consolidado del equipo</option><option value="unidad">Resumen por unidad</option>
    <optgroup label="Por técnico">${d.tecnicos.map((t) => `<option value="${t.id}">${esc(t.nombre)}</option>`).join("")}</optgroup>`;
  if (![...$("#ver").options].some((o) => o.value === ver)) ver = "equipo";
  $("#ver").value = ver;
  pintarEstado();
  pintar();
}
 
function pintarEstado() {
  const { sinRevisar, observados } = pendientesDeRevision(d.reportes);
  const faltan = [sinRevisar && `${sinRevisar} sin revisar`, observados && `${observados} observado${observados === 1 ? "" : "s"}`].filter(Boolean).join(" y ");
  $("#estadoMes").innerHTML = d.cerrado
    ? `<div class="aviso ok"><span>El mes está cerrado: el informe es definitivo.</span></div>`
    : `<div class="aviso warn"><span>El mes de ${esc(nombreMes(desde))} sigue abierto${faltan ? ` (quedan ${faltan})` : ""}. ${puedeDescargar() ? "Lo que descargues saldrá marcado como <b>borrador</b>; el definitivo sale después de cerrar el mes en Cumplimiento." : "Por ahora es un <b>borrador</b>; será definitivo cuando el supervisor cierre el mes."}</span></div>`;
}
 
function pintar() {
  if (!d) return;
  $("#hoja").innerHTML = hojaActual();
}
 
function hojaActual() {
  if (ver === "equipo") return hojaEquipo();
  if (ver === "unidad") return hojaUnidades();
  const t = d.tecnicos.find((x) => String(x.id) === ver);
  return t ? hojaTecnico(t) : hojaEquipo();
}
 
// ---------- piezas comunes de la hoja ----------
const periodo = () => { const [m, a] = nombreMes(desde).split(" "); return `1 al ${Number(hasta.slice(8))} de ${m} de ${a}`; };
const ahora = () => new Date().toLocaleString("es-PE", { timeZone: "America/Lima", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
 
function cabecera(titulo) {
  return `<div class="ph"><img src="img/logo.png" alt="Seguro Saludpol">
    <div class="ph-t"><div class="ph-sup">UFGDA · SISTEMA INSTITUCIONAL DE ARCHIVOS</div>
      <h2>${esc(titulo)} · ${esc(cap(nombreMes(desde)))}</h2>
      ${d.cerrado ? "" : `<span class="borrador">Borrador · mes abierto</span>`}</div></div>`;
}
 
const meta = (pares) => `<div class="meta">${pares.map(([k, v]) => `<div><small>${esc(k)}</small><b>${v}</b></div>`).join("")}</div>`;
 
function mosaicos(reportes) {
  const tot = totalesPorProcedimiento(reportes);
  if (!tot.length) return `<p class="pvacio">No hay producción registrada en el mes.</p>`;
  return `<div class="ptiles">${tot.map((t) => `<div class="ptile" style="border-top-color:${esc(t.color)}">
    <span class="pn">${esc(cap(t.procedimiento))}</span><span class="pv num">${formatoNumero(t.total)}</span>
    <span class="pu">${esc(medida(t.medida))} · ${esc(cap(t.proceso))} · ${t.reportes} reporte${t.reportes === 1 ? "" : "s"}</span></div>`).join("")}</div>`;
}
 
function pie(firmas) {
  return `<div class="sig">${firmas.map((f) => `<div>${esc(f)}</div>`).join("")}</div>
    <div class="pfoot"><span>Generado por el Sistema Institucional de Archivos el ${esc(ahora())}</span><span>Las unidades de medida distintas no se suman entre sí</span></div>`;
}
 
const TXT_DIA = { r: "Reportó", l: "Registrado tarde", f: "Sin reporte", j: "Justificado", h: "Feriado o evento", x: "Aún no llega" };
 
function franjaDias(reportes, pid) {
  const estados = estadosDelMes(desde, reportes, d.noLab, d.justif.filter((j) => j.perfil_id === pid)).filter((x) => diaSemana(x.fecha) <= 5);
  const color = new Map();
  reportes.forEach((r) => { if (!color.has(r.fecha)) color.set(r.fecha, r.procedimiento.proceso.color); });
  const procesos = new Map(reportes.map((r) => [r.procedimiento.proceso.nombre, r.procedimiento.proceso.color]));
  return `<div class="strip" style="grid-template-columns:repeat(${estados.length},minmax(0,1fr))">${estados.map((e) => {
    const n = Number(e.fecha.slice(8));
    const titulo = `${fechaCorta(e.fecha)}: ${TXT_DIA[e.estado]}${e.motivo ? " (" + e.motivo + ")" : ""}`;
    return ["r", "l"].includes(e.estado)
      ? `<div class="sd${e.estado === "l" ? " tarde" : ""}" style="background:${esc(color.get(e.fecha))}" title="${esc(titulo)}">${n}</div>`
      : `<div class="sd ${e.estado}" title="${esc(titulo)}">${n}</div>`;
  }).join("")}</div>
  <div class="sleg">${[...procesos].map(([nombre, c]) => `<span><i style="background:${esc(c)}"></i>${esc(cap(nombre))}</span>`).join("")}
    <span><i class="f"></i>Sin reporte</span><span><i class="j"></i>Justificado</span><span><i class="h"></i>Feriado o evento</span><span><i class="tarde"></i>Registrado tarde</span></div>`;
}
 
const porcentaje = (c) => (c && c.porcentaje !== null && c.porcentaje !== undefined ? `${c.porcentaje}%` : "—");
 
// ---------- hoja de un técnico ----------
function hojaTecnico(t) {
  const reps = d.reportes.filter((r) => r.perfil_id === t.id);
  const c = d.cumpl.get(t.id);
  const filas = reps.map((r) => {
    const s = resumenSeries(r);
    return `<tr><td class="num nowrap">${esc(fechaCorta(r.fecha))}</td>
      <td><b style="color:${esc(r.procedimiento.proceso.color)}">${esc(cap(r.procedimiento.proceso.nombre))}</b></td>
      <td>${esc(cap(r.procedimiento.nombre))}</td>
      <td>${s.series.map((x) => esc(cap(x))).join("<br>") || (r.unidad ? esc(cap(r.unidad)) : "")}</td>
      <td class="num nowrap">${esc(s.anios)}</td><td class="num">${esc(s.rangos)}</td>
      <td class="num nowrap"><b>${formatoNumero(r.cantidad)}</b> ${esc(medida(r.unidad_medida))}</td>
      <td class="nowrap">${ESTADOS[r.estado][1]}${r.tardio ? " · tarde" : ""}</td></tr>`;
  }).join("");
  return `<article class="paper">
    ${cabecera("Informe de producción")}
    ${meta([
      ["Técnico", esc(t.nombre)],
      ["Archivo", esc(ARCHIVO[t.archivo] || t.archivo || "—")],
      ["Días reportados", c ? `${c.dias_reportados} de ${c.dias_esperados} · ${porcentaje(c)}` : `${new Set(reps.map((r) => r.fecha)).size}`],
      ["Periodo", esc(periodo())],
    ])}
    <section><h3>Producción del mes</h3>${mosaicos(reps)}</section>
    <section><h3>Días hábiles del mes</h3>${franjaDias(reps, t.id)}</section>
    <section><h3>Detalle de reportes</h3>${reps.length ? `<div class="ptwrap"><table class="pt"><thead><tr><th>Fecha</th><th>Proceso</th><th>Procedimiento</th><th>Unidad / serie</th><th>Años</th><th>Correlativos / fechas</th><th>Producción</th><th>Estado</th></tr></thead>
      <tbody>${filas}</tbody></table></div>` : `<p class="pvacio">Sin reportes en el mes.</p>`}</section>
    ${pie(["Firma del técnico", "Visto bueno del supervisor"])}
  </article>`;
}
 
// ---------- consolidado del equipo ----------
function hojaEquipo() {
  const tot = totalesPorProcedimiento(d.reportes);
  const habiles = [...d.cumpl.values()][0]?.dias_habiles;
  const filasTec = d.tecnicos.map((t) => {
    const c = d.cumpl.get(t.id);
    const reps = d.reportes.filter((r) => r.perfil_id === t.id);
    const prod = totalesPorMedida(reps).map(([m, v]) => `${formatoNumero(v)} ${esc(medida(m))}`).join("<br>");
    return `<tr><td><b>${esc(t.nombre)}</b></td><td>${t.archivo === "ARCHIVO CENTRAL" ? "AC" : "AG"}</td>
      <td class="num">${c ? `${c.dias_reportados} / ${c.dias_esperados}` : "—"}</td><td class="num">${porcentaje(c)}</td>
      <td class="num">${prod || "—"}</td></tr>`;
  }).join("");
  const filasProc = tot.map((t) => `<tr><td><b style="color:${esc(t.color)}">${esc(cap(t.proceso))}</b></td><td>${esc(cap(t.procedimiento))}</td>
    <td class="num"><b>${formatoNumero(t.total)}</b></td><td>${esc(medida(t.medida))}</td><td class="num">${t.tecnicos.size}</td><td class="num">${t.reportes}</td></tr>`).join("");
  return `<article class="paper">
    ${cabecera("Consolidado de producción")}
    ${meta([
      ["Técnicos", String(d.tecnicos.length)],
      ["Reportes", String(d.reportes.length)],
      ["Días hábiles", habiles ?? "—"],
      ["Periodo", esc(periodo())],
    ])}
    <section><h3>Producción del equipo</h3>${mosaicos(d.reportes)}</section>
    <section><h3>Cumplimiento y producción por técnico</h3><div class="ptwrap"><table class="pt"><thead><tr><th>Técnico</th><th>Archivo</th><th>Días reportados</th><th>Cumplimiento</th><th>Producción</th></tr></thead>
      <tbody>${filasTec || `<tr><td colspan="5">No hay técnicos.</td></tr>`}</tbody></table></div></section>
    ${tot.length ? `<section><h3>Producción por procedimiento</h3><div class="ptwrap"><table class="pt"><thead><tr><th>Proceso</th><th>Procedimiento</th><th>Total</th><th>Unidad de medida</th><th>Técnicos</th><th>Reportes</th></tr></thead>
      <tbody>${filasProc}</tbody></table></div></section>` : ""}
    ${pie(["Supervisor", "Visto bueno de la jefatura"])}
  </article>`;
}
 
// ---------- resumen por unidad de organización ----------
function hojaUnidades() {
  const unidades = resumenPorUnidad(d.reportes);
  const bloques = unidades.map((u) => `<section class="unidad"><h3>${esc(u.unidad)}</h3><div class="ptwrap"><table class="pt"><thead><tr><th>Proceso</th><th>Procedimiento</th><th>Total</th><th>Unidad de medida</th><th>Técnicos</th><th>Reportes</th></tr></thead>
    <tbody>${u.filas.map((f) => `<tr><td><b style="color:${esc(f.color)}">${esc(cap(f.proceso))}</b></td><td>${esc(cap(f.procedimiento))}</td>
      <td class="num"><b>${formatoNumero(f.total)}</b></td><td>${esc(medida(f.medida))}</td><td class="num">${f.tecnicos.size}</td><td class="num">${f.reportes.size}</td></tr>`).join("")}</tbody></table></div></section>`).join("");
  return `<article class="paper">
    ${cabecera("Resumen por unidad de organización")}
    ${meta([
      ["Unidades atendidas", String(unidades.filter((u) => !u.unidad.startsWith("SIN UNIDAD")).length)],
      ["Reportes", String(d.reportes.length)],
      ["Técnicos", String(new Set(d.reportes.map((r) => r.perfil_id)).size)],
      ["Periodo", esc(periodo())],
    ])}
    <p class="pnota">Cada serie suma a la unidad de organización a la que pertenece. Las solicitudes de servicio se cuentan una sola vez por reporte.</p>
    ${bloques || `<p class="pvacio">No hay producción registrada en el mes.</p>`}
    ${pie(["Supervisor", "Visto bueno de la jefatura"])}
  </article>`;
}
 
// ---------- descargas ----------
function nombreArchivo(ext) {
  const quien = ver === "equipo" ? "consolidado" : ver === "unidad" ? "por-unidad"
    : (d.tecnicos.find((t) => String(t.id) === ver)?.nombre || "tecnico").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-");
  return `informe-${mes}-${quien}${d.cerrado ? "" : "-borrador"}${ext}`;
}
 
async function alClicDescarga(e) {
  const b = e.target.closest("[data-accion]");
  if (!b || !d) return;
  const texto = b.textContent;
  b.classList.add("cargando");
  b.textContent = "Preparando…";
  try {
    const accion = b.dataset.accion;
    if (accion === "pdf") imprimir(hojaActual(), nombreArchivo(""));
    else if (accion === "todos") imprimir(d.tecnicos.map(hojaTecnico).join(""), `informe-${mes}-todos-los-tecnicos${d.cerrado ? "" : "-borrador"}`);
    else if (accion === "png") await descargarImagen($("#hoja .paper"), nombreArchivo(".png"));
    else if (accion === "excel") await descargarExcel(hojasExcel(), nombreArchivo(".xlsx"));
  } catch (err) {
    avisar(mensajeError(err), "bad");
  } finally {
    b.classList.remove("cargando");
    b.textContent = texto;
  }
}
 
const EST = { pendiente: "Sin revisar", observado: "Observado", revisado: "Revisado" };
const NUM = ["paquetes", "cajas", "registros", "metros", "cantidad", "documentos", "indexados", "ubicados", "no_ubicados", "fijos"];
 
// Excel: si se está viendo un técnico, solo sus datos; si no, todo el equipo.
function hojasExcel() {
  const t = d.tecnicos.find((x) => String(x.id) === ver);
  const reps = t ? d.reportes.filter((r) => r.perfil_id === t.id) : d.reportes;
  const tecs = t ? [t] : d.tecnicos;
  const nombre = new Map(d.tecnicos.map((x) => [x.id, x.nombre]));
  const portada = [
    ["Informe mensual de producción · UFGDA · Sistema Institucional de Archivos"],
    ["Mes", cap(nombreMes(desde))],
    ["Alcance", t ? t.nombre : "Todo el equipo"],
    ["Estado", d.cerrado ? "Definitivo (mes cerrado)" : "Borrador (mes abierto)"],
    ["Generado", ahora()],
    ["Nota", "Las unidades de medida distintas no se suman entre sí."],
  ];
  const cumpl = [["Técnico", "Archivo", "Días hábiles", "Justificados", "Esperados", "Reportados", "Faltantes", "Cumplimiento %"],
    ...tecs.map((x) => { const c = d.cumpl.get(x.id) || {}; return [x.nombre, x.archivo, c.dias_habiles ?? "", c.dias_justificados ?? "", c.dias_esperados ?? "", c.dias_reportados ?? "", c.dias_faltantes ?? "", c.porcentaje ?? ""]; })];
  const porTec = [["Técnico", "Archivo", "Proceso", "Procedimiento", "Total", "Unidad de medida", "Reportes", "Días"]];
  tecs.forEach((x) => totalesPorProcedimiento(reps.filter((r) => r.perfil_id === x.id))
    .forEach((f) => porTec.push([x.nombre, x.archivo, f.proceso, f.procedimiento, f.total, f.medida, f.reportes, f.dias.size])));
  const porUni = [["Unidad de organización", "Proceso", "Procedimiento", "Total", "Unidad de medida", "Técnicos", "Reportes"]];
  resumenPorUnidad(reps).forEach((u) => u.filas.forEach((f) => porUni.push([u.unidad, f.proceso, f.procedimiento, f.total, f.medida, f.tecnicos.size, f.reportes.size])));
  const det = [["N° reporte", "Fecha", "Técnico", "Archivo", "Proceso", "Procedimiento", "Producción del reporte", "Unidad de medida", "Estado", "Registrado tarde",
    "Unidad de organización", "Serie documental", "Tipo de documento", "Año desde", "Año hasta", "Correlativo desde", "Correlativo hasta", "Fecha desde", "Fecha hasta",
    "Paquetes", "Cajas", "Registros", "Metros lineales", "Cantidad", "Documentos", "Indexados", "Ubicados", "No ubicados", "Subsanados", "Observaciones del técnico", "Observación del supervisor"]];
  reps.forEach((r) => {
    const ds = r.detalles.length ? r.detalles : [{}];
    ds.forEach((x, i) => det.push([
      r.id, r.fecha, nombre.get(r.perfil_id) || r.perfil?.nombre || "", r.archivo || r.perfil?.archivo || "", r.procedimiento.proceso.nombre, r.procedimiento.nombre,
      i === 0 ? Number(r.cantidad || 0) : "", r.unidad_medida, EST[r.estado], r.tardio ? "Sí" : "",
      x.unidad || r.unidad || "", x.serie || "", x.tipo_documento || "", x.anio_desde ?? "", x.anio_hasta ?? "", x.correlativo_desde ?? "", x.correlativo_hasta ?? "",
      x.fecha_desde || "", x.fecha_hasta || "", ...NUM.map((k) => (x[k] === null || x[k] === undefined || x[k] === "" ? "" : Number(x[k]))),
      i === 0 ? r.observaciones || "" : "", i === 0 ? r.observacion_supervisor || "" : "",
    ]));
  });
  return [
    { nombre: "Informe", filas: portada, anchos: [14, 70] },
    { nombre: "Cumplimiento", filas: cumpl, anchos: [36, 20, 12, 12, 12, 12, 12, 15] },
    { nombre: "Por técnico", filas: porTec, anchos: [36, 20, 26, 44, 10, 18, 10, 8] },
    { nombre: "Por unidad", filas: porUni, anchos: [44, 26, 44, 10, 18, 10, 10] },
    { nombre: "Detalle", filas: det, anchos: [10, 11, 36, 20, 26, 44, 12, 16, 12, 10, 40, 40, 30, ...Array(16).fill(11), 40, 40] },
  ];
}
 