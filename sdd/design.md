# design.md · SDD Hub

**Versión:** 0.10 · **Última actualización:** 2026-10-09

## 1 · La decisión que ordena todo: sin build

No hay `package.json`, ni bundler, ni paso de compilación. Se abre `web/index.html` y funciona.

**Por qué:** un paquete cuya tesis es "menos ceremonia, más claridad" no puede necesitar `npm install` para mostrar su propia página. Además elimina de un saque toda una familia de problemas: vulnerabilidades de dependencias (R19), builds que se rompen en el deploy, y la brecha entre "anda en mi máquina" y "anda en Vercel".

**Lo que cuesta:** sin transpilar, el JS tiene que ser el que entienden los navegadores de hoy — se usa optional chaining, `??`, módulos por convención y nada más exótico. Y sin bundler, cada archivo es un `<script>` más: por eso son pocos y con responsabilidad clara.

## 2 · Archivos y responsabilidades

```
web/
├── base.css            tokens de color, reset, barra superior y pie (compartido)
├── tema.js             claro/oscuro; oscuro por default; avisa a quien se enganche
├── index.html          el catálogo, el combinador y los diálogos (solo HTML desde 0.31)
├── rutas.js            URL ↔ vista, links viejos #/ → ruta, `volver` seguro, puro (0.34) ┐
├── catalogo.js         shell, datos de las cards, estado en la URL, render       │
├── tecnologias-vista.js vista/popup de tecnologías, paginación, mover ventanas   │ el JS de
├── prompt.js           el texto del prompt de arranque, puro (0.33)            │
├── combinador.js       junta el estado, lista de archivos, ZIP, descarga rápida  │ index.html,
├── manuales.js         recorrido guiado y vista Manuales                         │ en este orden
├── cuenta.js           sesión, combinaciones guardadas, entrar, contraseña       │ (D1)
├── inicio.js           vista previa de MD, compartir, buscador, init             ┘
├── zip.js / paquete.js ZIP sin dependencias / qué va en la carpeta del proyecto
├── og.py               genera og.png (Pillow); el número de reglas sale del master
├── tests/              node --test web/tests/*.test.mjs — sin navegador, en CI
├── guia.html           la guía navegable
├── demo.html           la comparación con/sin SDD
├── demo-sin-sdd.html   widget de reservas construido sin spec
├── demo-con-sdd.html   el mismo widget, con los criterios de la spec
├── tecnologias.js      DATO — 130 tecnologías, con la lección de proyectos reales cuando hay
├── metricas.js         clase de dispositivo y reporte de outcomes, puro (0.33, ADR-013)
├── reglas.js           DATO — espejo de la §4 del master, controlado por tests/ (ADR-004)
├── reglas-ui.js        configurador de reglas → custom.md
├── sesion.js           auth y persistencia (Supabase o localStorage)
└── supabase-config.js  las dos claves públicas; vacío por default
```

Regla que sostiene el orden: **los archivos `.js` de datos tienen una sola fuente.** `tecnologias.js` sale de la planilla y `reglas.js` es espejo de la §4 del master. El generador de `reglas.js` nunca quedó en el repo, así que desde 0.31 la sincronía la controla un test en CI (ADR-004, revisión).

Los seis archivos del JS de `index.html` son **scripts clásicos que comparten el ámbito global**, cargados en orden. Lo que se ejecuta al cargar solo puede usar lo declarado en ese archivo o en los anteriores; desde los handlers se puede usar cualquier cosa, porque cuando corren ya cargó todo.

## 3 · Tema

Un solo lugar decide el color: `base.css` define los tokens en `:root` (oscuro) y los pisa en `:root[data-theme="light"]`. Ninguna regla de color vive fuera de esos dos bloques.

`tema.js` solo cambia el atributo y guarda la elección. **No consulta `prefers-color-scheme`**: el default es oscuro y punto (ADR-005). Quien quiera engancharse — por ejemplo para sincronizar la preferencia con la cuenta — usa `Tema.alCambiar(fn)`, así `tema.js` no necesita saber que Supabase existe.

## 4 · Sesión con degradación

`sesion.js` expone la misma interfaz esté o no configurado Supabase:

```
listar() · guardarCombinacion() · borrarCombinacion() · usuario()
```

Sin configurar → `localStorage`. Configurado y con sesión → PostgREST. **La interfaz no cambia**, así que el resto de la página nunca pregunta "¿hay cuenta?" para decidir cómo guardar. Es lo que hace que C4 (funcionar sin cuenta) no llene el código de condicionales.

