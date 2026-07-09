# CONTEXT.md — Transferencia de sesión para Claude Code

> Este documento fue generado al final de una sesión de Claude Code para que otra instancia pueda continuar el trabajo sin pérdida de contexto. Está redactado para una IA, no para un humano.

---

## 1. Resumen ejecutivo

**Proyecto:** Informe de servicio / Registro de predicación  
**Repositorio:** `marinf-lab/informe-de-servicio` (GitHub)  
**URL de producción:** PWA servida desde `main` (GitHub Pages o hosting equivalente)  
**Estado:** Operativo. La app está en producción y siendo refinada iterativamente.  
**Avance:** ~85%. Funcionalidades principales completas; correcciones de UI en curso.

Es una **Progressive Web App (PWA)** de una sola página (`index.html`) para que predicadores registren su tiempo de servicio del campo, cursos bíblicos y citas. Incluye autenticación con Firebase Auth y persistencia en Firestore. Sin framework JS — todo es vanilla JS en un único archivo HTML.

---

## 2. Objetivo de esta sesión

### Se pretendía lograr
1. Corregir el desalineamiento del calendario principal (días no coincidían con los encabezados al navegar entre meses).
2. Cambiar el gráfico comparativo de meses (anterior vs. actual) de barras a líneas.

### Se alcanzó
- ✅ Gráfico comparativo cambiado de barras a SVG de líneas (función `monthCmpLineSVG`).
- ✅ CSS del calendario refactorizado: dos grids separados → un único `.cal-wrap` que contiene encabezados y celdas.
- ✅ `overflow:hidden` en `.card` para evitar desbordamiento visual en esquinas redondeadas.
- ✅ Relleno de la última fila del mes con celdas vacías hasta completar múltiplo de 7.
- ✅ `align-items:start` en `.cal-wrap` para evitar conflicto entre `stretch` y `aspect-ratio:1`.
- ✅ `min-width:0; min-height:0` en `.cell` y `min-width:0` en `.cal-hd` para garantizar columnas iguales en pantallas < 480px.

### Quedó pendiente
- ⬜ Verificar visualmente el resultado final en el dispositivo del usuario (no se recibió confirmación de que el último fix resolvió el problema por completo).
- ⬜ El usuario puede reportar nuevos issues de UI al probar la versión más reciente.

---

## 3. Estado actual del código

### Archivo principal
- `index.html` — 1281 líneas. Contiene TODO: HTML, CSS (en `<style>`), JS (en `<script type="module">`).

### Componentes implementados (no tocar sin razón)
- **Autenticación Firebase** (líneas ~306–380): login/registro con username → email interno (`@predicadores.app`).
- **Sincronización nube/local** (`cloudLoad`, `cloudSave`, `readLocal`, `writeLocal`): merge por `updatedAt`.
- **Cronómetro** (`swCard`, `swStart`, `swPause`, `swReset`, `swSave`): funciona y conecta con el registro de tiempo.
- **Vista Calendario** (`viewCalendar`, `dayPanel`, `timeFormHtml`): MODIFICADA en esta sesión.
- **Vista Resumen** (`viewResumen`): MODIFICADA en esta sesión (gráfico comparativo).
- **Vista Cursos** (`viewCursos`, `viewCourseProfile`, `logFormHtml`): sin cambios.
- **Ajustes** (`openSettings`, `settingsHtml`, `bindSettings`): sin cambios.
- **Sistema de temas/paletas** (`PALETTES`, `applyTheme`, `curTheme`): sin cambios.
- **Alarmas** (`checkAlarms`, `triggerAlarm`): sin cambios.

### Funcionalidades críticas (no romper)
- El merge nube/local usa `updatedAt` como timestamp de versión — si se rompe, los usuarios perderían datos.
- `monIdx(d)` = `(d.getDay()+6)%7` convierte días JS (domingo=0) a lunes=0. Esta fórmula es correcta y no debe cambiarse.
- El año de servicio teocrático empieza en septiembre: `svcStartOf` y `svcMonths` implementan esto.

---

## 4. Arquitectura

### Tecnologías
- **HTML/CSS/JS vanilla** — sin bundler, sin framework.
- **Firebase 12.15.0** (CDN): `firebase-app`, `firebase-auth`, `firebase-firestore`.
- **Fuentes Google Fonts**: Fraunces (serif, para números y títulos) + Inter (sans-serif, cuerpo).
- **SVG inline** para todos los gráficos (líneas, área, puntos) — sin librerías de charts.
- **PWA**: `manifest.json`, `sw.js` (service worker), iconos en múltiples resoluciones.

