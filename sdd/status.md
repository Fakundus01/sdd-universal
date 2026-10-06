# status.md · SDD Hub

**Versión:** 0.34 · **Última actualización:** 2026-10-05 · Estados: Specified 20% → Planned 40% → Tasked 60% → In Progress 80% → Complete 100%

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

**Avance total: 24 / 24 features vigentes = 100%** (F19 retirada)

## Bloqueos

**Ninguno para desarrollar.** Desde 0.32 todo corre en local (`dev/`, ADR-012).

**La web publicada sigue inaccesible, por decisión del owner.** El proyecto Supabase `sdd-universal` sigue pausado (`INACTIVE`, visto el 2026-10-05), y la organización ya usa sus 2 proyectos gratis. El 2026-10-05 el owner decidió dejarlo así y trabajar en local; Vercel queda para cuando la web se abra a otros programadores. **Al reactivarlo hay que volver a correr `supabase/schema.sql` y `metricas.sql` allá**: los arreglos de 0.32 (upsert y admin) y lo de 0.33 (columna `ia`, el check de la clase de dispositivo y la vista `metricas_30_dias`) todavía no están en la nube. Después, repetir una vez la prueba de dos cuentas contra el proyecto real.

## Deuda técnica aceptada

El 2026-10-03 todas estaban vencidas. Con el OK del owner («hacé las deudas que se puedan») se cerraron D1 y D5, y D2 se cerró en parte. D3 y D6 necesitaban decisiones o gastos del owner; D3 se cerró el 2026-10-05 (0.33) y D6 sigue abierta, con el dato actualizado.

| ID | Deuda | Aceptada | Revisar el | Qué la dispara | Hoy (2026-10-03) |
|---|---|---|---|---|---|
| ~~D1~~ | ~~`index.html` pasa las 300 líneas de JS que pide R05~~ — **cerrada el 2026-10-03 (0.31)**: las 1123 líneas inline pasaron a seis archivos de 105 a 237 líneas sin la cabecera (ver `design.md` §2) | — | — | — | Smoke en Chrome headless con salida idéntica antes y después, más un rojo forzado con el orden de carga invertido |
| D2 | Tests automatizados **parciales**: el ZIP y la sincronía de reglas tienen suite (0.31, `web/tests/`, en CI); la UI se sigue verificando en navegador | 2026-08-15 | 2026-12-01 | Una regresión de UI que llegue a producción: ahí el smoke por CDP (ver `testing.md`) entra al repo y a CI | Reaceptada en versión reducida: lo que ya se había roto (reglas) y lo invisible (el ZIP) ya están cubiertos |
| ~~D3~~ | ~~Los outcomes O1–O4 de la spec no se están midiendo~~ — **cerrada el 2026-10-05 (0.33, ADR-013)**: el panel calcula O1, O2 y O4 de los últimos 30 días contra la meta con los contadores propios, y O3 queda manual | — | — | — | Falta lo que no se automatiza: hacer O3 con 3 personas y anotarlo acá |
| ~~D4~~ | ~~Traducción al inglés~~ — **cerrada el 2026-08-15**: núcleo (master + compact) en inglés como espejo del canónico. El resto del paquete queda en español a propósito | — | — | El espejo se actualiza con cada release del master | — |
| ~~D5~~ | ~~`web/og.png` se generó con un script que no quedó en el repo~~ — **cerrada el 2026-10-03 (0.31)**: `web/og.py` (Pillow) la regenera con el mismo diseño y toma el número de reglas del master | — | — | — | Decía «26 reglas» desde 0.11; ahora dice 32 |
| D6 | Sin SMTP propio: el recupero de contraseña y la confirmación dependen del mailer del free tier, que manda pocos correos por hora y cae en spam | 2026-08-15 | ~~2026-09-30~~ vencida | **Procedimiento ya escrito** en `playbooks/resend-smtp.md`. Lo que falta es ejecutarlo, y para salir del modo prueba hace falta un dominio propio (~USD 15/año) — ese es el verdadero bloqueo, no el código | Sin cambios. Pesa menos desde 0.26: sin registro público, las cuentas las crea el admin con Auto Confirm |

## Próximo ciclo

1. Ejemplos de punta a punta con el SDD (e-commerce, landing, ticketera con IA, chatbot), cada uno en su repo: lo que falle ahí entra a `scenarios.md` (R20).
2. **Owner:** hacer O3 (3 personas ajenas, 2 minutos cada una) y anotar el resultado acá; decidir D6 (dominio para el SMTP), que pesa todavía menos en local, donde no hay mails.
3. Cuando la web salga a otros: reactivar Supabase, correr los dos `.sql` y repetir la prueba de dos cuentas (ver Bloqueos).
