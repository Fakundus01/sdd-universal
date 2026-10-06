# contracts.md · SDD Hub

**Versión:** 0.10 · La web no expone API propia. Sus contratos son dos: la **forma de los archivos de datos** que consume, y las **llamadas a Supabase** que hace.

---

## 1 · `web/tecnologias.js` — generado

Define un global `TECH`. Una entrada por tecnología:

```js
{ n: "React",              // nombre, único, es la clave con la que se guarda
  c: "Bibliotecas",        // categoría — agrupa en la lista
  sc: "",                  // subcategoría, puede ir vacía
  t: "Library",            // tipo real
  e: "JavaScript/TypeScript", // ecosistema tal como vino de la fuente
  f: "JavaScript / TypeScript", // familia — normalizada, es la que filtra
  u: "Frontend",           // uso principal
  os: true,                // open source
  a: "…" }                 // opcional (0.33): lección de proyectos reales; viaja al prompt con la tecnología
```

`e` vs `f`: la fuente traía `JS/TS`, `JavaScript` y `JavaScript/TypeScript` como valores distintos para lo mismo. `e` conserva el original (fidelidad) y `f` agrupa (usabilidad del filtro). **Se muestra `e`, se filtra por `f`.**

**Fuente:** hoja `Todo` de `catalogo_tecnologias_software.xlsx`. No editar a mano (ADR-004). **Excepción desde 0.33:** las tecnologías que piden proyectos reales entran a mano en `tecnologias.js` y en `tecnologias.md` en el mismo cambio; `web/tests/combinador.test.mjs` controla que las dos listas sean la misma y que ningún «N tecnologías» de la web quede viejo.

**Lo que no está en el catálogo** (la persona lo busca y lo suma igual) se guarda en la selección con su nombre tal cual, y `Prompt.armar` lo manda en un bloque aparte, `PEDIDAS QUE NO ESTÁN EN EL CATÁLOGO`. Antes de 0.33 se perdía sin aviso.

---

## 2 · `web/reglas.js` — generado

Define un global `REGLAS`, en el orden del master:

```js
{ id: "R01", nombre: "GIT-OK", def: "ON",
  tipo: "desactivable",           // "fija" | "desactivable"
  nota: "avisar siempre",         // el paréntesis del master, puede ir vacío
  d: "Nunca git commit ni git push sin OK explícito del humano. …" }
```

`tipo` es el contrato que importa: `fija` significa que el configurador la muestra con candado y **no** puede apagarla (ADR-006).

**Fuente:** §4 de `SDD-MASTER.md`, parseada. No editar a mano.

---

## 3 · Formato de salida: `custom.md`

Lo que genera el configurador tiene que ser leíble por el agente **sin instrucciones extra**, así que respeta la sintaxis publicada en el `custom.md` del paquete:

```
PERFIL=ESTRICTO|CONFIANZA
MODO=FULL|LITE|COMPACT|FEDERADO
VARIANTE=WEB|DATA|GAME|API-only
Rxx=OFF                    # una por línea, solo desactivables
R05.max=<entero>           # parámetro
R14.stack=<texto>          # parámetro
+R27-NOMBRE: descripción   # regla propia
```

**Compromiso:** si cambia esta sintaxis en el paquete, cambia acá el mismo día. Un `custom.md` que el agente no entiende es peor que no tenerlo, porque el usuario cree que está configurado.

---

## 4 · Supabase (PostgREST + GoTrue)

Todo con header `apikey` y, salvo el primero, `Authorization: Bearer <access_token>`.

