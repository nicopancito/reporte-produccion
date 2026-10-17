// Qué campos pide cada procedimiento (copiado de la Versión Final 5.1).
// No toca pantalla ni base: solo describe el formulario.
//
// Campo: { k, label, tipo, req, en }
//   k     → nombre de la columna (detalle) o de la cabecera
//   tipo  → entero | decimal | anio | fecha | texto | unidad | serie | tipoDoc | servicio | sede | medida
//   en    → "detalle" (tarjeta por serie), "cabecera" (columna del reporte) o "datos" (campo propio del proceso)

const ent = (k, label, req = true) => ({ k, label, tipo: "entero", req });
const dec = (k, label, req = true) => ({ k, label, tipo: "decimal", req });

const UNIDAD = { k: "unidad", label: "Unidad de organización", tipo: "unidad", req: true };
const SERIE = { k: "serie", label: "Serie documental", tipo: "serie", req: true };
const TIPO_DOC = { k: "tipo_documento", label: "Tipo de documento", tipo: "tipoDoc", req: false };
const ANIOS = [
  { k: "anio_desde", label: "Año: desde", tipo: "anio", req: true },
  { k: "anio_hasta", label: "Año: hasta", tipo: "anio", req: true },
];
const correlativos = (nombre = "Correlativos") => [
  { k: "correlativo_desde", label: `${nombre}: desde`, tipo: "entero", req: false },
  { k: "correlativo_hasta", label: `${nombre}: hasta`, tipo: "entero", req: false },
];
const FECHAS = [
  { k: "fecha_desde", label: "Fechas extremas: desde", tipo: "fecha", req: false },
  { k: "fecha_hasta", label: "Fechas extremas: hasta", tipo: "fecha", req: false },
];
const RANGOS = [...correlativos(), ...FECHAS];
const BASE = [UNIDAD, SERIE, TIPO_DOC, ...ANIOS, ...RANGOS];

// Mismos nombres que las unidades del catálogo, para que los totales por medida no se separen.
export const MEDIDAS_LIBRES = ["CAJA", "PAQUETE", "REGISTRO", "METRO LINEAL", "SOLICITUD", "IMAGEN", "DOCUMENTO DIGITAL", "SACO", "OTRA"];

