# status.md · SDD Hub

**Versión:** 0.37.0 · **Última actualización:** 2026-10-19 · Estados: Specified 20% → Planned 40% → Tasked 60% → In Progress 80% → Complete 100%

## Features

| ID | Feature | Estado | % | Nota |
|---|---|---|---|---|
| F1 | Catálogo con filtros, búsqueda y paginación | Complete | 100% | Filtros en la URL, compartibles |
| F2 | Combinador de prompt de arranque | Complete | 100% | Lista además los archivos exactos a descargar. 0.33: el texto sale de `prompt.js` (puro, con tests); stack Python + React/TS; tipo Mesa de ayuda; «IA en el producto» (N4, R12, playbook); respeta `R01=OFF`; LITE con su plantilla. Review R30: prompt y ZIP del mismo estado, perfil con una sola fuente, tecnologías de afuera normalizadas y el link compartido, que no cargaba desde antes de 0.33, anda |
| F3 | Catálogo de tecnologías con selección múltiple | Complete | 100% | 130 items (0.33.2), popup arrastrable. Lo que no está se puede sumar igual y llega al prompt marcado |
| F4 | Configurador de reglas → `custom.md` | Complete | 100% | Las fijas con candado (ADR-006). 32 reglas desde 0.30.1 |
| F5 | Cuentas y combinaciones guardadas | Complete | 100% | 0.32: la prueba de dos cuentas corre en `dev/tests/` con el esquema real, y encontró dos bugs que estaban en la nube (guardar con cuenta fallaba siempre; cualquiera podía hacerse admin). Corregidos en `schema.sql` y `metricas.sql` |
| F6 | Guía navegable | Complete | 100% | Índice lateral con seguimiento de sección |
| F7 | Demo comparativo con/sin SDD | Complete | 100% | Los tres casos borde verificados en los dos widgets |
| F8 | Deploy en Vercel | Complete | 100% | Live, con headers y redirect verificados en producción |
| F9 | Configuración (temas, texto, sonido, secciones, admin) | Complete | 100% | Vista con pestañas; el tema con fuente única (ADR-011) |
| F10 | Barra lateral comprimible con arrastre | Complete | 100% | Comprimida, los accesos pasan a la barra superior |
| F11 | Compartir combinaciones por link | Complete | 100% | `#/combinador?c=…`, restaura todo y genera el prompt |
| F12 | Buscador global (Ctrl+K) | Complete | 100% | Cards + tecnologías + reglas + páginas |
| F13 | PWA instalable | Complete | 100% | SW sin caché a propósito (ver changelog 0.19) |
| F14 | Núcleo en inglés | Complete | 100% | Cierra la deuda D4 |
| F15 | Vista previa de los MD | Complete | 100% | Renderer propio, links internos navegan dentro del preview |
| F16 | Feedback de carga (loaders, descargando, recargando) | Complete | 100% | Un solo módulo; el zip con progreso real |
| F17 | Manuales: playbooks y skills desde la web | Complete | 100% | 0.25 y 0.28: skills del SDD + 11 sueltas, paginadas de a 6 |
| F18 | Descarga rápida por card | Complete | 100% | 0.25: popup con nuevo/existente, nivel, skills y (0.30.1) arnés |
| ~~F19~~ | ~~Sitio privado (portón de sesión)~~ — **retirada en 0.34 (ADR-014)**: el portón tapaba el onboarding y viceversa; la app abre sin cuenta | — | — | Reemplazada por F24 |
| F21 | Entorno local sin nube (ADR-012) | Complete | 100% | 0.32: `node dev/dev.mjs` levanta Postgres propio y un emulador de Supabase; la web corre entera con login. 9 tests + smoke en Chrome |
| F22 | Reporte de outcomes en el panel (D3, ADR-013) | Complete | 100% | 0.33: O1, O2 y O4 de los últimos 30 días contra su meta; O3 manual. Clase de dispositivo gruesa en la visita, nunca el user-agent. Desde la review R30 la base cierra el formato de `detalle` por tipo y pone el día |
| F20 | El ZIP trae la capa de ejecución (R29–R32) | Complete | 100% | 0.31: `harness.md`, `orchestration.md` y `prompts/` siempre; `agents/` con PRO; `harness/` opcional, con el pre-commit en 755. Cubierto por `web/tests/` (en CI) y por un smoke en Chrome headless: checkboxes, árbol, cambio de nivel y popup |