### Organización del proyecto
```
/
├── index.html          ← TODO el código (HTML + CSS + JS)
├── manifest.json       ← configuración PWA
├── sw.js               ← service worker (cache)
├── favicon.ico
├── apple-touch-icon.png
├── icon-192.png / icon-192-maskable.png
├── icon-512.png / icon-512-maskable.png
└── README.md
```

### Patrones de diseño
- **Render completo en cada cambio de estado**: `render()` regenera el HTML de `#app` con `innerHTML`. No hay DOM diffing.
- **Estado global único**: objeto `state` con `entries`, `courses`, `appointments`, `goalHours`, etc.
- **Persistencia dual**: localStorage (offline) + Firestore (cloud), merge por timestamp.
- **Event delegation**: los `bind()` se reejecutran tras cada `render()` usando `querySelectorAll`.
- **CSS Custom Properties**: todos los colores son variables CSS (`--pine`, `--gold`, `--ink`, etc.) que `applyTheme()` sobreescribe para theming.

---

## 5. Decisiones importantes tomadas en esta sesión

### Un único grid para el calendario (decisión clave)
**Problema:** Dos grids CSS separados (`.cal-head` para etiquetas + `.cal-grid` para celdas) nunca se alinean perfectamente porque el navegador los calcula independientemente — los errores de redondeo de píxeles se acumulan y varían según el ancho de pantalla.

**Decisión:** Unificar en `.cal-wrap`, un solo `display:grid` que contiene los 7 `<span class="cal-hd">` de encabezado seguidos de todas las celdas `<button class="cell">`. Los anchos de columna son literalmente los mismos objetos del layout.

**Alternativas descartadas:**
- Mantener dos grids y ajustar padding/gap manualmente → no es robusto.
- Usar `table` HTML → rompería el diseño visual existente.
- JavaScript para calcular posiciones → sobreingeniería.

### `min-width:0; min-height:0` en celdas
**Problema:** En CSS Grid, `1fr` no puede reducir una columna por debajo de su `min-content`. Con `aspect-ratio:1` en botones y texto acentuado en headers ("MIÉ", "SÁB"), algunos navegadores calculaban mínimos distintos por columna → columnas desiguales en pantallas < 480px.

**Decisión:** `min-width:0; min-height:0` en `.cell` y `min-width:0` en `.cal-hd` eliminan la restricción de tamaño mínimo.

### `overflow:hidden` en `.card`
**Decisión:** Añadir `overflow:hidden` globalmente a `.card` para que las celdas no desborden visualmente las esquinas redondeadas (`border-radius:16px`). Verificado que ningún hijo de `.card` usa posicionamiento absoluto que requiera sobresalir del card.

### Gráfico comparativo: barras → líneas SVG
**Decisión:** La función `monthCmpLineSVG()` genera SVG inline reutilizando las clases CSS `.lchart`, `.area`, `.line`, `.dot`, `.dot.cur` ya existentes para el gráfico anual. Se añadió `.lchart .vlab` para las etiquetas de valor.

**Removido:** Las clases CSS `.cmp`, `.cmp-bar`, `.cmp-track`, `.cmp-v`, `.cmp-l` y la variable `cmpMax`.

---

## 6. Convenciones del proyecto

### Estilo de código
- **CSS**: todo en una línea por selector, propiedades separadas por `;`. Sin saltos de línea dentro de una regla. Minimalista.
- **JS**: sin `const`/`let` redundantes, sin comentarios obvios. Arrow functions para callbacks cortos.
- **HTML generado**: template literals de JS. El HTML es generado dinámicamente, no existe en el archivo como markup estático (excepto el shell inicial).
- Sin librerías externas de JS excepto Firebase (que se importa desde CDN).
- Sin TypeScript, sin transpilación, sin bundler.

### Convenciones de nombres
- Clases CSS: kebab-case (`.cal-wrap`, `.cal-hd`, `.cmp-v`).
- Variables JS: camelCase (`viewY`, `viewM`, `selDate`, `timeDraft`).
- Funciones de vista: `viewCalendar()`, `viewResumen()`, `viewCursos()`.
- Funciones de formulario: `timeFormHtml()`, `courseFormHtml()`, `logFormHtml()`.
- Funciones de bind: `bind()`, `bindSettings()`, `bindProfile()`.
- IDs HTML: camelCase (`sw-display`, `addTime`, `authUser`).
- Constantes de datos: MAYÚSCULAS (`MESES`, `MES_ABR`, `DIAS`, `DIAS_ABR`, `TYPES`, `PALETTES`).

