# decisions.md · SDD Hub

**Versión:** 0.9 · ADRs con fecha y motivo. No se borran ni se editan: si una decisión cambia, se agrega otra que la reemplaza.

---

## ADR-001 · HTML estático sin build — 2026-08-15 · Vigente

**Decisión:** sin bundler, sin framework, sin `package.json`. Vercel sirve archivos.

**Por qué:** el proyecto predica menos ceremonia; necesitar `npm install` para mostrar la propia web sería una contradicción visible. Como efecto secundario desaparecen los builds rotos en el deploy y casi toda la superficie de R19.

**Costo aceptado:** el JS tiene que ser el que entienden los navegadores actuales, y no hay minificado. Con esta escala, irrelevante.

---

## ADR-002 · Deploy en la raíz del repo, no en `web/` — 2026-08-15 · Vigente

**Contexto:** con Root Directory `web` en Vercel, la web se ve linda pero **todos los `.md` quedan fuera del sitio** y las descargas dan 404. Con Root Directory vacío las descargas andan, pero la URL queda en `/web/`.

**Decisión:** deployar la raíz, y que `vercel.json` haga el redirect `/` → `/web/`.

**Por qué:** las descargas *son* el producto. Una URL un poco menos linda es un costo mucho menor que un botón que no funciona. El redirect recupera casi todo: quien entra al dominio pelado cae en el catálogo igual.

---

## ADR-003 · Supabase para cuentas, con degradación a localStorage — 2026-08-15 · Vigente

**Decisión:** magic link por email; sin Supabase configurado, todo funciona contra `localStorage`.

**Por qué:** C4 dice que la web tiene que servir sin cuenta. La degradación no es un fallback de emergencia: es el modo normal para quien entra por primera vez. Además permite publicar el repo con la config vacía y que le funcione a cualquiera que lo clone.

**Alternativas:** Firebase (más features de las que hacen falta, y el vendor lock-in es peor), auth propio (habría que tener servidor, y eso rompe ADR-001).

---

## ADR-004 · Los datos se generan, no se transcriben — 2026-08-15 · Vigente

**Decisión:** `tecnologias.js` sale de la planilla y `reglas.js` de parsear la §4 de `SDD-MASTER.md`. No se editan a mano.

**Por qué:** transcribir 101 tecnologías y 26 reglas crea una segunda fuente de verdad. No es *si* se van a desincronizar, es *cuándo*: la primera vez que se agregue una R27 al master y nadie se acuerde de tocar la web. Generarlos hace que la desincronización sea imposible, no improbable.

**Costo:** hay que volver a correr el generador cuando cambie la fuente. Barato comparado con una web que miente sobre sus propias reglas.

**Revisión 2026-10-03 (0.31): lo que pasó de verdad.** El generador de `reglas.js` nunca quedó en el repo, igual que el script de `og.png` (D5). Pasó exactamente lo que este ADR anticipaba: R27 llegó tarde a la web (0.27) y R29–R32 también (0.30.1). Además, las descripciones de `reglas.js` no son una copia de la §4: son resúmenes escritos para la UI, así que regenerarlas las pisaría. Por eso, en vez de reconstruir el generador, la garantía pasa a ser **un test en CI** (`web/tests/paquete.test.mjs`): `id`, `nombre`, `def`, `tipo` y `nota` tienen que coincidir con los encabezados del master, el tablero tiene que listar las mismas reglas, y todo «N reglas» de la web tiene que decir el número real. El objetivo del ADR, que la desincronización no pueda pasar inadvertida, se cumple; cambia el medio. `tecnologias.js` sigue sin generador y sin test: el riesgo es menor, porque no lo cita ninguna regla.

---

## ADR-005 · Tema oscuro por default, sin consultar el sistema — 2026-08-15 · Vigente

**Decisión:** `:root` es oscuro. El claro es opt-in con el toggle, y queda guardado.

