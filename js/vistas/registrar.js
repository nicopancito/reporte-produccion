// Registrar producción en 3 pasos: 1) cuándo y dónde, 2) qué hiciste, 3) detalle.
// También sirve para corregir un reporte existente.
import { $, esc, avisar, formatoNumero, mensajeError, medida as plural } from "../util/dom.js";
import { hoyLima, sumarDias, fechaLarga } from "../logica/fechas.js";
import { definicion, cantidadPrincipal, medidaPrincipal, MEDIDAS_LIBRES } from "../logica/formularios.js";
import { validarReporte } from "../logica/validaciones.js";
import { cargarCatalogos, seriesDeUnidad } from "../datos/catalogos.js";
import { registrarReporte, corregirReporte, reportePorId } from "../datos/reportes.js";
import { DIAS_ATRASO_MAX } from "../config.js";

const OTRA = "__OTRA__";
const RECUERDO = "sia_ultimo_registro";
let cat, perfil, est, errores = [];

function leerRecuerdo() {
  try { return JSON.parse(localStorage.getItem(RECUERDO) || "{}"); } catch { return {}; }
}
function guardarRecuerdo() {
  try { localStorage.setItem(RECUERDO, JSON.stringify({ archivo: est.archivo, unidad: est.unidad, procId: est.procId })); } catch {}
}

function nuevoEstado(params) {
  const r = leerRecuerdo();
  return {
    paso: 1,
    fecha: params.get("fecha") || hoyLima(),
    archivo: r.archivo || perfil.archivo,
    unidad: r.unidad || "",
    procId: r.procId || null,
    cabecera: {},
    detalles: [{}],
    observaciones: "",
    evidencia_url: "",
    clave: crypto.randomUUID(),
    editando: null,
  };
}

// Reporte guardado → estado del formulario
function estadoDesdeReporte(r) {
  const proc = r.procedimiento;
  const def = definicion(cat.procedimientos.find((p) => p.id === proc.id) || proc);
  const cabecera = { ...r.datos, solicitudes: r.solicitudes ?? "", total_documentos: r.total_documentos ?? "" };
  if (proc.unidad_medida === "LIBRE") {
    if (MEDIDAS_LIBRES.includes(r.unidad_medida)) cabecera.medida_declarada = r.unidad_medida;
    else { cabecera.medida_declarada = "OTRA"; cabecera.medida_otra = r.unidad_medida; }
  }
  const detalles = r.detalles.map((d) => Object.fromEntries(def.detalle.map((c) => [c.k, d[c.k] ?? ""])));
  return {
    paso: 3, fecha: r.fecha, archivo: r.archivo, unidad: r.unidad || "", procId: proc.id,
    cabecera, detalles: detalles.length ? detalles : [{}],
    observaciones: r.observaciones || "", evidencia_url: r.evidencia_url || "",
    clave: r.clave_envio, editando: r,
  };
}

const procActual = () => cat.procedimientos.find((p) => p.id === est.procId) || null;
const procesoDe = (proc) => cat.procesos.find((p) => p.id === proc?.proceso_id) || null;
// El supervisor corrige reportes de otros: el motivo es obligatorio y vuelve a Revisar
const ajeno = () => !!est.editando && est.editando.perfil_id !== perfil.id;
const disponible = (proceso) => est.archivo === "ARCHIVO CENTRAL" || !proceso.solo_archivo_central;

export async function vistaRegistrar(p, params, idCorregir) {
  perfil = p;
  cat = await cargarCatalogos();
  errores = [];
  if (idCorregir) {
    const r = await reportePorId(idCorregir);
    est = estadoDesdeReporte(r);
  } else {
    est = nuevoEstado(params);
    const pr = procActual();
    if (!pr || !disponible(procesoDe(pr))) est.procId = null;
  }
  return `<div id="registro"></div>`;
}