### Buenas prácticas a mantener
- Siempre escapar HTML con `esc()` antes de insertar contenido de usuario en el DOM.
- No usar `innerHTML` con datos sin escapar.
- Guardar en Firestore con debounce (`cloudTimer`, 1200ms) para no saturar.
- El `state.updatedAt` debe actualizarse en cada `save()`.
- No añadir dependencias externas salvo Firebase.

---

## 7. Estado funcional

### Funciona correctamente
- Login / registro / logout con Firebase Auth.
- Registro de tiempo de predicación (horas, minutos, estudios, revisitas, notas).
- Cronómetro integrado que genera un registro.
- Navegación por meses del calendario.
- Vista Resumen con gráfico anual de líneas y gráfico comparativo de líneas.
- Gestión de cursos bíblicos y su historial de clases.
- Agenda de citas con alarmas opcionales.
- Temas de colores (5 paletas, modo claro/oscuro, personalización por color).
- Sincronización nube/local con merge por timestamp.
- PWA instalable (service worker, manifest).

### Requiere pruebas / verificación pendiente
- **Calendario en dispositivo real < 480px**: el último fix (`min-width:0`) aún no fue confirmado visualmente por el usuario.
- **Navegación entre meses en iOS Safari**: `aspect-ratio` en grid items puede comportarse diferente en WebKit antiguo.

### Errores conocidos
- Ninguno conocido actualmente tras los fixes de esta sesión.

### No desarrollado (fuera de scope actual)
- Exportación de datos (PDF, CSV).
- Notificaciones push remotas.
- Multi-idioma.
- Vista semanal del calendario.

---

## 8. Próximos pasos recomendados

### Prioridad alta
- Confirmar con el usuario que el calendario quedó alineado correctamente en su dispositivo tras el último push.
- Si reporta más issues de calendario, verificar en múltiples anchos de pantalla (280px, 320px, 375px, 414px).

### Prioridad media
- Revisar si `font-size:14px` en celdas de días es legible en pantallas muy pequeñas (< 320px). Podría necesitarse `font-size: clamp(11px, 3.5vw, 14px)`.
- Probar el gráfico comparativo de líneas en el dispositivo del usuario — aún no hay confirmación visual.

### Mejoras futuras (discutidas implícitamente o lógicamente siguientes)
- El gráfico anual (`lineChartSVG`) y el comparativo (`monthCmpLineSVG`) son independientes pero comparten estilos CSS vía `.lchart`. Si se modifica uno, revisar que no afecte al otro.
- El calendario podría mostrar un indicador visual del mes actual al navegar (actualmente solo resalta `today`).

---

## 9. Archivos relevantes

### Modificados en esta sesión
- `index.html` — único archivo modificado. Todos los cambios están aquí.

### Lógica principal (dentro de `index.html`)
| Sección | Líneas aprox. | Descripción |
|---------|--------------|-------------|
| CSS completo | 20–264 | Todos los estilos, incluyendo los fixes del calendario |
| Firebase config + auth | 306–380 | Inicialización y control de acceso |
| Estado y utilidades | 381–530 | `state`, `MESES`, `pad`, `iso`, `monIdx`, `fmtDur`, etc. |
| Gráficos SVG | 531–560 | `lineChartSVG`, `monthCmpLineSVG` |
| Vistas principales | 661–930 | `viewCalendar`, `viewResumen`, `viewCursos`, `viewCourseProfile` |
| Formularios | 714–952 | `timeFormHtml`, `apptFormHtml`, `courseFormHtml`, `logFormHtml` |
| Eventos y bind | 1036–1180 | `bind`, `bindProfile`, `syncSel` |
| Ajustes | 957–1025 | `settingsHtml`, `bindSettings`, `saveSettings`, `wipeAll` |
| Control de acceso | 1202–1267 | Login UI, `onAuthStateChanged` |

### Revisar primero
1. CSS de calendario: líneas 56–65 (`.cal-wrap`, `.cal-hd`, `.cell`).
2. `viewCalendar()`: línea ~661 — generación del HTML del calendario.
3. `monthCmpLineSVG()`: línea ~528 — gráfico comparativo nuevo.
4. `lineChartSVG()`: línea ~515 — gráfico anual (no modificado en esta sesión).

---

## 10. Contexto importante que no debe perderse

### Workflow de desarrollo establecido
- **Rama de trabajo:** Inicialmente se usó una rama feature (`claude/calendar-alignment-chart-format-9abwnt`) con PR, pero el usuario pidió trabajar **directamente en `main`**. A partir del tercer commit de esta sesión, todos los cambios se hacen con `git push origin main` directamente.
- No crear PRs salvo que el usuario lo solicite explícitamente.

