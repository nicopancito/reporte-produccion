// Ayudas de pantalla: escapar texto, avisos, íconos.
export const $ = (sel, raiz = document) => raiz.querySelector(sel);
export const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];

export function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

let temporizador;
export function avisar(texto, tipo = "") {
  const t = $("#toast");
  t.textContent = texto;
  t.className = "toast " + tipo;
  t.hidden = false;
  clearTimeout(temporizador);
  temporizador = setTimeout(() => (t.hidden = true), tipo === "bad" ? 6000 : 3500);
}

export function formatoNumero(n) {
  const v = Number(n || 0);
  return v.toLocaleString("es-PE", { maximumFractionDigits: 2 });
}

export function iniciales(nombre) {
  return String(nombre || "?").split(/\s+/).filter(Boolean).map((x) => x[0]).slice(0, 2).join("").toUpperCase();
}

// Mensaje claro a partir de un error de Supabase
export function mensajeError(error) {
  const m = error?.message || String(error || "Error desconocido");
  if (/violates check constraint/.test(m)) {
    if (/anio/.test(m)) return "Revisa los años: el año Desde debe ser menor o igual que el año Hasta.";
    if (/correlativo/.test(m)) return "Revisa los correlativos: Desde no puede ser mayor que Hasta.";
    if (/fecha/.test(m)) return "Revisa las fechas extremas: Desde no puede ser posterior a Hasta.";
    return "Hay un dato fuera del rango permitido.";
  }
  if (/Failed to fetch|NetworkError/i.test(m)) return "No hay conexión. Revisa tu internet y vuelve a intentar.";
  return m;
}

const P = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
export const ICONOS = {
  inicio: `<svg viewBox="0 0 24 24" ${P}><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg>`,
  registrar: `<svg viewBox="0 0 24 24" ${P}><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>`,
  reportes: `<svg viewBox="0 0 24 24" ${P}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>`,
  panel: `<svg viewBox="0 0 24 24" ${P}><path d="M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z"/></svg>`,
  revisar: `<svg viewBox="0 0 24 24" ${P}><path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/></svg>`,
  cumplimiento: `<svg viewBox="0 0 24 24" ${P}><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>`,
  informe: `<svg viewBox="0 0 24 24" ${P}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></svg>`,
  tecnicos: `<svg viewBox="0 0 24 24" ${P}><circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M17 11a3 3 0 1 0 0-6M22 21a6 6 0 0 0-4-5.6"/></svg>`,
  catalogos: `<svg viewBox="0 0 24 24" ${P}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/></svg>`,
  salir: `<svg viewBox="0 0 24 24" ${P}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>`,
};

// Unidad de medida en plural y minúsculas para mostrar cantidades.
const PLURAL = { CAJA: "cajas", "METRO LINEAL": "metros lineales", REGISTRO: "registros", PAQUETE: "paquetes", SACO: "sacos", IMAGEN: "imágenes", "DOCUMENTO DIGITAL": "documentos digitales", SOLICITUD: "solicitudes" };
export function medida(m) {
  return PLURAL[m] || String(m || "").toLowerCase();
}
