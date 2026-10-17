// Ingreso, registro de cuenta y perfil del usuario.
import { sb, revisar } from "./cliente.js";

const urlVuelta = () => location.href.split("#")[0];

export const ingresar = (correo, clave) => sb.auth.signInWithPassword({ email: correo, password: clave });
export const crearCuenta = (correo, clave) => sb.auth.signUp({ email: correo, password: clave, options: { emailRedirectTo: urlVuelta() } });
export const recuperarClave = (correo) => sb.auth.resetPasswordForEmail(correo, { redirectTo: urlVuelta() });
export const cambiarClave = (clave) => sb.auth.updateUser({ password: clave });
export const salir = () => sb.auth.signOut();
export const alCambiarSesion = (fn) => sb.auth.onAuthStateChange(fn);
export const sesionActual = async () => (await sb.auth.getSession()).data.session;

// Perfil del portal (rol, archivo, si reporta producción). null si el correo no está dado de alta.
export async function miPerfil() {
  const p = revisar(await sb.rpc("mi_perfil"));
  return p && p.id ? p : null;
}
