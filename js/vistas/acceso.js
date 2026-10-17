// Pantalla de ingreso: iniciar sesión, crear cuenta, recuperar y cambiar contraseña.
import { $, esc } from "../util/dom.js";
import { ingresar, crearCuenta, recuperarClave, cambiarClave } from "../datos/sesion.js";

const ERRORES = {
  "Invalid login credentials": "Correo o contraseña incorrectos.",
  "Email not confirmed": "Primero confirma tu correo con el enlace que te enviamos.",
  "User already registered": "Ese correo ya tiene cuenta. Usa Iniciar sesión.",
  "Password should be at least 6 characters.": "La contraseña debe tener al menos 6 caracteres.",
};

const TEXTOS = {
  ingresar: { titulo: "Iniciar sesión", boton: "Ingresar", cambio: "¿Primera vez? Crea tu cuenta" },
  crear: { titulo: "Crear cuenta", boton: "Crear cuenta", cambio: "Ya tengo cuenta" },
  recuperar: { titulo: "Recuperar contraseña", boton: "Enviar enlace", cambio: "Volver a iniciar sesión" },
  nueva: { titulo: "Nueva contraseña", boton: "Guardar contraseña", cambio: "" },
};

export function mostrarAcceso({ modo = "ingresar", mensaje = "", ok = false, alTerminar } = {}) {
  const t = TEXTOS[modo];
  $("#raiz").innerHTML = `
  <div class="acceso"><form class="card" id="formAcceso" novalidate>
    <div class="logo"><img src="img/logo.png" alt="Seguro Saludpol"></div>
    <div><div class="eyebrow">Sistema Institucional de Archivos</div><h1>${t.titulo}</h1></div>
    ${mensaje ? `<div class="msg ${ok ? "ok" : ""}">${esc(mensaje)}</div>` : ""}
    ${modo !== "nueva" ? `<div class="f"><label for="correo">Correo institucional</label><input id="correo" type="email" autocomplete="email" required></div>` : ""}
    ${modo !== "recuperar" ? `<div class="f"><label for="clave">${modo === "nueva" ? "Nueva contraseña" : "Contraseña"}</label><input id="clave" type="password" minlength="6" autocomplete="${modo === "ingresar" ? "current-password" : "new-password"}" required></div>` : ""}
    <button class="btn primary big" id="btnAcceso">${t.boton}</button>
    <div class="pie">
      ${t.cambio ? `<button type="button" class="btn link" id="btnCambio">${t.cambio}</button>` : ""}
      ${modo === "ingresar" ? `<button type="button" class="btn link" id="btnOlvido">Olvidé mi contraseña</button>` : ""}
    </div>
  </form></div>`;

  const ir = (m, msg = "", esOk = false) => mostrarAcceso({ modo: m, mensaje: msg, ok: esOk, alTerminar });
  $("#btnCambio")?.addEventListener("click", () => ir(modo === "ingresar" ? "crear" : "ingresar"));
  $("#btnOlvido")?.addEventListener("click", () => ir("recuperar"));

  $("#formAcceso").addEventListener("submit", async (e) => {
    e.preventDefault();
    const correo = $("#correo")?.value.trim().toLowerCase();
    const clave = $("#clave")?.value;
    if (modo !== "nueva" && !correo) return ir(modo, "Escribe tu correo.");
    if (modo !== "recuperar" && (!clave || clave.length < 6)) return ir(modo, "La contraseña debe tener al menos 6 caracteres.");
    const btn = $("#btnAcceso");
    btn.classList.add("cargando");
    try {
      let res;
      if (modo === "ingresar") res = await ingresar(correo, clave);
      else if (modo === "crear") {
        res = await crearCuenta(correo, clave);
        if (!res.error && !res.data.session) return ir("ingresar", "Te enviamos un correo para confirmar tu cuenta. Ábrelo y luego ingresa aquí.", true);
      } else if (modo === "recuperar") {
        res = await recuperarClave(correo);
        if (!res.error) return ir("ingresar", "Revisa tu correo: te enviamos un enlace para crear una nueva contraseña.", true);
      } else {
        res = await cambiarClave(clave);
        if (!res.error) return alTerminar?.();
      }
      if (res.error) ir(modo, ERRORES[res.error.message] || res.error.message);
    } finally {
      btn.classList.remove("cargando");
    }
  });
}