**Por qué:** pedido explícito del owner. Se descartó `prefers-color-scheme` a propósito: con esa consulta, alguien con el sistema en claro vería la versión clara y nunca sabría que existe la oscura, que es la identidad visual del proyecto.

**Lo que hay que cuidar:** ninguna regla de color puede vivir fuera de los dos bloques de tokens, o el tema claro se rompe de a pedazos sin que nadie lo note.

---

## ADR-006 · Las reglas `fijas` no se pueden apagar desde la web — 2026-08-15 · Vigente

**Decisión:** el configurador muestra las 26 reglas, pero las 13 marcadas como `fija` aparecen con candado y sin toggle.

**Por qué:** que el master las marque como fijas y la web las dejara apagar sería incoherente, y encima peligroso: son las que sostienen el sistema (spec antes que código, secretos fuera del repo, no reescribir la spec en silencio).

**Por qué se muestran igual, en vez de esconderlas:** ver cuáles *no* son negociables enseña tanto como poder apagar las otras. Una lista de 13 opciones no explica el sistema; una de 26 con 13 candados, sí.

---

## ADR-008 · Mail + contraseña como camino principal — 2026-08-15 · **Reemplaza a ADR-003**

**Qué pasó.** Con magic link, el primer intento real de entrar no funcionó: el botón se quedaba en "Entrar". La causa más probable es la entrega del mail — el SMTP incluido en el free tier de Supabase manda muy pocos correos por hora y cae seguido en spam.

**El problema de fondo:** el magic link tiene un único punto de falla, y no está en nuestro código. Si el mail no llega, no hay forma de entrar. Ninguna. Con contraseña, el mail deja de estar en el camino crítico.

**Decisión:** registro y acceso con **mail + contraseña** (mínimo 8 caracteres) como camino principal. El magic link y el recupero de contraseña quedan como alternativas secundarias, claramente marcadas como "dependen de que llegue el mail".

**Consecuencia obligada:** para que esto sirva de verdad hay que apagar **Confirm email** en el proyecto. Con la confirmación activa, registrarse con contraseña *también* espera un mail, y volvemos al mismo punto muerto.

**El costo de apagarla, dicho de frente:** cualquiera puede registrarse con un mail que no es suyo. Se acepta porque en esta aplicación nadie ve datos de otro (RLS), no se manda ningún correo a terceros, y lo peor que puede pasar es que alguien ocupe una dirección ajena para guardar sus propias combinaciones. **Si algún día se guarda algo sensible o se manda mail a terceros, esta decisión se revisa antes que ninguna otra.**

**Lo que se descartó:** enchufar SMTP propio (Resend) ahora mismo. Es la solución correcta a largo plazo y resuelve confirmación y recupero de una, pero suma una cuenta y una clave más a configurar antes de que la feature funcione una sola vez. Queda anotado como deuda.

---

## ADR-003 · Magic link sin contraseñas — 2026-08-15 · **Reemplazada por ADR-008**

**Decisión original:** acceso solo por link al mail, sin contraseñas.

**Por qué parecía buena:** menos superficie de ataque, sin recupero que implementar, sin contraseñas que filtrar.

**Por qué no sobrevivió al contacto con la realidad:** el razonamiento era correcto sobre seguridad y equivocado sobre entrega. Optimizamos el riesgo de las contraseñas e ignoramos que el mail es infraestructura de terceros que puede simplemente no llegar — y que sin plan B, eso deja a la persona afuera. Queda registrada porque el error de razonamiento vale más que la decisión.

---

## ADR-011 · El tema tiene una sola fuente de verdad — 2026-08-15 · Vigente

**El bug reportado:** elegir un tema en la app no seguía a la guía, el demo ni el tablero — quedaban en oscuro o claro.

