# examples/ · Cómo se ve un SDD terminado

La pregunta más frecuente de quien lee el paquete por primera vez es *"sí, pero ¿qué me va a generar exactamente?"*. Esta carpeta la contesta mostrando, no explicando.

## `turnos/` — web de turnos para una peluquería

Un proyecto **chico pero real**: front + back + base de datos. Modo **FULL**, perfil **ESTRICTO**, 1 sola persona (por eso `contracts.md`, `features.md` y `changelog.md` van planos, sin sufijo de usuario — ver §5 del master). Va por la versión `0.3.0`, o sea tres ciclos de trabajo cerrados.

**Recorrido sugerido — 5 minutos, en este orden:**

| # | Archivo | Qué mirar |
|---|---|---|
| 1 | [`sdd/spec.md`](turnos/sdd/spec.md) | Los **6 elementos** del contrato de calidad. Fijate sobre todo en "Qué NO entra": la mitad del valor de una spec es lo que deja afuera |
| 2 | [`sdd/status.md`](turnos/sdd/status.md) | El estado real, con porcentajes y una deuda anotada con fecha |
| 3 | [`sdd/decisions.md`](turnos/sdd/decisions.md) | ADRs cortos. **ADR-004 es un caso de R25 (spec-drift) real**: la spec estaba mal, el agente frenó y quedó registrado en vez de "arreglarse" en silencio |
| 4 | [`sdd/changelog.md`](turnos/sdd/changelog.md) | Tres ciclos con semver, archivos tocados e impacto observable |
| 5 | [`sdd/contracts.md`](turnos/sdd/contracts.md) | La documentación viva de la API: no hay otro lugar donde estén las rutas |

Lo demás (`design`, `diagram`, `testing`, `costs`, `security`, `features`, `glossary`) completa el cuadro.

## Lo que conviene notar

- **Son cortos.** Ninguno pasa las 80 líneas. Un `sdd/` que nadie relee es un `sdd/` inútil: si tus MD se están inflando, algo se está haciendo mal.
- **Nada es genérico.** Cada archivo habla de *esta* peluquería, con *estos* números. Un `design.md` que serviría para cualquier proyecto no sirve para ninguno.
- **Se contradicen con el tiempo, y se nota.** `decisions.md` guarda decisiones que después se revisaron. Eso es sano: la spec es un documento vivo, no una lápida.
- **La deuda tiene fecha.** En `status.md` hay una deuda aceptada a propósito. Deuda sin fecha es deuda que nadie va a pagar.

## Lo que este ejemplo NO es

No es una plantilla para copiar y rellenar. Los MD los genera tu agente en el arranque, a partir del cuestionario socrático (R04) y de tu proyecto. Esto es una **referencia de tono, tamaño y profundidad** — para que sepas reconocer cuándo el agente te está entregando algo flojo.

> El código de `turnos/` no está en el repo: el ejemplo es el `sdd/`, no la app.