| F23 | Rutas reales por vista (ADR-015) | Complete | 100% | 0.34: `/web/<vista>` con History API; el servidor (dev y Vercel) resuelve; `#/` viejo redirige |
| F24 | Entrar opcional en `/web/login` (ADR-014) | Complete | 100% | 0.34: `volver` solo a rutas internas; admin sin sesión manda acá |
| F25 | Onboarding como página (`/web/preferencias`) | Complete | 100% | 0.34: la primera visita entra ahí sin bloquear; «Rehacer» lleva ahí |

| F26 | R33 y grafo de tarjetas en la web y el arnés (loop `dev-de-10`) | Complete | 100% | 0.35: R33 en el configurador; `verify.py` revisa `depende_de` y ciclos; espejos EN al día; el paquete usa su propio arnés (clave `master`); smoke de la interfaz en CI (D2) |

| F27 | Cerebro entre proyectos y grafo del paquete (loop `obsidian-cerebro`) | In Progress | 80% | 0.36: `cerebro/` (búsqueda híbrida local y OpenAI, MCP, instalador, CI), instalado en la máquina del owner; MD del núcleo enlazados y el ZIP reescribe links. 0.37: grafo de contexto (`graph/_meta/sync_graph.py`, R30-style con hash + `--accept`, en el pre-commit) con 13 nodos — todo el repo enlazado (núcleo, `harness/`, `sdd/`, `skills/`, `imports/`, `agents/`, `prompts/`, `playbooks/`, `web/`, `dev/`, `supabase/`, `cerebro/` y `api/` desde el merge de IA-1). Falta: S42 por síntoma (aparte, no es de este grafo) |
| F28 | Fusión con IA del combinador (v2 de `blocks.md`, ADR-016) | In Progress | 95% | 0.37: [`IA-1`](cards/IA-1.md) (endpoint `/api/fusionar`) y [`IA-2`](cards/IA-2.md) (botón de fusión en el combinador, con degradación a v1) **done y mergeadas a `main`** el 2026-10-16. ADR-018: `api/` vive acá con su dependencia y el arnés sigue verificándose sin instalar nada. La review de IA-2 encontró un bloqueante que no era suyo: los tres `detalle` nuevos (`ia:`, `ia-simulada:`, `ia-fallback:`) violaban el CHECK de `supabase/metricas.sql` y el insert iba a fallar **en silencio** — arreglado, más un test que cruza los valores de la web contra el SQL para que no vuelva a pasar. [`IA-3`](cards/IA-3.md) (tests adversarios del tope de gasto) **done y mergeada a `main`** el 2026-10-19 (`33ab93a`), **APPROVED** en la vuelta 3 por un reviewer independiente (ver [`review_IA-3.md`](progress/ia-fusion/review_IA-3.md)). Tres vueltas, las tres frenadas por la misma clase de agujero y las tres cerradas: la 1 vio que los 56 tests de IA-1 probaban la primitiva `reservar()` y no que el handler la usara **antes** de llamar (el mutante M1b gastaba 5× el tope en verde); la 2 trajo los 5 tests a nivel endpoint, pero su assert central —«gastado final ≤ tope», la medición literal del criterio 2— estaba satisfecho **por construcción**, porque el `usage` del transporte simulado se fabricaba con `MAX_TOKENS_SALIDA`, la misma constante de la cota (el mutante M5b gastaba 1,24× el tope en verde, con un solo pedido); la 3 hizo que el transporte simulado derive el peor caso del **pedido real** (`max_tokens` y bytes de `init.body`), y ahí el assert pasó a medir lo que dice. La lección, ya en el arnés: el mutante del reviewer va al **punto de uso** y a los dos lados de la cuenta —lo que se reserva y lo que se autoriza a gastar—, y un assert que no puede dar rojo es un test skipeado con otra cara. **Falta para cerrar F28**, nada bloqueante y todo anotado por las reviews: (a) **lo más serio** — `tools` / server tool use autoriza gasto **fuera de `max_tokens`**: `estimarCotaUSD` no lo cotiza y `costoRealUSD` no lee `server_tool_use`, así que una búsqueda web del modelo saldría gratis en el registro (mutante M10b, sobrevive 61/61; zona IA-1 + un assert que fije las claves del cuerpo del pedido); (b) un `200` válido **sin `usage`** libera toda la reserva, así que esas respuestas no llenan nunca el tope del día; (c) la tabla de precios de `api/_lib/costo.js` no la fija ningún test (dividir por 10 el precio de salida sobrevive 61/61); (d) dos líneas de endurecimiento en G1: que el gasto no pase de `llamadas × cota` (hoy M14 gasta 47% más de lo reservado sin cruzar el tope) y que los 200 afirmen `fusion:"ia"`, para que el test no se degrade en silencio si el cuerpo del pedido cambia de forma; (e) el límite de gasto de la consola de Anthropic configurado antes de producción (ADR-017: el freno del código es por instancia, no global); (f) la mejora menor `maxlength="4000"` en el textarea `#cdesc` (hoy un texto más largo cae al fallback v1 con un aviso genérico) |

