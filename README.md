# Sistema Institucional de Archivos · SALUDPOL

Portal de producción archivística. HTML + CSS + JavaScript (módulos) sin instalar nada, publicado en GitHub Pages, con la base en Supabase.

## Capas
| Carpeta | Qué hay | Regla |
|---|---|---|
| `index.html` | Solo la estructura | — |
| `css/` | `base.css` (colores), `componentes.css` (botones, tarjetas, formularios), `vistas.css` (cada pantalla) | — |
| `js/config.js` | Conexión y plazos | Solo la llave **publicable**. Nunca la `service_role`. |
| `js/datos/` | Única capa que habla con Supabase | Las vistas no llaman a Supabase directo. |
| `js/logica/` | Reglas: formularios de cada procedimiento, validaciones, fechas, cumplimiento | No toca pantalla ni base. |
| `js/vistas/` | Una pantalla por archivo | — |
| `js/util/` | Ayudas de pantalla | — |
| `sql/` | Base de datos versionada (01 a 06) y pruebas de permisos | Las reglas viven en la base: aunque alguien salte la pantalla, la base rechaza lo inválido. |

## Roles
- **Técnico:** registra su producción y ve solo lo suyo.
- **Supervisor:** revisa, observa, corrige, justifica días, cierra el mes y descarga informes.
- **Administrador:** ve todo, solo lectura.
- **Programador:** técnicos, catálogos, ajustes y respaldo; registra su propia producción.

## Etapas
1. Base de datos y permisos ✓
2. Pantallas del técnico: Inicio, Registrar, Mis reportes ✓
3. Supervisor: panel, revisar, cumplimiento, cerrar mes ✓
4. Informe mensual (PDF / PNG / Excel / ZIP) y Resumen por unidad
5. Programador: técnicos y catálogos
6. Respaldo semanal automático

## Actualizar la página
1. Cambia los archivos en la carpeta local.
2. En Git Bash, dentro de la carpeta: `git add . && git commit -m "lo que cambiaste" && git push`.
3. GitHub Pages publica en uno o dos minutos.

## Probar localmente
Los módulos de JavaScript no abren con doble clic. En la carpeta: `python -m http.server 8000` y abre `http://localhost:8000`.