export function montarRegistrar() {
  pintar();
  const raiz = $("#registro");
  raiz.addEventListener("input", alEscribir);
  raiz.addEventListener("change", alCambiar);
  raiz.addEventListener("click", alClic);
}

// ---------- pintar ----------
function pintar() {
  const raiz = $("#registro");
  if (!raiz) return;
  const titulo = est.editando ? "Corregir reporte" : "Registrar producción";
  const pasos = ["Cuándo y dónde", "Qué hiciste", "Detalle"];
  raiz.innerHTML = `
  <div class="wrap">
    <div class="head"><div><div class="eyebrow">${est.editando ? "Corrección" : "Nuevo reporte"}</div><h1>${titulo}</h1>
      <p>${ajeno() ? `Reporte de ${esc(est.editando.perfil?.nombre || "un técnico")}. Los cambios quedan en el historial con tu nombre.` : est.editando ? "Los cambios quedan en el historial." : "Tres pasos. El formulario recuerda tu último archivo y procedimiento."}</p></div></div>
    <div class="steps">${pasos.map((t, i) => `<button type="button" class="step ${est.paso === i + 1 ? "on" : est.paso > i + 1 ? "ok" : ""}" data-ir="${i + 1}"><b>${est.paso > i + 1 ? "✓" : i + 1}</b>${t}</button>`).join("")}</div>
    <div class="card grid">${est.paso === 1 ? paso1() : est.paso === 2 ? paso2() : paso3()}</div>
  </div>`;
}

function campoError(donde, k) {
  const e = errores.find((x) => String(x.donde) === String(donde) && x.k === k);
  return e ? `<span class="err">${esc(e.texto)}</span>` : "";
}
const claseError = (donde, k) => (errores.some((x) => String(x.donde) === String(donde) && x.k === k) ? " error" : "");

function opciones(lista, valor, primero = "Seleccione…") {
  return `<option value="">${primero}</option>` + lista.map((x) => `<option${x === valor ? " selected" : ""}>${esc(x)}</option>`).join("");
}

function paso1() {
  const hoy = hoyLima();
  const min = est.editando ? sumarDias(est.editando.registrado_en.slice(0, 10), -DIAS_ATRASO_MAX) : sumarDias(hoy, -DIAS_ATRASO_MAX);
  const ag = est.archivo === "ARCHIVO DE GESTIÓN";
  return `
  <div class="form">
    <div class="f${claseError("paso1", "fecha")}"><label for="fecha">Fecha de producción <span class="req">*</span></label>
      <input type="date" id="fecha" data-g="fecha" value="${esc(est.fecha)}" min="${min}" max="${hoy}">
      <span class="hint">${est.fecha && est.fecha < hoy ? "Se marcará como registrado tarde." : "Hasta " + DIAS_ATRASO_MAX + " días de atraso."}</span>${campoError("paso1", "fecha")}</div>
    <div class="f"><label>Archivo donde trabajaste <span class="req">*</span></label>
      <div class="tiles t2">${["ARCHIVO CENTRAL", "ARCHIVO DE GESTIÓN"].map((a) => `<button type="button" class="tile" data-archivo="${a}" aria-pressed="${est.archivo === a}">${a === "ARCHIVO CENTRAL" ? "Archivo Central" : "Archivo de Gestión"}</button>`).join("")}</div></div>
    ${ag ? `<div class="f full${claseError("paso1", "unidad")}"><label for="unidad">Unidad donde trabajaste <span class="req">*</span></label>
      <select id="unidad" data-g="unidad">${opciones(cat.unidades.map((u) => u.nombre), est.unidad)}</select>${campoError("paso1", "unidad")}</div>` : ""}
  </div>
  <div class="wfoot"><a class="btn ghost" href="#inicio">Cancelar</a><button type="button" class="btn primary" data-ir="2">Siguiente</button></div>`;
}

