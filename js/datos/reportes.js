// Reportes de producción: lectura y envío. Las reglas viven en la base (registrar_reporte, corregir_reporte).
import { sb, revisar } from "./cliente.js";

const COLUMNAS = "*, perfil:perfiles(nombre), procedimiento:procedimientos(id, nombre, unidad_medida, formulario, metrica, proceso:procesos(id, nombre, color, icono)), detalles:reporte_detalles(*)";

export async function misReportes(perfilId, desde, hasta) {
  const datos = revisar(
    await sb.from("reportes").select(COLUMNAS).eq("perfil_id", perfilId).gte("fecha", desde).lte("fecha", hasta)
      .order("fecha", { ascending: false }).order("registrado_en", { ascending: false }),
  );
  datos.forEach((r) => r.detalles.sort((a, b) => a.orden - b.orden));
  return datos;
}

export async function reportePorId(id) {
  const r = revisar(await sb.from("reportes").select(COLUMNAS).eq("id", id).single());
  r.detalles.sort((a, b) => a.orden - b.orden);
  return r;
}

export const registrarReporte = async (datos) => revisar(await sb.rpc("registrar_reporte", { p: datos }));
export const corregirReporte = async (id, datos, motivo = null) => revisar(await sb.rpc("corregir_reporte", { rid: id, p: datos, motivo }));

export async function diasNoLaborables(desde, hasta) {
  return revisar(await sb.from("dias_no_laborables").select("*").gte("fecha", desde).lte("fecha", hasta));
}

export async function misJustificaciones(perfilId, desde, hasta) {
  return revisar(await sb.from("justificaciones").select("*").eq("perfil_id", perfilId).gte("fecha", desde).lte("fecha", hasta));
}

export async function mesesCerrados() {
  return revisar(await sb.from("cierres_mes").select("mes")).map((x) => x.mes);
}

export async function miCumplimiento(perfilId, desde, hasta) {
  const filas = revisar(await sb.rpc("cumplimiento", { desde, hasta }));
  return filas.find((f) => f.perfil_id === perfilId) || null;
}