| F29 | Contexto fijo liviano y costo por tarjeta (v0.37) | Tasked | 60% | **Era F28 en la rama del plan; renumerada al mergear** porque F28 ya es «Fusión con IA» en `main` y la referencian ADR-016/017/018 y las tarjetas IA. Tarjetas [P-1](cards/P-1.md) (arranque con el compacto + índice; done: 3 vueltas, APPROVED @ 455e5a5; arranque 36916 → 8952 bytes, `custom.md` aparte con WARN > 2 KB) y [P-2](cards/P-2.md) (tokens/costo/duración por rol en el handback; done, 2 vueltas, APPROVED @ 10a01ec). Sin loop todavía; independientes entre sí |

**Avance total: 25 / 28 features vigentes completas** (F19 retirada; F27, F28 y F29 en curso)

## Bloqueos

**Ninguno para desarrollar.** Desde 0.32 todo corre en local (`dev/`, ADR-012).

**La web publicada sigue inaccesible, por decisión del owner.** El proyecto Supabase `sdd-universal` sigue pausado (`INACTIVE`, visto el 2026-10-05), y la organización ya usa sus 2 proyectos gratis. El 2026-10-05 el owner decidió dejarlo así y trabajar en local; Vercel queda para cuando la web se abra a otros programadores. **Al reactivarlo hay que volver a correr `supabase/schema.sql` y `metricas.sql` allá**: los arreglos de 0.32 (upsert y admin) y lo de 0.33 (columna `ia`, el check de la clase de dispositivo y la vista `metricas_30_dias`) todavía no están en la nube — y desde el 2026-10-16 tampoco los tres prefijos `ia:`/`ia-simulada:`/`ia-fallback:` del CHECK de `detalle` que necesita IA-2: sin eso, cada descarga con fusión IA pierde su métrica sin avisar. Después, repetir una vez la prueba de dos cuentas contra el proyecto real.

## Deuda técnica aceptada

El 2026-10-03 todas estaban vencidas. Con el OK del owner («hacé las deudas que se puedan») se cerraron D1 y D5, y D2 se cerró en parte. D3 y D6 necesitaban decisiones o gastos del owner; D3 se cerró el 2026-10-05 (0.33) y D6 sigue abierta, con el dato actualizado.