| Llamada | Para qué | Respuesta esperada |
|---|---|---|
| `POST /auth/v1/otp?redirect_to=…` | Pedir el magic link | `200`. Responde igual exista o no el email |
| `GET /auth/v1/user` | Traer id y email de la sesión | `200` con el usuario, `401` si el token venció |
| `POST /auth/v1/token?grant_type=refresh_token` | Renovar antes de vencer | `200` con tokens nuevos |
| `POST /auth/v1/logout` | Cerrar sesión del lado del servidor | `204`. Si falla, igual se limpia lo local |
| `GET /rest/v1/combinaciones?select=*&order=actualizado_en.desc` | Listar las propias | `200`. RLS filtra por usuario: nunca hace falta mandar `usuario_id` |
| `POST /rest/v1/combinaciones?on_conflict=usuario_id,nombre` con `Prefer: resolution=merge-duplicates,return=representation` | Guardar o pisar | `201` con la fila |
| `DELETE /rest/v1/combinaciones?id=eq.<id>` | Borrar una | `204` |
| `PATCH /rest/v1/perfiles?id=eq.<id>` | Guardar el tema elegido | `204` |
| `POST /rest/v1/eventos` (sin sesión, a propósito) | Sumar un contador anónimo | `201`. Solo se mandan `tipo` y `detalle`: `id` y `dia` los pone la base (con cualquiera de los dos en el cuerpo, `401`/`403`). El `detalle` tiene que seguir el formato de su tipo (§6): si no, `400` |
| `GET /rest/v1/metricas_30_dias?select=*` | El reporte de outcomes del panel | `200`; vacío para quien no es admin (RLS). `tipo, detalle, total` de los últimos 30 días |

**El contrato que no se ve:** las consultas **nunca** filtran por usuario en el query string. Lo hace RLS del lado del servidor. Si alguna vez se agrega un `&usuario_id=eq.…` "por las dudas", es señal de que alguien dudó de las políticas — y esa duda se resuelve arreglando las políticas, no el front.

**Degradación:** sin `SUPABASE.url` y `SUPABASE.key`, ninguna de estas llamadas ocurre y las mismas funciones trabajan contra `localStorage`. La interfaz de `sesion.js` es idéntica en los dos casos.

---

## 5 · `web/prompt.js` — el prompt de arranque (0.33)

`Prompt.armar(opciones)` es puro: no lee el DOM. `combinador.js` le pasa:

| Opción | De dónde sale |
|---|---|
| `tipo`, `stack` | `TYPES[ctype]` y `STACKS[cstack]` (`catalogo.js`) |
| `nivel`, `brownfield` | los selects del combinador |
| `playbooks`, `tecnologias`, `catalogo` | los tildados, la selección (`sel`) y `TECH` |
| `perfil`, `custom`, `apagadas` | el configurador, **única fuente del perfil**: `ReglasUI.perfil()`, `hayCambios()` y `apagadas()`, con `R01` sumada si el perfil es CONFIANZA. El select del combinador escribe con `ReglasUI.fijarPerfil` y se repinta con `ReglasUI.alCambiar` |
| `ia` | el checkbox «IA en el producto» (`#cia`) |
| `lite` | `Prompt.esLite({modo, tipo})`: el modo del configurador, o FULL + un tipo que ya es LITE (calc, guía, proceso) |

**Tecnologías de afuera** (link compartido, combinación guardada, la base): `Prompt.limpiarTecnologia` las deja en una línea, sin caracteres de control y con 60 caracteres como máximo, al cargarlas (`cuenta.js`) y otra vez al armar el prompt. Las vacías se descartan.

**Prompt y ZIP del mismo estado:** `opcionesPaquete()` arma el prompt con `buildPrompt()`, nunca con el textarea. Si ya se generó, cualquier cambio en el combinador, en la selección de tecnologías o en «Mis reglas» regenera el prompt, la lista de archivos y el árbol (`refrescarSalida`).

Lo que promete el texto, y testean `web/tests/combinador.test.mjs` y `combinador-ui.test.mjs`:
- **R01 apagada** (por `R01=OFF` o por perfil CONFIANZA): el prompt dice `R01=OFF` y no pide esperar el OK del commit ni avisa que R01 es desactivable.
- **`ia`**: bloque `IA EN EL PRODUCTO` con N4 (R26, tope reservado antes de llamar, salida como dato), la recomendación de modelo de R12 salvo que esté apagada, y el playbook `ia-en-el-producto`, que además se suma solo a la lista de playbooks (`Prompt.playbooks`).
- **`lite`**: `MODO: LITE` y que `sdd/sdd-lite.md` se arma con la plantilla `sdd/prompts/sdd-lite.md`, que el ZIP trae siempre.

## 6 · Métricas: el formato del detalle (0.33, ADR-013)