function paso2() {
  const procesos = cat.procesos.filter(disponible);
  const sel = procActual();
  const procesoSel = procesoDe(sel) || null;
  const proceso = est.procesoVista ? cat.procesos.find((p) => p.id === est.procesoVista) : procesoSel;
  const procs = proceso ? cat.procedimientos.filter((x) => x.proceso_id === proceso.id) : [];
  return `
  <div class="f"><label>Proceso <span class="req">*</span></label>
    <div class="tiles">${procesos.map((p) => `<button type="button" class="tile" style="--c:${esc(p.color)}" data-proceso="${p.id}" aria-pressed="${proceso?.id === p.id}">
      <span class="ico" aria-hidden="true">${esc(p.icono)}</span>${esc(cap(p.nombre))}<small>${cat.procedimientos.filter((x) => x.proceso_id === p.id).length} procedimientos</small></button>`).join("")}</div>
    ${est.archivo !== "ARCHIVO CENTRAL" ? `<span class="hint">Transferencia y Eliminación solo aparecen para Archivo Central.</span>` : ""}</div>
  ${proceso ? `<div class="f${claseError("paso2", "procedimiento")}"><label>Procedimiento <span class="req">*</span></label>
    <div class="procs">${procs.map((x) => `<button type="button" class="proc-op" data-proc="${x.id}" aria-pressed="${est.procId === x.id}">${esc(cap(x.nombre))}<small>${esc(x.unidad_medida === "LIBRE" ? "medida libre" : plural(x.unidad_medida))}</small></button>`).join("")}</div>
    ${campoError("paso2", "procedimiento")}</div>` : ""}
  <div class="wfoot"><button type="button" class="btn ghost" data-ir="1">Atrás</button><button type="button" class="btn primary" data-ir="3"${est.procId ? "" : " disabled"}>Siguiente</button></div>`;
}

function paso3() {
  const proc = procActual();
  const proceso = procesoDe(proc);
  const def = definicion(proc);
  const cabHTML = def.cabecera.map((c) => campoHTML(c, est.cabecera[c.k], "cabecera")).join("")
    + (est.cabecera.medida_declarada === "OTRA" ? campoHTML({ k: "medida_otra", label: "Especifica la unidad de medida", tipo: "texto", req: true }, est.cabecera.medida_otra, "cabecera") : "");
  const tarjetas = est.detalles.map((d, i) => `
    <div class="series" data-tarjeta="${i}">
      ${def.repetible ? `<div class="series-top"><b>Serie ${i + 1}</b>${est.detalles.length > 1 ? `<button type="button" class="btn sm danger" data-quitar="${i}">Quitar</button>` : ""}</div>` : ""}
      <div class="form f3">${def.detalle.map((c) => campoHTML(c, d[c.k], i)).join("")}</div>
    </div>`).join("");
  const total = cantidadPrincipal(proc, est.cabecera, est.detalles);
  const medida = medidaPrincipal(proc, est.cabecera);
  const hayErrores = errores.length > 0;
  return `
  <div class="aviso" style="border-left:4px solid ${esc(proceso.color)}"><div><b>${esc(cap(proceso.nombre))} · ${esc(cap(proc.nombre))}</b><br>
    ${esc(fechaLarga(est.fecha))} · ${est.archivo === "ARCHIVO CENTRAL" ? "Archivo Central" : "Archivo de Gestión · " + esc(cap(est.unidad))}</div></div>
  ${cabHTML ? `<div class="form f3">${cabHTML}</div>` : ""}
  <div class="grid"><h3>${def.repetible ? "Detalle por serie documental" : "Datos del procedimiento"}</h3>${tarjetas}
    ${def.repetible ? `<div><button type="button" class="btn ghost" data-agregar>＋ Añadir otra serie documental</button></div>` : ""}
    ${def.aviso ? `<div class="aviso warn">${esc(def.aviso)}</div>` : ""}</div>
  <div class="form">
    <div class="f full"><label for="obs">Observaciones</label><textarea id="obs" data-g="observaciones" placeholder="Opcional">${esc(est.observaciones)}</textarea></div>
    <div class="f full${claseError("cabecera", "evidencia_url")}"><label for="evi">Enlace de evidencia</label><input id="evi" type="url" data-g="evidencia_url" value="${esc(est.evidencia_url)}" placeholder="https://… (opcional)">${campoError("cabecera", "evidencia_url")}</div>
  </div>
  <div class="total" id="total"><span>Métrica principal</span><span class="big num">${formatoNumero(total)}</span><span>${esc(plural(medida))}</span></div>
  ${hayErrores ? `<div class="aviso bad">Revisa los campos marcados en rojo (${errores.length}).</div>` : ""}
  ${est.editando ? `<div class="f${claseError("cabecera", "motivo")}"><label for="motivo">Motivo de la corrección${ajeno() ? ' <span class="req">*</span>' : ""}</label><input id="motivo" data-g="motivo" value="${esc(est.motivo || "")}" placeholder="${ajeno() ? "Qué corregiste y por qué" : "Opcional"}">${campoError("cabecera", "motivo")}</div>` : ""}
  <div class="wfoot"><button type="button" class="btn ghost" data-ir="2">Atrás</button>
    <button type="button" class="btn primary big" data-enviar>${est.editando ? "Guardar corrección" : "Enviar reporte"}</button></div>`;
}