**Causa raíz — dos fuentes de verdad:** la app guardaba el tema dentro de `sdd-prefs` y lo aplicaba directo al DOM, pero las páginas de contenido leían la clave vieja `sdd-theme` al cargar. Cada mitad funcionaba; juntas mentían. Es el mismo patrón que ADR-004 previene con los datos generados: dos lugares que dicen lo mismo terminan diciendo cosas distintas.

**Decisión:** `sdd-theme` es la única fuente. La app la escribe cada vez que aplica preferencias, y todas las páginas la leen al cargar. `sdd-prefs.tema` queda como copia de trabajo del panel, nunca como origen.

**Corolario que salió de acá:** los recursos propios (`.js`/`.css`) llevan versión en la URL (`?v=18`). Sin build no hay fingerprinting, y un navegador con un `tema.js` viejo en caché reproduce exactamente este bug aunque el código esté arreglado — pasó durante la verificación.

---

## ADR-010 · Qué limita no tener cuenta — 2026-08-15 · Vigente

**Pedido:** que quien no inicia sesión pueda usar la app, pero limitada.

**La tensión:** C4 de la spec decía que el login *suma, no habilita*. Poner límites lo contradice, así que se revisa el constraint en vez de romperlo en silencio.

**Decisión — el límite es de persistencia, no de funcionalidad.** Sin cuenta funcionan completos el catálogo, las descargas, el paquete `.zip`, el combinador, las tecnologías, las reglas, la guía y el demo. Lo único limitado: **hasta 3 combinaciones guardadas, y solo en ese navegador.**

**Por qué ahí y no en otro lado:** trabar el catálogo o el ZIP sería trabar *el producto* — lo que la gente vino a buscar, y lo que hace que el SDD se difunda. En cambio la persistencia es lo único que de verdad **requiere** una cuenta: sin servidor donde poner los datos, guardar más es prometer algo que no podemos cumplir. El tope no castiga: describe la realidad de `localStorage`.

**Lo que se descartó:** limitar los temas, o esconder secciones detrás del login. Son palancas que molestan sin dar nada a cambio, y contradicen el espíritu de un paquete que se regala.

---

## ADR-009 · El `[hidden]` se refuerza globalmente — 2026-08-15 · Vigente

**Contexto — un bug reportado por el owner:** en toda la página aparecía un cartel verde vacío, con solo una ✕.

**Causa raíz:** el atributo `hidden` del navegador es `display:none` con especificidad (0,1,0) — **la misma** que cualquier clase nuestra. Como nuestra hoja se carga después, una regla tan inocente como `.aviso{display:flex}` gana y el elemento se muestra igual, vacío. Le pasaba también a `#authtabs`.

**Decisión:** `[hidden]{display:none!important}` en `base.css`, una sola vez, con el comentario de por qué no se puede borrar.

**Por qué global y no puntual:** parchear `.aviso[hidden]` arreglaba un caso y dejaba viva la trampa para el siguiente. Es la misma familia que ADR-007: reglas del user-agent que un reset o una clase pisan sin que nadie lo note.

---

## ADR-007 · El `<dialog>` va con `margin:auto` explícito — 2026-08-15 · Vigente

**Contexto — un bug real.** El diálogo de tecnologías aparecía pegado arriba a la izquierda en vez de centrado.

**Causa raíz:** un `<dialog>` modal se centra porque el user-agent le da `margin:auto` junto con `inset:0`. El reset `*{box-sizing:border-box;margin:0;padding:0}` de la hoja pisa ese margin. Con `inset:0` y `margin:0`, el elemento se estira contra la esquina superior izquierda.

**Decisión:** `margin:auto` explícito en la regla del diálogo, y comentario en el CSS explicando por qué está ahí — sin eso, el próximo que "limpie" esa línea reintroduce el bug.

**Por qué queda como ADR:** el síntoma (una ventana descentrada) no sugiere en nada la causa (un reset de tres palabras escrito 400 líneas más arriba). Es exactamente el tipo de cosa que se vuelve a debuggear desde cero en seis meses.