| Tipo | `detalle` | Quién lo manda |
|---|---|---|
| `visita` | `/web/\|movil` — carga de la página, con la clase del dispositivo | `inicio.js` |
| `visita` | `#/<vista>\|escritorio` — cambio de vista | `app.js` |
| `visita` | `md:<archivo>` — vista previa de un MD (sin clase) | `inicio.js` |
| `descarga` | nombre del archivo | `catalogo.js` |
| `combinacion` | `tipo/stack/nivel/existe` — clic en «Generar» | `manuales.js` |
| `paquete` | `proyecto:<tipo>`, `rapido:<tipo>`, `sueltos`, `skills` | `combinador.js`, `manuales.js` |

| `perfil` | `nivel:<x>`, `interes:<tipo>`, `agente:<x>` (onboarding) | `perfil.js` |

La clase la calcula `Metricas.clase` con `matchMedia("(pointer: coarse)")`. **Nunca se lee el user-agent.** `Metricas.visita` corta el lugar antes de pegar la clase, para que el sufijo nunca quede roto.

**Lo que hace cumplir la base** (`eventos_detalle_formato_check`, `NOT VALID`: solo filas nuevas). La fuente es `supabase/metricas.sql`; en esta tabla, la barra que separa la clase en las visitas va escapada en el SQL (`\|`) y Markdown la muestra como `|`:

| Tipo | Patrón |
|---|---|
| `visita` | `^((/[A-Za-z0-9._/-]{0,80}\|#/[a-z]{1,20})\|(movil\|escritorio)\|md:[A-Za-z0-9._-]{1,80})$` |
| `descarga` | `^[A-Za-z0-9._-]{1,60}$` |
| `combinacion` | `^[a-z0-9-]{1,30}/[a-z0-9-]{1,20}/(NOVATO\|PRO)/(nuevo\|brownfield)$` |
| `paquete` | `^(sueltos\|skills\|(proyecto\|rapido):[a-z0-9-]{1,30})$` |
| `perfil` | `^(nivel\|interes\|agente):[A-Za-z0-9-]{1,30}$` |

Ninguno admite espacios, `@` ni saltos de línea. **Lo que no garantiza:** un slug corto puede ser un nombre de persona. Permisos: `anon` y `authenticated` solo tienen `INSERT (tipo, detalle)`, así que `id` y `dia` no se eligen (0.33.2); la política de alta exige además `dia = hoy (UTC)`, y la vista `metricas_30_dias` acota `dia <= hoy`.

## 7 · Rutas de la web (0.34, ADR-015)

| Ruta | Qué sirve | Vista |
|---|---|---|
| `/web/` · `/web/inicio` | `index.html` | inicio |
| `/web/catalogo` (`?cat=`, `?q=`, `?lvl=`) | `index.html` | catalogo |
| `/web/combinador` (`?c=<combinación en base64url>`) | `index.html` | combinador |
| `/web/tecnologias` · `/web/reglas` · `/web/manuales` · `/web/comunidad` | `index.html` | la del nombre |
| `/web/perfil` · `/web/preferencias` · `/web/configuracion` | `index.html` | la del nombre |
| `/web/login` (`?volver=<ruta interna>`) | `index.html` | login |
| `/web/admin` · `/web/guia` · `/web/demo` | `admin.html` · `guia.html` · `demo.html` | (páginas aparte) |
| `/web/<nombre>/` | 308 a `/web/<nombre>` | — |
| `/web/<algo>.<ext>` que no existe | 404 | — |

**Regla del servidor** (`dev/servidor.mjs` y `vercel.json`): `^/web/[a-z][a-z0-9-]*$` → `web/<nombre>.html` si existe, si no `web/index.html`. Todo lo demás, como antes.

**Links viejos:** `…/web/#/<vista>?<query>` y `…/web/index.html#/<vista>?<query>` → `/web/<vista>?<query>` con `history.replaceState`, del lado del navegador (el servidor no ve el hash). Una vista desconocida va a Inicio.

**`volver`** (`Rutas.volverSeguro`): se acepta solo un string que empiece con `/web/`, sin `//` al principio, sin `\` ni caracteres de control, que resuelto contra el origen siga en el mismo origen y bajo `/web/`, y que no sea `/web/login`. Cualquier otra cosa → `/web/`.

**Métricas:** el detalle de una visita sigue siendo `#/<vista>|clase` al cambiar de vista (es una etiqueta, no una URL: así no cambia el formato de `eventos` ni los outcomes) y `<pathname>|clase` al cargar una página (`/web/combinador|movil`), que ya entraba en el patrón de §6.

