// Fechas en hora de Lima, como texto AAAA-MM-DD (igual que la base).
export function hoyLima() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function sumarDias(iso, n) {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function inicioMes(iso) {
  return iso.slice(0, 8) + "01";
}

export function finMes(iso) {
  const [y, m] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

export function diaSemana(iso) {
  // 1 = lunes … 7 = domingo
  const d = new Date(iso + "T12:00:00Z").getUTCDay();
  return d === 0 ? 7 : d;
}

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
export function nombreMes(iso) {
  const [y, m] = iso.split("-").map(Number);
  return `${MESES[m - 1]} ${y}`;
}

export function fechaLarga(iso) {
  return new Date(iso + "T12:00:00Z").toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
}

export function fechaCorta(iso) {
  return new Date(iso + "T12:00:00Z").toLocaleDateString("es-PE", { day: "2-digit", month: "short", timeZone: "UTC" });
}

export function fechaHora(ts) {
  return new Date(ts).toLocaleString("es-PE", { timeZone: "America/Lima", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function diasEntre(desde, hasta) {
  const out = [];
  for (let d = desde; d <= hasta; d = sumarDias(d, 1)) out.push(d);
  return out;
}