function campoHTML(c, valor, donde) {
  const v = valor ?? "";
  const id = `c_${donde}_${c.k}`;
  const attrs = `id="${id}" data-k="${c.k}" data-d="${donde}"`;
  const req = c.req ? ` <span class="req">*</span>` : "";
  let control;
  switch (c.tipo) {
    case "unidad":
      control = `<select ${attrs}>${opciones(cat.unidades.map((u) => u.nombre), v)}</select>`;
      break;
    case "serie": {
      const unidadTarjeta = donde === "cabecera" ? "" : est.detalles[donde]?.unidad;
      const lista = seriesDeUnidad(cat, unidadTarjeta);
      const libre = v && !lista.includes(v);
      control = `<select data-libre-de="${id}" data-d="${donde}" data-k="${c.k}" data-sel>${opciones(lista, libre ? "" : v)}<option value="${OTRA}"${libre ? " selected" : ""}>OTRA</option></select>
        <input ${attrs} value="${esc(v)}" placeholder="Escribe la serie documental"${libre ? "" : " hidden"}>`;
      break;
    }
    case "tipoDoc": {
      const lista = cat.tiposDoc.map((t) => t.nombre);
      const libre = v && !lista.includes(v);
      control = `<select data-libre-de="${id}" data-d="${donde}" data-k="${c.k}" data-sel data-otro="OTROS">${opciones(lista, libre ? "OTROS" : v, "Sin especificar")}</select>
        <input ${attrs} value="${esc(v)}" placeholder="Especifica el tipo"${libre || v === "OTROS" ? "" : " hidden"}>`;
      break;
    }
    case "servicio":
      control = `<select ${attrs}>${opciones(cat.servicios.map((s) => s.nombre), v)}</select>`;
      break;
    case "sede":
      control = `<select ${attrs}>${opciones(cat.sedes.map((s) => s.nombre), v)}</select>`;
      break;
    case "medida":
      control = `<select ${attrs}>${opciones(MEDIDAS_LIBRES, v)}</select>`;
      break;
    case "fecha":
      control = `<input type="date" ${attrs} value="${esc(v)}">`;
      break;
    case "texto":
      control = `<input ${attrs} value="${esc(v)}">`;
      break;
    default: {
      const paso = c.tipo === "decimal" ? "0.01" : "1";
      control = `<input type="number" inputmode="${c.tipo === "decimal" ? "decimal" : "numeric"}" min="0" step="${paso}" ${attrs} value="${esc(v)}"${c.tipo === "anio" ? ' placeholder="AAAA"' : ""}>`;
    }
  }
  return `<div class="f${claseError(donde, c.k)}"><label for="${id}">${esc(c.label)}${req}</label>${control}${campoError(donde, c.k)}</div>`;
}