// Devuelve { cabecera: [...], detalle: [...], repetible, aviso }
export function definicion(proc) {
  const m = proc.unidad_medida;
  const cab = (k, label, tipo, req = true) => ({ k, label, tipo, req, en: tipo === "entero" && (k === "solicitudes" || k === "total_documentos") ? "cabecera" : "datos" });
  let cabecera = [], detalle = [], repetible = true, aviso = "";

  switch (proc.formulario) {
    case "ORGANIZACION":
      detalle = [...BASE, ...(proc.metrica === "cajas"
        ? [ent("cajas", "Cantidad de cajas procesadas")]
        : [ent("cajas", "Cantidad de cajas organizadas"), dec("metros", "Cantidad de metros lineales")])];
      break;
    case "DESCRIPCION":
      detalle = [...BASE, ent("paquetes", "Paquetes inventariados"), ent("cajas", "Cajas inventariadas"), ent("registros", "Registros inventariados")];
      break;
    case "CONSERVACION": {
      const paq = m === "PAQUETE";
      detalle = [UNIDAD, SERIE, TIPO_DOC, ...ANIOS, ...correlativos(paq ? "Correlativo de paquetes" : "Correlativo de cajas"),
        ent("cantidad", paq ? "Cantidad de paquetes procesados" : "Cantidad de cajas archivadoras procesadas")];
      break;
    }
    case "TRANSFERENCIA":
      cabecera = [cab("unidad_transfiere", "Unidad de organización que transfiere", "unidad"), cab("remision", "N.° de remisión", "texto")];
      detalle = [...BASE, ent("paquetes", "Paquetes verificados"), ent("cajas", "Cajas verificadas (métrica principal)"),
        ent("registros", "Registros verificados"), ent("fijos", "Registros subsanados")];
      aviso = "Las evidencias y observaciones se registran una sola vez por jornada o remisión.";
      break;
    case "ELIMINACION": {
      cabecera = [cab("unidad_eliminacion", "Unidad de organización seleccionada para eliminación", "unidad")];
      const seleccion = m === "CAJA";
      const etiqueta = seleccion ? "Cantidad de cajas seleccionadas" : m === "PAQUETE" ? "Cantidad de paquetes preparados" : "Cantidad de sacos instalados";
      detalle = seleccion
        ? [UNIDAD, SERIE, TIPO_DOC, ...ANIOS, ...RANGOS, ent("cantidad", etiqueta)]
        : [UNIDAD, SERIE, ...ANIOS, ...correlativos(m === "PAQUETE" ? "Correlativo de paquete" : "Correlativo de sacos"), ent("cantidad", etiqueta)];
      break;
    }
    case "DIGITALIZACION": {
      const etiqueta = m === "METRO LINEAL" ? "Cantidad de metros lineales procesados" : m === "IMAGEN" ? "Cantidad de imágenes obtenidas" : "Cantidad de documentos digitalizados";
      detalle = [...BASE, m === "METRO LINEAL" ? dec("cantidad", etiqueta) : ent("cantidad", etiqueta),
        m === "DOCUMENTO DIGITAL" ? ent("indexados", "Cantidad de registros indexados") : ent("paquetes", "Cantidad de paquetes procesados")];
      break;
    }
    case "SERVICIOS":
      cabecera = [cab("tipo_servicio", "Tipo de servicio requerido", "servicio"),
        cab("solicitudes", "Cantidad de solicitudes atendidas (métrica principal)", "entero"),
        cab("total_documentos", "Cantidad total de documentos atendidos", "entero")];
      detalle = [UNIDAD, SERIE, TIPO_DOC, ...ANIOS, ent("cajas", "Cajas revisadas durante la búsqueda"), ent("ubicados", "Documentos ubicados"), ent("no_ubicados", "Documentos no ubicados")];
      aviso = "El total de documentos atendidos debe ser igual a ubicados + no ubicados, sumando todas las series.";
      break;
    case "OTRAS_REGISTROS":
      cabecera = [cab("sede", "Sede donde se realizó la actividad", "sede")];
      detalle = [TIPO_DOC, ...ANIOS, ...RANGOS, ent("registros", "Cantidad de registros procesados (métrica principal)")];
      repetible = false;
      break;
    case "OTRAS_ORDENAMIENTO":
      cabecera = [cab("sede", "Sede donde se realizó la actividad", "sede")];
      detalle = [TIPO_DOC, ...ANIOS, ...RANGOS, dec("metros", "Cantidad de metros lineales procesados (métrica principal)")];
      repetible = false;
      break;
    case "OTRAS_TRASLADOS":
      cabecera = [cab("sede", "Sede donde se realizó la actividad", "sede")];
      detalle = [TIPO_DOC, ...ANIOS, ent("cajas", "Cantidad de cajas recibidas"), ent("registros", "Cantidad de registros validados (métrica principal)")];
      repetible = false;
      break;
    case "OTRAS_ESTIBAJE":
      cabecera = [cab("sede", "Sede donde se realizó la actividad", "sede"), cab("sede_partida", "Sede de partida", "sede"), cab("sede_destino", "Sede de destino", "sede")];
      detalle = [TIPO_DOC, ...ANIOS, ent("cajas", "Cantidad de cajas desplazadas (métrica principal)")];
      repetible = false;
      break;
    case "OTRAS_ADICION":
      cabecera = [cab("sede", "Sede donde se realizó la actividad", "sede")];
      detalle = [TIPO_DOC, ...ANIOS, UNIDAD, SERIE, ent("documentos", "Cantidad de documentos adicionados"), dec("metros", "Cantidad de metros lineales adicionados (métrica principal)")];
      repetible = false;
      break;
    case "OTRAS_LIBRE":
      cabecera = [cab("sede", "Sede donde se realizó la actividad", "sede"), cab("detalle_actividad", "Detalle de la actividad", "texto"),
        { k: "medida_declarada", label: "Unidad de medida declarada", tipo: "medida", req: true, en: "raiz" }];
      detalle = [...ANIOS, dec("cantidad", "Cantidad procesada")];
      repetible = false;
      break;
    default: // procesos nuevos agregados desde Catálogos
      detalle = [...BASE, (m === "METRO LINEAL" ? dec : ent)("cantidad", `Cantidad (${m.toLowerCase()})`)];
  }
  return { cabecera, detalle, repetible, aviso };
}

// Cantidad principal, igual que la calcula la base.
export function cantidadPrincipal(proc, cabecera, detalles) {
  if (proc.metrica === "solicitudes") return Number(cabecera.solicitudes || 0);
  return detalles.reduce((s, d) => s + Number(d[proc.metrica] || 0), 0);
}

export function medidaPrincipal(proc, cabecera) {
  if (proc.unidad_medida !== "LIBRE") return proc.unidad_medida;
  return cabecera.medida_declarada === "OTRA" ? (cabecera.medida_otra || "OTRA") : (cabecera.medida_declarada || "UNIDAD DECLARADA");
}
