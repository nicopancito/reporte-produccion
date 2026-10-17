// Mis reportes: lista del mes con estado, detalle por serie y botón Corregir cuando corresponde.
import { $, esc } from "../util/dom.js";
import { hoyLima, finMes, nombreMes } from "../logica/fechas.js";
import { misReportes, mesesCerrados } from "../datos/reportes.js";
import { tarjetaReporte, activarDetalles } from "./tarjeta-reporte.js";
import { HORAS_CORRECCION } from "../config.js";

let perfil, mes;

export async function vistaMisReportes(p, params) {
  perfil = p;
  mes = params.get("mes") || hoyLima().slice(0, 7);
  return `<div class="head"><div><div class="eyebrow">Mi trabajo</div><h1>Mis reportes</h1>
      <p>Solo tú y el supervisor ven estos reportes.</p></div>
    <div class="filtros"><div class="f"><label for="mes">Mes</label><input type="month" id="mes" value="${mes}" max="${hoyLima().slice(0, 7)}"></div></div></div>
    <div id="lista" class="list"><div class="cargando-vista">Cargando…</div></div>`;
}

export function montarMisReportes() {
  $("#mes").addEventListener("change", (e) => { if (e.target.value) location.hash = "#mis-reportes?mes=" + e.target.value; });
  activarDetalles($("#lista"));
  cargar();
}

export function puedeCorregir(r, cerrados) {
  if (cerrados.includes(r.fecha.slice(0, 8) + "01")) return false;
  return r.estado === "observado" || Date.now() - new Date(r.registrado_en).getTime() <= HORAS_CORRECCION * 3600 * 1000;
}

async function cargar() {
  const desde = mes + "-01";
  const [reportes, cerrados] = await Promise.all([misReportes(perfil.id, desde, finMes(desde)), mesesCerrados()]);
  const cerrado = cerrados.includes(desde);
  const lista = $("#lista");
  if (!lista) return;
  if (!reportes.length) {
    lista.innerHTML = `<div class="card vacio">No tienes reportes en ${esc(nombreMes(desde))}.<br><a href="#registrar">Registrar producción</a></div>`;
    return;
  }
  const observados = reportes.filter((r) => r.estado === "observado").length;
  lista.innerHTML = (cerrado ? `<div class="aviso">El mes de ${esc(nombreMes(desde))} está cerrado: ya no se puede corregir.</div>` : "")
    + (observados ? `<div class="aviso warn">Tienes ${observados} ${observados === 1 ? "reporte observado" : "reportes observados"} por el supervisor. Corrígelos para que vuelvan a revisión.</div>` : "")
    + reportes.map((r) => tarjetaReporte(r, { acciones: puedeCorregir(r, cerrados) ? `<a class="btn sm primary" href="#corregir/${r.id}">Corregir</a>` : "" })).join("");
}
