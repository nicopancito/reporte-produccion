// Arranque: sesión, perfil, menú según el rol y navegación por #ruta.
import { $, esc, avisar, iniciales, mensajeError, ICONOS } from "./util/dom.js";
import { alCambiarSesion, miPerfil, salir } from "./datos/sesion.js";
import { mostrarAcceso } from "./vistas/acceso.js";
import { vistaInicio } from "./vistas/inicio.js";
import { vistaRegistrar, montarRegistrar } from "./vistas/registrar.js";
import { vistaMisReportes, montarMisReportes } from "./vistas/mis-reportes.js";
import { vistaPanel, montarPanel } from "./vistas/panel.js";
import { vistaRevisar, montarRevisar } from "./vistas/revisar.js";
import { vistaCumplimiento, montarCumplimiento } from "./vistas/cumplimiento.js";
import { vistaProximamente } from "./vistas/proximamente.js";
import { MINUTOS_INACTIVIDAD } from "./config.js";

const ROLES = { tecnico: "Técnico", supervisor: "Supervisor", administrador: "Administrador", programador: "Programador" };

// Menú por rol: [ruta, texto, ícono, grupo]
function menu(p) {
  const propio = p.reporta_produccion ? [["inicio", "Inicio", "inicio", "Mi trabajo"], ["registrar", "Registrar", "registrar", "Mi trabajo"], ["mis-reportes", "Mis reportes", "reportes", "Mi trabajo"]] : [["inicio", "Inicio", "inicio", "Mi trabajo"]];
  const gestion = {
    tecnico: [],
    supervisor: [["panel", "Panel", "panel"], ["revisar", "Revisar", "revisar"], ["cumplimiento", "Cumplimiento", "cumplimiento"], ["informe", "Informe mensual", "informe"]],
    administrador: [["panel", "Panel", "panel"], ["revisar", "Reportes", "revisar"], ["cumplimiento", "Cumplimiento", "cumplimiento"], ["informe", "Informe mensual", "informe"]],
    programador: [["panel", "Panel", "panel"], ["tecnicos", "Técnicos", "tecnicos"], ["catalogos", "Catálogos", "catalogos"]],
  }[p.rol].map((x) => [...x, "Gestión"]);
  return [...propio, ...gestion];
}

const PROXIMAS = { informe: ["Informe mensual", 4], tecnicos: ["Técnicos", 5], catalogos: ["Catálogos", 5] };

let perfil = null, usuario = null;

function armarApp() {
  const items = menu(perfil);
  let grupo = "";
  const nav = items.map(([ruta, texto, ico, g]) => {
    const etiqueta = g !== grupo ? `<div class="navlabel">${g}</div>` : "";
    grupo = g;
    return `${etiqueta}<a href="#${ruta}" data-ruta="${ruta}">${ICONOS[ico]}<span>${texto}</span></a>`;
  }).join("");
  $("#raiz").innerHTML = `
  <div class="app">
    <aside class="side">
      <div class="logo"><img src="img/logo.png" alt="Seguro Saludpol"></div>
      <div class="who"><div class="av">${esc(iniciales(perfil.nombre))}</div><div><b>${esc(perfil.nombre)}</b><small>${esc(usuario.email)}</small><br>
        <span class="role">${ROLES[perfil.rol]}${perfil.reporta_produccion ? " · " + (perfil.archivo === "ARCHIVO CENTRAL" ? "AC" : "AG") : ""}</span></div></div>
      <nav class="nav" aria-label="Menú">${nav}<a href="#salir" class="movil-salir">${ICONOS.salir}<span>Salir</span></a></nav>
      <div class="sidefoot"><button type="button" class="btn ghost sm" id="btnSalir">${ICONOS.salir.replace("<svg", '<svg width="16" height="16"')} Cerrar sesión</button>
        <span>Sistema Institucional de Archivos<br>UFGDA · SALUDPOL</span></div>
    </aside>
    <main class="main"><div class="wrap" id="vista"></div></main>
  </div>`;
  $("#btnSalir").addEventListener("click", cerrarSesion);
}