### Criterios de diseño del usuario
- La app es para **uso personal/religioso** (registro de predicación de Testigos de Jehová).
- El diseño debe ser **limpio, minimalista, mobile-first**.
- Los gráficos deben ser **SVG inline** (sin librerías externas como Chart.js).
- Preferencia por **líneas sobre barras** para gráficos comparativos.
- Los colores base son tonos verdes/pino (`--pine: #2f5d50`) y dorado (`--gold: #bf942b`).

### Restricciones del proyecto
- **Un solo archivo HTML**: toda la app vive en `index.html`. No se deben crear archivos JS/CSS separados sin acuerdo explícito del usuario.
- **Sin bundler ni build step**: el archivo debe funcionar abriéndolo directamente en el navegador o desde un servidor estático.
- **Firebase gratuito**: el proyecto usa el plan Spark de Firebase. No proponer soluciones que requieran Cloud Functions u otros servicios de pago.
- **Sin librerías adicionales**: no agregar npm packages, CDN scripts ni dependencias más allá de Firebase (ya incluido) y Google Fonts (ya incluido).

### Comportamiento del año de servicio
- El "año de servicio" teocrático va de **septiembre a agosto** (no enero–diciembre).
- `svcStartOf(y, m)`: retorna el año en que empieza el año de servicio que contiene el mes `m` del año `y`. Si `m >= 8` (septiembre+), es `y`; si no, es `y-1`.
- `svcMonths(sy)`: retorna los 12 meses del año de servicio, empezando en septiembre de `sy`.
- La variable `resY` en el estado de la UI es el año de inicio del año de servicio visualizado en Resumen.

### Firebase
- **Proyecto Firebase:** `informe-de-servicio-aaba2`
- **Emails internos:** los usernames se convierten a `username@predicadores.app` para Firebase Auth. El usuario nunca ve esto.
- **Estructura Firestore:** colección `users` → documento `{uid}` → campos `data` (el estado completo serializado), `updatedAt`, `username`, `email`.

---

## 11. Instrucciones para el próximo Claude Code

### Estado real del proyecto
El código en `main` tiene todos los fixes aplicados. El último commit (`85504c5`) agregó `min-width:0; min-height:0` a las celdas del calendario para resolver columnas desiguales en pantallas < 480px. **Este fix aún no fue confirmado visualmente por el usuario** — puede haber un follow-up inmediato.

### Antes de modificar código
1. Lee las líneas 56–65 del CSS (`.cal-wrap`, `.cal-hd`, `.cell`) para entender el estado actual del calendario.
2. Entiende que hay **un único grid** (`.cal-wrap`) para header + celdas — no intentes volver a separarlo.
3. Verifica el commit log con `git log --oneline` para saber exactamente qué se hizo en esta sesión.

### Qué NO asumir
- No asumir que el usuario confirmó visualmente todos los fixes — puede llegar con más reportes de UI.
- No asumir que el CSS soporta variables modernas fuera de las ya definidas en `:root`.
- No asumir que hay un entorno de desarrollo local — el usuario prueba directamente desde producción.
- No asumir que se puede añadir un segundo archivo JS o CSS — todo va en `index.html`.

### Qué decisiones respetar
- **Un solo grid para calendario** — no volver a separar en `cal-head` + `cal-grid`.
- **`min-width:0; min-height:0` en `.cell`** — no eliminarlo, es la solución correcta para el problema de columnas desiguales.
- **`overflow:hidden` en `.card`** — necesario para que los bordes redondeados recorten correctamente.
- **Gráficos SVG inline** — no proponer Chart.js u otras librerías.
- **Push directo a `main`** — el usuario prefiere no usar PRs.
- **Sin comentarios en el código** — el estilo del proyecto es código minimalista sin comentarios.

### Cómo continuar el desarrollo
1. Si el usuario reporta más issues de calendario, usar DevTools para inspeccionar el grid y medir anchos de columna reales.
2. Para nuevas features, seguir el patrón: función de vista que retorna HTML string → `render()` lo inyecta → `bind()` añade event listeners.
3. Después de cada cambio: `git add index.html && git commit -m "..." && git push origin main`.
4. El mensaje de commit debe describir el "qué" y el "por qué" del cambio, siguiendo el estilo de los commits anteriores en español.
5. Si el usuario pide algo que requiere un nuevo archivo, preguntar antes de crearlo — es una restricción implícita importante.

---

*Generado al final de la sesión. Fecha del último commit: `85504c5` — "fix: columnas del calendario iguales en pantallas pequeñas".*