---

## ADR-012 · Entorno local sin nube: Postgres propio y un emulador chico de Supabase — 2026-10-05 · Vigente

**Contexto:** el proyecto Supabase está pausado y el plan gratis no deja reactivarlo (ver `status.md`). Desde 0.26 el portón exige sesión, así que sin backend no se puede probar nada que pase por login. El owner decidió dejar Supabase inactivo, trabajar todo en local por ahora y dejar Vercel para cuando la web se abra a otros programadores.

**Decisión:** `dev/` levanta un entorno completo en la máquina, con un solo comando (`node dev/dev.mjs`):
- **Un clúster de Postgres propio**, con los binarios que ya estén en el PATH, en `dev/.data/` y en el puerto 54329, escuchando solo en `127.0.0.1`. No se usa el Postgres que ya pueda estar corriendo en el 5432: `anon` y `authenticated` son roles del clúster entero y no tienen por qué ensuciar otras bases.
- **Las mismas políticas que en la nube.** Se corren `supabase/schema.sql` y `supabase/metricas.sql` sin tocarlos, sobre un `auth` mínimo (`auth.users`, `auth.uid()`, roles y permisos como los deja Supabase). Cada pedido corre en una transacción con `set local role` y los claims del JWT, así que **RLS la aplica Postgres de verdad**, no el emulador.
- **Un servidor Node** que sirve el repo como Vercel (redirect `/` → `/web/` y los mismos headers) y responde el subconjunto de GoTrue y PostgREST que usa `sesion.js`. Reemplaza `web/supabase-config.js` al servirlo, así que **la web no cambia ni una línea** para correr en local.

**Por qué no la CLI de Supabase:** necesita Docker, que no está instalado y en Windows es pesado (WSL2, varios GB). El emulador cubre los nueve pedidos que hace la web, y lo que importa probar, RLS, lo resuelve Postgres igual que en la nube.

**R28, sin dependencias nuevas:** el servidor no usa `node_modules` (ADR-001). Habla con la base a través de `psql`, que viene con los mismos binarios, y pasa los valores en base64 por stdin. Así ningún dato del usuario entra al SQL como texto, y las tildes no dependen de la página de códigos de la consola de Windows. Cuesta un proceso por pedido, unos 50 ms, que en local no importa.

**Lo que no cubre:** mails (recupero de contraseña y magic link, que responden con un aviso), registro público (cerrado igual que en la nube desde 0.26) y lo que PostgREST tiene y la web no usa. Si la web empieza a usar algo nuevo de Supabase, el emulador lo tiene que aprender en el mismo cambio, y el test de `dev/tests/` lo va a marcar en rojo si no.

---

## ADR-013 · Los outcomes se miden con los contadores propios, y O4 con una clase gruesa de dispositivo — 2026-10-05 · Vigente

**Contexto:** D3 venció el 2026-09-30. La spec decía «se miden con lo que da Vercel», pero Vercel Analytics es un servicio de terceros y el sitio está en local (ADR-012). Ya existía `eventos` (`metricas.sql`): contadores sin usuario, IP, user-agent ni cookie, con fecha por día. Alcanzaba para O1 y O2. O4 («entra desde el celular») no: ningún evento decía de qué dispositivo venía la visita.

**Decisión:**
- **O1, O2 y O4 se calculan sobre `eventos`**, en una vista `metricas_30_dias` (misma RLS: solo el admin lee), y el panel los muestra contra la meta. La lógica es pura (`web/metricas.js`) y tiene tests. Sin datos dice «sin datos», no 0%.
- **O2:** «visitas» son cargas de la página (detalle que empieza con `/`), no cada cambio de vista ni cada vista previa: si no, el denominador crece con la navegación y el outcome se hunde solo.
- **O4:** de las llegadas al combinador, la parte que vino de un celular. Para eso la visita lleva `|movil` o `|escritorio` pegado al detalle. **La clase la calcula el navegador con `matchMedia("(pointer: coarse)")`; el user-agent no se lee nunca.** Dos valores posibles no distinguen a nadie; un user-agent, con poco tráfico, casi sí. Una tablet cuenta como celular, y está bien: lo que mide O4 es si la página anda con el dedo.
- **O3 queda manual.** No hay contador que diga si alguien entendió. El panel explica el procedimiento y deja anotarlo (en ese navegador), pero el registro que vale es una línea en `status.md`.