// ---------- eventos ----------
function guardarValor(el) {
  const k = el.dataset.k, d = el.dataset.d;
  if (!k) return;
  if (d === "cabecera") est.cabecera[k] = el.value;
  else est.detalles[Number(d)][k] = el.value;
}

function alEscribir(e) {
  const el = e.target;
  if (el.dataset.g) { est[el.dataset.g] = el.value; return; }
  if (el.dataset.sel !== undefined) return;
  guardarValor(el);
  if (est.paso === 3) actualizarTotal();
}

function alCambiar(e) {
  const el = e.target;
  if (el.dataset.g === "fecha" || el.dataset.g === "unidad") { est[el.dataset.g] = el.value; return pintar(); }
  if (el.dataset.sel !== undefined) {
    const input = $("#" + el.dataset.libreDe);
    const otro = el.value === OTRA || (el.dataset.otro && el.value === el.dataset.otro);
    input.hidden = !otro;
    input.value = el.value === OTRA ? "" : el.value;
    guardarValor(input);
    if (otro) input.focus();
    return;
  }
  guardarValor(el);
  // al cambiar la unidad de una tarjeta, se recargan sus series; al cambiar la medida libre, el total
  if (el.dataset.k === "unidad" || el.dataset.k === "medida_declarada") {
    if (el.dataset.k === "unidad" && el.dataset.d !== "cabecera") est.detalles[Number(el.dataset.d)].serie = "";
    pintar();
  }
}

function alClic(e) {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.archivo) {
    est.archivo = b.dataset.archivo;
    const pr = procActual();
    if (pr && !disponible(procesoDe(pr))) est.procId = null;
    return pintar();
  }
  if (b.dataset.proceso) {
    est.procesoVista = Number(b.dataset.proceso);
    const procs = cat.procedimientos.filter((x) => x.proceso_id === est.procesoVista);
    if (procs.length === 1) elegirProcedimiento(procs[0].id);
    return pintar();
  }
  if (b.dataset.proc) { elegirProcedimiento(Number(b.dataset.proc)); return pintar(); }
  if (b.dataset.agregar !== undefined) {
    const nueva = {};
    if (est.archivo === "ARCHIVO DE GESTIÓN") nueva.unidad = est.unidad;
    est.detalles.push(nueva);
    return pintar();
  }
  if (b.dataset.quitar !== undefined) { est.detalles.splice(Number(b.dataset.quitar), 1); errores = []; return pintar(); }
  if (b.dataset.ir) return irAPaso(Number(b.dataset.ir));
  if (b.dataset.enviar !== undefined) return enviar(b);
}

function elegirProcedimiento(id) {
  if (est.procId !== id) {
    est.procId = id;
    est.cabecera = {};
    const nueva = {};
    if (est.archivo === "ARCHIVO DE GESTIÓN") nueva.unidad = est.unidad;
    est.detalles = [nueva];
  }
  est.procesoVista = null;
  errores = [];
}

function irAPaso(n) {
  if (n > est.paso) {
    const errs = validarTodo().filter((x) => (est.paso >= 1 && x.donde === "paso1") || (n > 2 && x.donde === "paso2"));
    if (errs.length) { errores = errs; avisar(errs[0].texto, "bad"); return pintar(); }
    if (n === 3 && !est.procId) return;
    // al entrar al detalle en Archivo de Gestión, la unidad de las series parte de la unidad de trabajo
    if (n === 3 && est.archivo === "ARCHIVO DE GESTIÓN") est.detalles.forEach((d) => { if (!d.unidad) d.unidad = est.unidad; });
  }
  errores = [];
  est.paso = n;
  pintar();
  window.scrollTo({ top: 0 });
}