Habla con las APIs HTTP de Supabase directo, sin el SDK: son cuatro endpoints y traer una librería entera por eso contradice C2.

Al entrar por primera vez, `migrarLocales()` sube lo que había en el navegador. Sin eso, registrarse te haría perder lo que venías armando — el peor momento posible para perder algo.

## 4b · Rutas, entrada y preferencias (0.34, ADR-014 y ADR-015)

**Una vista, una ruta.** `rutas.js` traduce `/web/<vista>` ↔ vista y es lo único que sabe armar URLs de la app. `App.ir` hace `pushState` y `popstate` vuelve a leer el `pathname`. Inicio es `/web/` (también acepta `/web/inicio`). Una ruta que no existe muestra Inicio y deja la URL en `/web/`.

**El servidor resuelve.** Un pedido a `/web/<nombre>` sin extensión (una sola parte, `[a-z][a-z0-9-]*`) sirve `web/<nombre>.html` solo para las páginas de una lista explícita (`admin`, `guia`, `demo`: `PAGINAS` en `dev/servidor.mjs`, la misma que los rewrites de `vercel.json`, y un test las compara), y si no, `web/index.html`. Inicio tiene una sola URL, `/web/`: `/web/inicio` y `/web/index.html` se normalizan con `replaceState` (0.34.1). Con barra final, 308 a la ruta sin barra: así los recursos relativos (`base.css`, `app.js`) siempre resuelven contra `/web/`. Lo mismo hacen `vercel.json` (rewrites) y `dev/servidor.mjs`; nada de esto abre archivos nuevos: el resto sigue pasando por la lista blanca del estático.

**Links viejos.** `rutas.js` corre primero entre los scripts de la app: si la URL trae `#/x?…`, la reemplaza (sin recargar) por `/web/x?…`. Cubre marcadores, links compartidos y los MD que todavía digan `index.html#/…`.

**Los filtros del catálogo** (`?cat=`, `?q=`, `?lvl=`) viven en la URL solo en `/web/catalogo`: en otra ruta `writeURL` no toca la URL, que es lo que borraba el `?c=` de un link compartido.