- **Lo que hace cumplir la base, y lo que no** (revisado tras la review R30 de 0.33, M4). La primera versión decía «la base rechaza cualquier otra cosa después de la barra», y era cierto solo para eso: con la clave pública se podía guardar `juan.perez@gmail.com DNI 30123456` como visita sin barra, o una visita con `dia = 2099` que la vista contaba para siempre. Hoy:
  - **`eventos_detalle_formato_check`**: el `detalle` tiene un formato cerrado por tipo. Visita: `/ruta|movil`, `#/vista|escritorio` o `md:archivo.md`; descarga: un nombre de archivo; combinación: `tipo/stack/NOVATO|PRO/nuevo|brownfield`; paquete y perfil: sus ids. Solo `[A-Za-z0-9._/-]`, con largo acotado (30 a 80): **no entran espacios, `@`, saltos de línea ni texto libre**. Lo que no garantiza: un slug corto podría ser un nombre (`juanperez`). Para eso no hay check posible, y con 30 letras sin espacios el abuso es caro y poco útil.
  - **El día y el id los pone la base** (el id desde 0.33.2, R1 de la segunda vuelta): `anon` y `authenticated` solo tienen `INSERT (tipo, detalle)`. Antes, con el INSERT sobre todas las columnas que Supabase da por defecto, un anónimo podía ocupar ids por delante de la secuencia y el contador legítimo que caía ahí daba 409 y se perdía en silencio. La política de alta (`dia = hoy`) queda como segunda capa, y la vista de 30 días además acota `dia <= hoy`.
  - **`NOT VALID`**: las filas viejas no se revisan (las visitas de antes de 0.33 quedan, sin clase); todo INSERT nuevo sí.
  - Lo controla `dev/tests/local.test.mjs` con la sonda del reviewer: cada caso que daba `201` ahora es `4xx`, y lo que manda la web sigue entrando. Desde 0.33.2 hay además un barrido de **todo** lo que la web puede generar (tipos × stacks × niveles, paquetes, vistas, archivos, onboarding): si un tipo o una vista nueva no encaja en el formato, el test lo nombra.

**Descartado:** un evento aparte de tipo `dispositivo` (duplicaba cada visita y no se podía cruzar con el lugar sin guardar algo que las vincule), y el ancho de pantalla en píxeles (es más identificante y no dice si hay dedo o mouse).

**Lo que cuesta:** las visitas anteriores a 0.33 no tienen clase y no cuentan para O4. En la nube hay que volver a correr `metricas.sql` (crea el check, la política nueva y la vista) cuando se reactive; hasta entonces el panel lo avisa en vez de romperse.

---

## ADR-014 · Sin portón: la app abre sin cuenta y entrar es opcional, en `/web/login` — 2026-10-05 · Vigente · **Reemplaza la decisión de 0.26 (sitio privado con `porton.js`)**

**Contexto — un bug real.** Al entrar, el owner veía el onboarding («¿Tenés experiencia programando?…») **encima** del login y no podía tocar ninguno de los dos. El portón (`porton.js`) era una tapa opaca con `z-index: 99999` que ponía `inert` a todo el `body`; el onboarding era un `<dialog>` modal, que vive en el top layer, por encima de cualquier `z-index`. Los dos se abrían solos al cargar `index.html` y ninguno sabía del otro: el diálogo tapaba el formulario de entrar, y el diálogo estaba `inert`. Reproducido en Chrome con clics reales (`Input.dispatchMouseEvent`): ni la opción del onboarding ni el campo de mail responden.

