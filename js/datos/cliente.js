// Única conexión a Supabase. Solo la capa de datos la importa.
import { SUPABASE_URL, SUPABASE_KEY } from "../config.js";

export const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Lanza el error de Supabase como excepción para manejarlo con try/catch.
export function revisar({ data, error }) {
  if (error) throw error;
  return data;
}
