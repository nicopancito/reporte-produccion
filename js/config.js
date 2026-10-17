// Conexión a Supabase. La llave publicable es pública por diseño:
// lo que protege los datos son los permisos (RLS) de la base.
export const SUPABASE_URL = "https://xrgqbaeiumoioqoemoyz.supabase.co";
export const SUPABASE_KEY = "sb_publishable_5bF22wg8vFYRzmMEXPkigw_JJ_hOCdR";

// Plazos (deben coincidir con sql/03_validaciones.sql)
export const DIAS_ATRASO_MAX = 7;
export const HORAS_CORRECCION = 24;

// Cierre de sesión por inactividad
export const MINUTOS_INACTIVIDAD = 30;