**Decisión del owner:** el login deja de ser obligatorio.
- **Sin portón.** `porton.js` se borra y sale de todas las páginas (app, admin, guía, demo y tablero). La app abre directo, sin cuenta, como decía C4 antes de 0.26.
- **Entrar vive en `/web/login`**, una vista de la app con su URL, para quien quiera guardar combinaciones sin tope o entrar al panel. Al terminar vuelve a `?volver=`, solo a rutas internas (V13). Es la lección de 0.32 (`/%2Fweb` redirigía a `//web/`): un `volver` sin validar es una redirección abierta.
- **El onboarding es una página** (`/web/preferencias`), no un diálogo modal. No compite con nada por el top layer.
- **El código de cuentas queda** (`sesion.js`, Supabase o el emulador local): se usa cuando la web salga de local.

**ADR-010 sigue vigente y vuelve a ser cierto sin asterisco:** el límite sin cuenta es de persistencia (3 combinaciones en ese navegador), no de acceso.

**Lo que se pierde:** la web publicada ya no esconde la interfaz a quien llega de pasada. Nunca escondió los archivos (el portón lo decía: «esto esconde la INTERFAZ, no los archivos»), así que la protección real no cambia. Si hiciera falta privacidad de verdad, va un servidor delante, no una tapa.

---

## ADR-015 · Rutas reales con la History API, resueltas por el servidor — 2026-10-05 · Vigente · **Reemplaza el ruteo por hash** (comentario de `app.js` desde 0.19)

**Contexto:** la app ruteaba por hash (`#/catalogo`) porque «sin servidor que las resuelva, `/web/catalogo` daría 404 al recargar». Desde 0.32 hay servidor propio (ADR-012), y Vercel resuelve rewrites. El hash además se llevó puesto un bug: `writeURL` del catálogo borraba el `#/combinador?c=…` de los links compartidos (0.33).

**Decisión:**
- Una ruta por vista bajo `/web/` (`contracts.md` §7). `pushState` al navegar, `popstate` al ir atrás/adelante; se recargan y se comparten.
- **El servidor resuelve:** `/web/<nombre>` sin extensión sirve `web/<nombre>.html` solo para las páginas de una lista explícita (`admin`, `guia`, `demo`: `PAGINAS` en `dev/servidor.mjs`, la misma que los rewrites de `vercel.json`, y un test las compara), y si no `web/index.html`; con barra final, 308 sin barra. En `dev/servidor.mjs` y en `vercel.json` (rewrites), con el mismo patrón cerrado (`[a-z][a-z0-9-]*`, una sola parte), así que no se abre nada nuevo: ni otro archivo, ni path traversal.
- **Compatibilidad:** `rutas.js` convierte `#/x?…` en `/web/x?…` al cargar. Las páginas aparte (guía, demo, tablero) linkean a las rutas nuevas.
- **Métricas sin migración:** el detalle de cambio de vista se queda en `#/<vista>|clase`, como etiqueta. No cambia el check de `eventos`, ni los outcomes, ni el barrido del test.

**Lo que cuesta:** abrir `web/index.html` como archivo (`file://`) ya no navega entre vistas por URL: hace falta `node dev/dev.mjs` o Vercel. Desde ADR-012 es como se trabaja, así que se acepta.

---

## ADR-016 · Activar la v2 de `blocks.md`: función serverless con Claude fusiona los bloques en un `sdd/` a medida — 2026-10-09 · Vigente · **Revierte parcialmente ADR-012**

