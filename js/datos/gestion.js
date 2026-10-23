// Datos para supervisor, administrador y programador (ven a todos; la base decide quién puede cambiar qué).
import { sb, revisar } from "./cliente.js";

const COLUMNAS = "*, perfil:perfiles!perfil_id(id, nombre, archivo), procedimiento:procedimientos(id, nombre, unidad_medida, formulario, metrica, proceso:procesos(id, nombre, color, icono)), detalles:reporte_detalles(*)";

// Todos los reportes de un rango, en páginas de 1000.
export async function reportesDeTodos(desde, hasta, { perfilId, estado } = {}) {
  const todos = [];
  for (let desdeFila = 0; ; desdeFila += 1000) {
    let q = sb.from("reportes").select(COLUMNAS).gte("fecha", desde).lte("fecha", hasta)
      .order("fecha", { ascending: false }).order("registrado_en", { ascending: false }).range(desdeFila, desdeFila + 999);
    if (perfilId) q = q.eq("perfil_id", perfilId);
    if (estado) q = q.eq("estado", estado);
    const pagina = revisar(await q);
    todos.push(...pagina);
    if (pagina.length < 1000) break;
  }
  todos.forEach((r) => r.detalles.sort((a, b) => a.orden - b.orden));
  return todos;
}

export async function perfilesQueReportan() {
  return revisar(await sb.from("perfiles").select("id, nombre, archivo, correo").eq("activo", true).eq("reporta_produccion", true).order("nombre"));
}

export const revisarReporte = async (id, estado, observacion = null) =>
  revisar(await sb.rpc("revisar_reporte", { rid: id, nuevo_estado: estado, observacion }));

export const cumplimiento = async (desde, hasta) => revisar(await sb.rpc("cumplimiento", { desde, hasta }));
// "setof date" puede llegar como lista de textos o de objetos { dias_faltantes }
export const diasFaltantes = async (pid, desde, hasta) =>
  revisar(await sb.rpc("dias_faltantes", { pid, desde, hasta })).map((x) => (typeof x === "string" ? x : x.dias_faltantes ?? Object.values(x)[0]));

export async function justificaciones(desde, hasta) {
  return revisar(await sb.from("justificaciones").select("*").gte("fecha", desde).lte("fecha", hasta));
}
export const justificar = async (perfilId, fecha, motivo) =>
  revisar(await sb.from("justificaciones").insert({ perfil_id: perfilId, fecha, motivo }));
export const quitarJustificacion = async (id) => revisar(await sb.from("justificaciones").delete().eq("id", id));

export async function diasNoLaborables(desde, hasta) {
  return revisar(await sb.from("dias_no_laborables").select("*").gte("fecha", desde).lte("fecha", hasta).order("fecha"));
}
export const agregarEvento = async (fecha, motivo) => revisar(await sb.from("dias_no_laborables").insert({ fecha, motivo, tipo: "evento" }));
export const quitarEvento = async (fecha) => revisar(await sb.from("dias_no_laborables").delete().eq("fecha", fecha).eq("tipo", "evento"));

export async function cierre(mes) {
  return revisar(await sb.from("cierres_mes").select("*").eq("mes", mes).maybeSingle());
}
export const cerrarMes = async (mes) => revisar(await sb.from("cierres_mes").insert({ mes }));
export const reabrirMes = async (mes) => revisar(await sb.from("cierres_mes").delete().eq("mes", mes));
