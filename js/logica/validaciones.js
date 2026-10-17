// Reglas del formulario (las mismas que revisa la base, para avisar antes de enviar).
import { DIAS_ATRASO_MAX } from "../config.js";
import { hoyLima, sumarDias } from "./fechas.js";

const vacio = (v) => v === undefined || v === null || String(v).trim() === "";

// Devuelve una lista de errores { donde, k, texto }. donde = "cabecera" o el índice de la tarjeta.
export function validarReporte({ fecha, archivo, unidad, proc, proceso, def, cabecera, detalles, corrigiendo }) {
  const errores = [];
  const err = (donde, k, texto) => errores.push({ donde, k, texto });
  const hoy = hoyLima();

  if (vacio(fecha)) err("paso1", "fecha", "Indica la fecha de producción.");
  else if (fecha > hoy) err("paso1", "fecha", "No se puede reportar una fecha futura.");
  else if (!corrigiendo && fecha < sumarDias(hoy, -DIAS_ATRASO_MAX)) err("paso1", "fecha", `Solo se puede registrar hasta ${DIAS_ATRASO_MAX} días de atraso.`);
  if (archivo === "ARCHIVO DE GESTIÓN" && vacio(unidad)) err("paso1", "unidad", "Indica la unidad donde trabajaste.");
  if (!proc) { err("paso2", "procedimiento", "Elige el procedimiento."); return errores; }
  if (proceso?.solo_archivo_central && archivo !== "ARCHIVO CENTRAL") err("paso2", "procedimiento", `${proceso.nombre} solo está disponible para Archivo Central.`);

  const revisarCampo = (donde, c, v) => {
    if (vacio(v)) { if (c.req) err(donde, c.k, "Campo obligatorio."); return; }
    if (c.tipo === "entero" || c.tipo === "anio" || c.tipo === "decimal") {
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0) return err(donde, c.k, "Debe ser un número mayor o igual a cero.");
      if (c.tipo !== "decimal" && !Number.isInteger(n)) return err(donde, c.k, "Debe ser un número entero.");
      if (c.tipo === "anio" && (n < 1900 || n > Number(hoy.slice(0, 4)))) err(donde, c.k, "Año no válido.");
    }
  };

  def.cabecera.forEach((c) => revisarCampo("cabecera", c, cabecera[c.k]));
  if (cabecera.medida_declarada === "OTRA" && vacio(cabecera.medida_otra)) err("cabecera", "medida_otra", "Especifica la unidad de medida.");

  detalles.forEach((d, i) => {
    def.detalle.forEach((c) => revisarCampo(i, c, d[c.k]));
    const par = (a, b, texto, comoTexto = false) => {
      if (vacio(d[a]) || vacio(d[b])) return;
      if (comoTexto ? d[a] > d[b] : Number(d[a]) > Number(d[b])) err(i, a, texto);
    };
    par("anio_desde", "anio_hasta", "El año Desde debe ser menor o igual que el año Hasta.");
    par("correlativo_desde", "correlativo_hasta", "El correlativo Desde no puede ser mayor que Hasta.");
    par("fecha_desde", "fecha_hasta", "La fecha Desde no puede ser posterior a Hasta.", true);
  });

  if (proc.metrica === "solicitudes") {
    const total = Number(cabecera.total_documentos || 0);
    const suma = detalles.reduce((s, d) => s + Number(d.ubicados || 0) + Number(d.no_ubicados || 0), 0);
    if (total !== suma) err("cabecera", "total_documentos", `Debe ser igual a ubicados + no ubicados (${suma}).`);
  }
  return errores;
}