**Entrar es una vista, no un portón.** `/web/login` es la vista `login` de la app: comparte la sesión, el tema y el shell sin duplicar la cabecera. Al entrar vuelve a `?volver=` solo si `Rutas.volverSeguro` lo acepta (misma origen, empieza con `/web/`, sin `//`, `\`, control ni esquema). `/web/admin` es `admin.html` (una página aparte: el panel no carga la app), y sin sesión manda a `login?volver=/web/admin`. El diálogo de cuenta queda solo para cambiar la contraseña.

**Preferencias: dos lugares, a propósito.** `/web/preferencias` es «qué sos» (nivel, qué querés construir, perfil SDD, agente y nombre): el onboarding como página, con su barra de pasos, «Saltar» y «Atrás», sin tapar nada. Viaja con la cuenta. La apariencia (tema, texto, animaciones, logo, secciones) se queda en `/web/configuracion`: es por dispositivo, la leen todas las páginas al cargar desde `sdd-prefs`, y mezclarla con las preguntas haría del onboarding una página de veinte controles. La primera visita sin onboarding que entra por Inicio va a `/web/preferencias` (con `replaceState`, sin sumar un paso al atrás); un link profundo, como un combinador compartido, se respeta. «Rehacer» del perfil lleva ahí.

## 5 · Diálogos

Tres: tecnologías, reglas y cambiar la contraseña (el login pasó a `/web/login` en 0.34). Todos `<dialog>` nativo con `showModal()`, que ya trae foco atrapado, cierre con Escape y `::backdrop`.

**Una trampa que nos comimos:** el reset `*{margin:0}` pisa el `margin:auto` del user-agent, que es lo que centra un `<dialog>` modal. Con `inset:0` y sin margin, queda clavado arriba a la izquierda. Está documentado en ADR-007 porque el síntoma no sugiere para nada la causa.

El de tecnologías además se arrastra desde el encabezado, con tope para que no se pueda sacar de la pantalla. En celular no se arrastra y pasa a pantalla completa: mover ventanas con el dedo en 375 px no le sirve a nadie.

## 6 · Paginación

Un solo `pager(total, pagina, porPagina, destino)` devuelve el HTML y un listener delegado en `document` resuelve los clics según `data-go`. Lo usan el catálogo (12) y las tecnologías (20).

**Dónde a propósito NO se pagina:** el configurador de reglas. Son 26 ítems y es una pantalla de configuración, no de exploración — paginar ahí obliga a ir y volver para ver qué apagaste. En su lugar hay un filtro "solo las que se pueden apagar", que es lo que realmente se necesita.

## 7 · Los dos demos

Comparten estilo visual a propósito: si el "sin SDD" se viera feo, la comparación sería tramposa. La diferencia está solo en el comportamiento ante los casos borde.

El código que muestra `demo.html` se **lee del archivo en vivo** entre los marcadores `/* <<<CODIGO */`. Nunca puede quedar desactualizado respecto de lo que está corriendo arriba, que es exactamente el tipo de mentira que este proyecto no se puede permitir.

## 8 · Entorno local (`dev/`, ADR-012)

```
dev/
├── dev.mjs              CLI: arrancar (default) · parar · reset · usuario · usuarios
├── postgres.mjs         el clúster propio (initdb, pg_ctl) y Psql: consultas por stdin
├── supabase-local.sql   el `auth` mínimo, los roles y los permisos que da Supabase
├── auth.mjs             GoTrue: token (password y refresh), user, logout; signup cerrado
├── rest.mjs             PostgREST: select, insert, upsert, update y delete con filtros eq…
├── servidor.mjs         HTTP: el repo como lo sirve Vercel + /auth/v1 + /rest/v1
└── tests/               node --test dev/tests/*.test.mjs — levanta un clúster temporal
```

La regla que lo sostiene: **el emulador traduce, Postgres decide.** `rest.mjs` arma el mismo SQL que armaría PostgREST y lo corre con el rol y los claims del pedido. No filtra filas ni chequea permisos por su cuenta: si lo hiciera, el test de RLS estaría probando al emulador y no a las políticas que van a la nube.

## 9 · Deuda de diseño consciente

- ~~`index.html` pasó las 300 líneas de JS que pide R05~~ — **resuelto en 0.31 (D1):** el JS inline se partió en seis archivos de 105 a 237 líneas sin la cabecera, cortando por las secciones que ya tenía, sin cambiar el código. Para verificarlo se corrió un smoke en Chrome headless antes y después del corte, con salida idéntica, y un rojo forzado con el orden de carga invertido.
- Tests automatizados parciales desde 0.31 (D2): el ZIP y la sincronía de las reglas, sin navegador. El resto se sigue verificando en el navegador (R07, front). Ver `testing.md`.

## 10 · Fusión con IA (ADR-016)

```
api/
└── fusionar.js          función serverless (Vercel, zero-config: cualquier cosa bajo /api/)
```

**Por qué `/api/` en la raíz, no `web/api/`:** ADR-002 ya fija la raíz del repo como root directory de Vercel; `/api/` ahí es la convención zero-config de Vercel para funciones Node, sin tocar `vercel.json`.

**Contrato (detalle en `contracts.md` §4):** recibe los bloques elegidos + la descripción libre de la persona, devuelve el `sdd/` fusionado como JSON de archivos (mismo formato interno que ya arma `combinador.js` para el ZIP — la función no reinventa el empaquetado, solo reemplaza el paso de "concatenar" por "pedirle a Claude que fusione").

**Reserva de gasto — por instancia, no global (DRIFT resuelto, ADR-016 opción B):** vive en memoria de la función misma (`SharedArrayBuffer`+`Atomics`), nada de Postgres nuevo para esto; un proyecto de Supabase ya pausado una vez por free tier (`costs.md`) no es donde confiar un lock de concurrencia. Esto sincroniza solo **dentro de una misma instancia tibia** de Vercel — es un freno de abuso local, no un tope global (Vercel corre N instancias en paralelo, cada una con su propio contador). **El techo real y duro es el límite de gasto de la consola de Anthropic** (workspace o API key), que hay que configurar antes de producción.

**Modo simulado (igual que `playbooks/ia-en-el-producto.md` §F):** sin `ANTHROPIC_API_KEY` en el entorno, la función devuelve la fusión v1 (concatenación plana) con un aviso — el combinador sigue andando entero sin key, como hoy.

**Lo que NO hace `dev/` todavía:** el entorno local (§8) no emula esta función — corre contra Vercel real (preview deploy) o, sin key, contra el modo simulado de arriba. No hace falta un emulador nuevo para esto.