| ID | Deuda | Aceptada | Revisar el | Qué la dispara | Hoy (2026-10-03) |
|---|---|---|---|---|---|
| ~~D1~~ | ~~`index.html` pasa las 300 líneas de JS que pide R05~~ — **cerrada el 2026-10-03 (0.31)**: las 1123 líneas inline pasaron a seis archivos de 105 a 237 líneas sin la cabecera (ver `design.md` §2) | — | — | — | Smoke en Chrome headless con salida idéntica antes y después, más un rojo forzado con el orden de carga invertido |
| ~~D2~~ | ~~Tests automatizados parciales: la UI se verificaba a mano en el navegador~~ — **cerrada el 2026-10-06 (0.35, tarjeta L-4)**: el smoke por CDP está en `web/tests/smoke/` y corre en CI | — | — | — | 22 pasos, rojo forzado con una excepción y con un `console.error`, sin dependencias |
| ~~D3~~ | ~~Los outcomes O1–O4 de la spec no se están midiendo~~ — **cerrada el 2026-10-05 (0.33, ADR-013)**: el panel calcula O1, O2 y O4 de los últimos 30 días contra la meta con los contadores propios, y O3 queda manual | — | — | — | Falta lo que no se automatiza: hacer O3 con 3 personas y anotarlo acá |
| ~~D4~~ | ~~Traducción al inglés~~ — **cerrada el 2026-08-15**: núcleo (master + compact) en inglés como espejo del canónico. El resto del paquete queda en español a propósito | — | — | El espejo se actualiza con cada release del master | — |
| ~~D5~~ | ~~`web/og.png` se generó con un script que no quedó en el repo~~ — **cerrada el 2026-10-03 (0.31)**: `web/og.py` (Pillow) la regenera con el mismo diseño y toma el número de reglas del master | — | — | — | Decía «26 reglas» desde 0.11; ahora dice 32 |
| D6 | Sin SMTP propio: el recupero de contraseña y la confirmación dependen del mailer del free tier, que manda pocos correos por hora y cae en spam | 2026-08-15 | ~~2026-09-30~~ vencida | **Procedimiento ya escrito** en `playbooks/resend-smtp.md`. Lo que falta es ejecutarlo, y para salir del modo prueba hace falta un dominio propio (~USD 15/año) — ese es el verdadero bloqueo, no el código | Sin cambios. Pesa menos desde 0.26: sin registro público, las cuentas las crea el admin con Auto Confirm |

## Próximo ciclo

~~0. v0.35 (`loops-grafo`) y 0b. v0.36 (`obsidian-cerebro`)~~ — mergeados a `main` con OK del owner (PR #3, 2026-10-06). Deuda de F27 que quedaba («enlazar `sdd/`, `skills/`, `imports/`») cerrada en 0.37 vía `graph/` (ver F27 arriba); sigue abierto solo S42 (aparte) y `cerebro/tests` en `verify.py --full`.
0c. v0.37, pendientes del paquete (**F29**, venía de la rama `v0.37-plan`, ya mergeada): [P-1](cards/P-1.md) y [P-2](cards/P-2.md) done. Pendientes de la review de P-2: tests para los mutantes R7 (título `## Costo` exacto) y V6 (decide la última sección), falso WARN si un handback cita la plantilla en un bloque de código. Pendientes de la review de P-1: test del mutante V3-f (`custom.md` no define reglas); nota de migración en el changelog (los `custom.md` bajados antes dicen «el agente lee el master primero» y ahora se leen en cada sesión); opcional WARN si `custom.md` nombra el master sin «bajo demanda»; `skill/sdd-universal.skill` obsoleto (v0.3); el ZIP no trae `loops.md`.
1. Ejemplos de punta a punta con el SDD (e-commerce, landing, ticketera con IA, chatbot), cada uno en su repo: lo que falle ahí entra a `scenarios.md` (R20).
2. **Owner:** hacer O3 (3 personas ajenas, 2 minutos cada una) y anotar el resultado acá; decidir D6 (dominio para el SMTP), que pesa todavía menos en local, donde no hay mails.

**O3 — guion para las 3 personas (sin dar contexto antes):**
> «Mirá esta página 2 minutos, sin que te explique nada yo. Después contame con tus palabras qué es esto y para qué sirve.»

Mostrales el combinador (`web/combinador.html` o la portada tal como la ve alguien nuevo). Marcá Sí si la explicación agarra la idea central (sin necesidad de que sea textual), No si no.

**Resultado O3** (completar acá cuando se corra):
| Persona | Sí/No | Qué dijo (opcional) |
|---|---|---|
| 1 | — | — |
| 2 | — | — |
| 3 | — | — |
3. Cuando la web salga a otros: reactivar Supabase, correr los dos `.sql` y repetir la prueba de dos cuentas (ver Bloqueos).
