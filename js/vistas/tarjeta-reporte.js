// Tarjeta de un reporte (la usan Mis reportes y Revisar).
import { esc, formatoNumero, medida } from "../util/dom.js";
import { fechaLarga, fechaHora } from "../logica/fechas.js";
import { definicion } from "../logica/formularios.js";

export const ESTADOS = { pendiente: ["c-mute", "Sin revisar"], observado: ["c-warn", "Observado"], revisado: ["c-ok", "Revisado"] };

export function tarjetaReporte(r, { tecnico = false, acciones = "" } = {}) {
  const proc = r.procedimiento, proceso = proc.proceso;
  const [clase, texto] = ESTADOS[r.estado];
  return `<div class="item" style="border-left:4px solid ${esc(proceso.color)}" data-reporte="${r.id}">
    <div>${tecnico ? `<div class="small" style="font-weight:800">${esc(r.perfil?.nombre || "")}</div>` : ""}
      <b>${esc(cap(proc.nombre))}</b>
      <div class="small muted">${esc(cap(proceso.nombre))} · ${esc(fechaLarga(r.fecha))}${r.unidad ? " · " + esc(cap(r.unidad)) : ""}</div>
      <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap;align-items:center">
        <b class="num">${formatoNumero(r.cantidad)} ${esc(medida(r.unidad_medida))}</b>
        <span class="chip ${clase}">${texto}</span>${r.tardio ? `<span class="chip c-late">Registrado tarde</span>` : ""}
        ${r.corregido_en ? `<span class="chip c-info">Corregido</span>` : ""}</div></div>
    <div class="acciones"><button type="button" class="btn sm ghost" data-ver="${r.id}">Ver detalle</button>${acciones}</div>
    ${r.observacion_supervisor && r.estado === "observado" ? `<div class="note">Observación del supervisor: ${esc(r.observacion_supervisor)}</div>` : ""}
    <div class="det" id="det-${r.id}" hidden>${detalleReporte(r)}</div>
  </div>`;
}

// Activa los botones "Ver detalle" dentro de un contenedor.
export function activarDetalles(contenedor) {
  contenedor.addEventListener("click", (e) => {
    const b = e.target.closest("[data-ver]");
    if (!b) return;
    const det = contenedor.querySelector(`#det-${b.dataset.ver}`);
    det.hidden = !det.hidden;
    b.textContent = det.hidden ? "Ver detalle" : "Ocultar detalle";
  });
}

export function detalleReporte(r) {
  const def = definicion(r.procedimiento);
  const cols = def.detalle.filter((c) => r.detalles.some((d) => d[c.k] !== null && d[c.k] !== ""));
  const cab = Object.entries(r.datos || {}).map(([k, v]) => `<span><b>${esc(k.replace(/_/g, " "))}:</b> ${esc(v)}</span>`);
  if (r.solicitudes !== null) cab.push(`<span><b>solicitudes:</b> ${r.solicitudes}</span>`);
  if (r.total_documentos !== null) cab.push(`<span><b>total de documentos:</b> ${r.total_documentos}</span>`);
  return `<div class="grid" style="gap:10px;margin-top:6px">
    ${cab.length ? `<div class="small" style="display:flex;gap:14px;flex-wrap:wrap">${cab.join("")}</div>` : ""}
    <div class="tablewrap"><table><thead><tr>${cols.map((c) => `<th>${esc(c.label.replace(/ \(métrica principal\)/, ""))}</th>`).join("")}</tr></thead>
    <tbody>${r.detalles.map((d) => `<tr>${cols.map((c) => `<td class="${["entero", "decimal", "anio"].includes(c.tipo) ? "num" : ""}">${esc(d[c.k] ?? "")}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
    ${r.observaciones ? `<div class="small"><b>Observaciones del técnico:</b> ${esc(r.observaciones)}</div>` : ""}
    ${r.evidencia_url ? `<div class="small"><b>Evidencia:</b> <a href="${esc(r.evidencia_url)}" target="_blank" rel="noopener">abrir enlace</a></div>` : ""}
    <div class="small muted">Registrado el ${esc(fechaHora(r.registrado_en))}${r.corregido_en ? " · corregido el " + esc(fechaHora(r.corregido_en)) : ""}${r.revisado_por ? " · revisado por " + esc(r.revisado_por) : ""}</div>
  </div>`;
}

export function cap(s) {
  const t = String(s || "").toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
}