function validarTodo() {
  const proc = procActual();
  return validarReporte({
    fecha: est.fecha, archivo: est.archivo, unidad: est.unidad, proc, proceso: procesoDe(proc),
    def: proc ? definicion(proc) : { cabecera: [], detalle: [] }, cabecera: est.cabecera, detalles: est.detalles,
    corrigiendo: !!est.editando,
  }).concat(ajeno() && !String(est.motivo || "").trim() ? [{ donde: "cabecera", k: "motivo", texto: "Indica el motivo de la corrección." }] : [])
    .concat(est.evidencia_url && !/^https?:\/\//i.test(est.evidencia_url) ? [{ donde: "cabecera", k: "evidencia_url", texto: "Debe empezar con http:// o https://" }] : []);
}

function actualizarTotal() {
  const proc = procActual();
  const caja = $("#total .big");
  if (caja) caja.textContent = formatoNumero(cantidadPrincipal(proc, est.cabecera, est.detalles));
}

function armarEnvio() {
  const proc = procActual();
  const def = definicion(proc);
  const datos = {};
  const envio = {
    clave_envio: est.clave, fecha: est.fecha, archivo: est.archivo,
    unidad: est.archivo === "ARCHIVO DE GESTIÓN" ? est.unidad : null,
    procedimiento_id: proc.id, observaciones: est.observaciones, evidencia_url: est.evidencia_url,
  };
  def.cabecera.forEach((c) => {
    const v = est.cabecera[c.k];
    if (c.en === "cabecera") envio[c.k] = v === "" || v === undefined ? null : Number(v);
    else if (c.en === "raiz") envio[c.k] = v;
    else if (v) datos[c.k] = v;
  });
  if (proc.unidad_medida === "LIBRE") envio.medida_declarada = medidaPrincipal(proc, est.cabecera).toUpperCase();
  envio.datos = datos;
  envio.detalles = est.detalles.map((d) => Object.fromEntries(def.detalle.map((c) => [c.k, d[c.k] === undefined ? "" : String(d[c.k]).trim()])));
  return envio;
}

async function enviar(btn) {
  errores = validarTodo();
  if (errores.length) {
    const primero = errores[0];
    if (primero.donde === "paso1") est.paso = 1; else if (primero.donde === "paso2") est.paso = 2;
    pintar();
    avisar(primero.texto, "bad");
    $(".f.error input, .f.error select")?.focus();
    return;
  }
  btn.classList.add("cargando");
  btn.disabled = true;
  try {
    if (est.editando) await corregirReporte(est.editando.id, armarEnvio(), est.motivo || null);
    else await registrarReporte(armarEnvio());
    if (!ajeno()) guardarRecuerdo();
    mostrarExito();
  } catch (err) {
    avisar(mensajeError(err), "bad");
    btn.classList.remove("cargando");
    btn.disabled = false;
  }
}

function mostrarExito() {
  const proc = procActual();
  const total = cantidadPrincipal(proc, est.cabecera, est.detalles);
  $("#registro").innerHTML = `<div class="wrap"><div class="card exito">
    <div class="ico" aria-hidden="true">✓</div>
    <h2>${est.editando ? "Corrección guardada" : "Reporte enviado"}</h2>
    <p class="muted">${esc(cap(proc.nombre))} · ${formatoNumero(total)} ${esc(plural(medidaPrincipal(proc, est.cabecera)))} · ${esc(fechaLarga(est.fecha))}</p>
    <div class="wfoot" style="justify-content:center">${ajeno()
      ? `<a class="btn primary" href="#revisar?mes=${est.fecha.slice(0, 7)}">Volver a Revisar</a></div></div></div>`
      : `<a class="btn ghost" href="#mis-reportes">Ver mis reportes</a>
      <button type="button" class="btn primary" id="otro">Registrar otra actividad</button></div></div></div>`}`;
  $("#otro")?.addEventListener("click", () => {
    const fecha = est.fecha;
    est = nuevoEstado(new URLSearchParams({ fecha }));
    est.paso = 2;
    pintar();
  });
  window.scrollTo({ top: 0 });
}

function cap(s) {
  const t = String(s || "").toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
}