**Contexto.** `spec.md` §3 excluía explícito "generar el `sdd/` desde la web" por lo que dice `costs.md`: un endpoint que llama a una API paga es una factura sin techo si alguien la abusa, y es la misma clase de falla que rompió el tope de gasto siete veces en otros proyectos hechos con el paquete (S33, `examples/hallazgos-2026-10.md#H18`). ADR-012 además había dejado Vercel y Supabase inactivos "hasta que la web se abra a otros programadores". Esa condición se cumple ahora: el owner suma a Ignacio y Hernán al equipo, con clientes propios.

**Decisión del owner:**
- Se reactivan Vercel y la parte de infraestructura que esta feature necesita (Supabase sigue como está, para cuentas). Se agrega una función serverless nueva, no se toca el flujo v1 (sigue andando sin backend ni key para quien no la use).
- La función llama a **Claude por la API oficial** (ya catalogada en `tecnologias.md`, con sus trampas documentadas) para fusionar los bloques elegidos en un `sdd/` más específico que la concatenación plana de v1. Sigue bajando como `.zip`: la función nunca ejecuta nada, y el agente del usuario sigue siendo quien aplica el resultado.
- **Alcance de esta primera versión:** solo la fusión a medida. La promoción automática de combinaciones nuevas al catálogo oficial (la idea original de `blocks.md` §7) queda fuera — es una decisión con más riesgo (meter basura al catálogo sin revisión humana) para otra vez.
- **La clave es una sola**, del owner, puesta en el entorno de la función serverless — nunca en `web/` ni en el front. El tope de gasto es compartido entre todo el tráfico de la web (equipo + clientes), no por persona.
- Antes de escribir código: tope de gasto como **reserva** (el patrón de `playbooks/ia-en-el-producto.md`, nunca "chequear y después llamar"), **rate limit por IP** en el endpoint, y una **alerta** — los tres ya estaban anotados en `costs.md` como condición de entrada.

**Lo que cuesta:** la web deja de ser 100% estática para quien usa la fusión con IA (v1 sin IA se mantiene estática). Sumar una persona nueva al equipo (Ignacio, Hernán) ahora implica coordinarse sobre una sola clave y un solo tope de gasto compartido, no claves propias por persona.

---

## ADR-017 · La reserva de gasto de ADR-016 es por instancia, no global; el techo duro es el límite de la consola de Anthropic — 2026-10-09 · Vigente · **Ajusta ADR-016**

**Contexto — DRIFT encontrado en la review de la tarjeta `IA-1` (R25).** La reserva bajo lock que describe ADR-016 usa `SharedArrayBuffer`+`Atomics`, que solo sincroniza **dentro de una misma instancia** de la función serverless. Vercel corre N instancias en paralelo, cada una con su propio contador en `$0` y reseteado en cada arranque en frío: el tope real queda acotado por `tope × instancias_concurrentes × reciclajes_del_día`, no por el tope declarado — no es un tope global compartido entre todo el tráfico, como decía ADR-016.

**Decisión del owner (opción B de las tres que planteó el review):**
- No se suma una dependencia nueva (store compartido tipo Redis/KV, ni Postgres — que `design.md` §10 ya había descartado para esto) solo para que el tope sea global de verdad.
- Se acepta la reserva en memoria por lo que es — un freno de abuso **por instancia tibia**, documentado así en el código y en `design.md` §10 — y el **techo real y duro** pasa a ser el límite de gasto configurable en la consola de Anthropic (workspace o API key).
- **Antes de producción:** configurar ese límite en la consola (verificado contra la doc vigente del proveedor, R19 — no se asume de memoria que existe con ese nombre o alcance) y anotar acá el valor elegido.

**Por qué no la opción A (store compartido):** una dependencia paga más para mantener, con su propio ADR (R28) y su propia superficie de fallas, por una garantía que el límite del proveedor ya cubre igual de bien como último recorte de daño.

**Lo que cuesta:** sin el límite de la consola configurado, el tope de la aplicación no protege contra un abuso distribuido entre muchas instancias — es una ventana de riesgo real hasta que ese límite esté puesto, no solo una formalidad.

