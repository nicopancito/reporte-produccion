// imprimir a PDF, imagen PNG y Excel.
// librerias(html2canvas y SheetJS) carga uando alguien pulsa el boton
 
const LIBRERIAS = {
  html2canvas: "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
  XLSX: "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js",
};
const cargando = {};
 
function cargarLibreria(nombre) {
  if (window[nombre]) return Promise.resolve(window[nombre]);
  cargando[nombre] ??= new Promise((ok, falla) => {
    const s = document.createElement("script");
    s.src = LIBRERIAS[nombre];
    s.onload = () => ok(window[nombre]);
    s.onerror = () => { delete cargando[nombre]; falla(new Error("No se pudo descargar la herramienta de exportación. Revisa tu internet.")); };
    document.head.appendChild(s);
  });
  return cargando[nombre];
}
 
// Imprime solo el HTML recibido (cada .paper sale en su propia hoja). En el diálogo se elige "Guardar como PDF".
export function imprimir(html, titulo) {
  document.getElementById("imprimir")?.remove();
  const caja = document.createElement("div");
  caja.id = "imprimir";
  caja.innerHTML = html;
  document.body.appendChild(caja);
  document.body.classList.add("imprimiendo");
  const tituloAntes = document.title;
  document.title = titulo; // el navegador lo usa como nombre del PDF
  const limpiar = () => {
    document.body.classList.remove("imprimiendo");
    caja.remove();
    document.title = tituloAntes;
  };
  window.addEventListener("afterprint", limpiar, { once: true });
  // Espera a que carguen los logos antes de abrir el diálogo.
  const imgs = [...caja.querySelectorAll("img")].map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; })));
  Promise.all(imgs).then(() => setTimeout(() => window.print(), 50));
}
 
function descargarArchivo(blob, nombre) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
 
// Foto en PNG de un elemento
export async function descargarImagen(elemento, nombre) {
  const html2canvas = await cargarLibreria("html2canvas");
  const lienzo = await html2canvas(elemento, { scale: 2, backgroundColor: "#ffffff", useCORS: true, logging: false });
  const blob = await new Promise((r) => lienzo.toBlob(r, "image/png"));
  descargarArchivo(blob, nombre);
}
 
//
export async function descargarExcel(hojas, nombre) {
  const XLSX = await cargarLibreria("XLSX");
  const libro = XLSX.utils.book_new();
  for (const h of hojas) {
    const hoja = XLSX.utils.aoa_to_sheet(h.filas);
    if (h.anchos) hoja["!cols"] = h.anchos.map((wch) => ({ wch }));
    XLSX.utils.book_append_sheet(libro, hoja, h.nombre.slice(0, 31));
  }
  XLSX.writeFile(libro, nombre);
}
 