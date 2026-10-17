// Catálogos (procesos, procedimientos, unidades, series…). Se leen una vez por sesión.
import { sb, revisar } from "./cliente.js";

let cache = null;

async function tabla(nombre, orden = "orden") {
  return revisar(await sb.from(nombre).select("*").eq("activo", true).order(orden).order("nombre"));
}

export async function cargarCatalogos(forzar = false) {
  if (cache && !forzar) return cache;
  const [procesos, procedimientos, unidades, series, tiposDoc, servicios, sedes] = await Promise.all([
    tabla("procesos"), tabla("procedimientos"), tabla("unidades"), tabla("series", "nombre"),
    tabla("tipos_documento"), tabla("tipos_servicio"), tabla("sedes"),
  ]);
  cache = { procesos, procedimientos, unidades, series, tiposDoc, servicios, sedes };
  return cache;
}

// Series de una unidad (por nombre) + las comunes a todas, ordenadas.
export function seriesDeUnidad(cat, nombreUnidad) {
  const u = cat.unidades.find((x) => x.nombre === nombreUnidad);
  return cat.series
    .filter((s) => s.unidad_id === null || (u && s.unidad_id === u.id))
    .map((s) => s.nombre)
    .sort((a, b) => a.localeCompare(b, "es"));
}