async function navegar() {
  if (!perfil) return;
  const [rutaCompleta, query = ""] = location.hash.slice(1).split("?");
  const [ruta, id] = (rutaCompleta || "inicio").split("/");
  const params = new URLSearchParams(query);
  if (ruta === "salir") return cerrarSesion();
  const permitidas = menu(perfil).map((x) => x[0]);
  const puedeCorregir = perfil.reporta_produccion || perfil.rol === "supervisor";
  const destino = ruta === "corregir" && puedeCorregir ? "corregir" : permitidas.includes(ruta) ? ruta : "inicio";
  document.querySelectorAll(".nav a").forEach((a) => a.classList.toggle("on", a.dataset.ruta === (destino === "corregir" ? (perfil.rol === "supervisor" ? "revisar" : "mis-reportes") : destino)));
  const vista = $("#vista");
  vista.innerHTML = `<div class="cargando-vista">Cargando…</div>`;
  try {
    if (destino === "inicio") vista.innerHTML = await vistaInicio(perfil);
    else if (destino === "registrar") { vista.innerHTML = await vistaRegistrar(perfil, params); montarRegistrar(); }
    else if (destino === "corregir") { vista.innerHTML = await vistaRegistrar(perfil, params, Number(id)); montarRegistrar(); }
    else if (destino === "mis-reportes") { vista.innerHTML = await vistaMisReportes(perfil, params); montarMisReportes(); }
    else if (destino === "panel") { vista.innerHTML = await vistaPanel(perfil, params); montarPanel(); }
    else if (destino === "revisar") { vista.innerHTML = await vistaRevisar(perfil, params); montarRevisar(); }
    else if (destino === "cumplimiento") { vista.innerHTML = await vistaCumplimiento(perfil, params); montarCumplimiento(); }
    else vista.innerHTML = vistaProximamente(...PROXIMAS[destino]);
  } catch (err) {
    vista.innerHTML = `<div class="card aviso bad">No se pudo cargar: ${esc(mensajeError(err))}</div>`;
  }
  window.scrollTo({ top: 0 });
}

async function cerrarSesion() {
  await salir();
  location.hash = "";
}

// Cierre de sesión por inactividad
let reloj;
function reiniciarReloj() {
  clearTimeout(reloj);
  if (perfil) reloj = setTimeout(async () => { await salir(); avisar("Se cerró tu sesión por inactividad."); }, MINUTOS_INACTIVIDAD * 60 * 1000);
}
["click", "keydown", "touchstart"].forEach((ev) => document.addEventListener(ev, reiniciarReloj, { passive: true }));

let ultimoUid, recuperando = false;
async function alSesion(sesion) {
  if (!sesion) {
    perfil = usuario = null;
    return mostrarAcceso();
  }
  if (recuperando) return;
  usuario = sesion.user;
  try {
    perfil = await miPerfil();
  } catch (err) {
    return mostrarAcceso({ mensaje: mensajeError(err) });
  }
  if (!perfil) {
    const correo = usuario.email;
    await salir();
    return mostrarAcceso({ mensaje: `Tu correo (${correo}) aún no está dado de alta en el portal. Pide al programador que te agregue.` });
  }
  armarApp();
  reiniciarReloj();
  navegar();
}

alCambiarSesion((evento, sesion) => {
  if (evento === "PASSWORD_RECOVERY") {
    recuperando = true;
    return mostrarAcceso({ modo: "nueva", alTerminar: () => { recuperando = false; ultimoUid = undefined; alSesion(sesion); } });
  }
  const uid = sesion?.user?.id || null;
  if (uid === ultimoUid && evento !== "SIGNED_OUT") return;
  ultimoUid = uid;
  setTimeout(() => alSesion(sesion), 0);
});
window.addEventListener("hashchange", navegar);
