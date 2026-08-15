# status.md · SDD Hub

**Versión:** 0.8 · **Última actualización:** 2026-08-15 · Estados: Specified 20% → Planned 40% → Tasked 60% → In Progress 80% → Complete 100%

## Features

| ID | Feature | Estado | % | Nota |
|---|---|---|---|---|
| F1 | Catálogo con filtros, búsqueda y paginación | Complete | 100% | Filtros en la URL, compartibles |
| F2 | Combinador de prompt de arranque | Complete | 100% | Lista además los archivos exactos a descargar |
| F3 | Catálogo de tecnologías con selección múltiple | Complete | 100% | 101 items, popup arrastrable |
| F4 | Configurador de reglas → `custom.md` | Complete | 100% | Las fijas con candado (ADR-006) |
| F5 | Cuentas y combinaciones guardadas | In Progress | 80% | Código completo y probado contra localStorage. Falta la prueba end-to-end contra un proyecto Supabase real |
| F6 | Guía navegable | Complete | 100% | Índice lateral con seguimiento de sección |
| F7 | Demo comparativo con/sin SDD | Complete | 100% | Los tres casos borde verificados en los dos widgets |
| F8 | Deploy en Vercel | Complete | 100% | Live, con headers y redirect verificados en producción |

**Avance total: 7.8 / 8 features ≈ 98%**

## Bloqueos

**F5 depende de algo que no está en el repo:** el proyecto de Supabase lo tiene que crear el owner (implica cuenta y credenciales, que un agente no puede manejar). El código está escrito y probado en su rama de degradación; la ruta con cuenta real no se ejecutó nunca todavía. Hasta que eso pase, F5 no puede pasar de 80% por más que "parezca" terminada — que es exactamente el tipo de optimismo que R16 existe para frenar.

## Deuda técnica aceptada

| ID | Deuda | Aceptada | Revisar el | Qué la dispara |
|---|---|---|---|---|
| D1 | `index.html` pasa las 300 líneas de JS que pide R05 | 2026-08-15 | 2026-09-15 | Si entra una feature más al combinador, se parte en `catalogo.js` + `combinador.js` |
| D2 | Sin tests automatizados: todo se verifica en navegador | 2026-08-15 | 2026-10-01 | La primera regresión que llegue a producción. Ahí deja de ser barato |
| D3 | Los outcomes O1–O4 de la spec no se están midiendo | 2026-08-15 | 2026-09-30 | Sin analytics no hay dato. Decidir si se suma algo que respete la spec (sin píxeles de terceros) o si se bajan los outcomes a algo observable |
| D4 | Traducción al inglés sin decidir | 2026-08-15 | 2026-10-15 | Es el mayor multiplicador de alcance y el mayor costo de mantenimiento. Va a ADR cuando se decida, no antes |
| D5 | `web/og.png` se generó con un script que no quedó en el repo | 2026-08-15 | 2026-09-15 | El día que haya que cambiar el texto de la imagen. Contradice ADR-004 en chiquito |

## Próximo ciclo

Cerrar F5 con un proyecto Supabase real y la prueba que importa: dos cuentas distintas, y confirmar que la segunda no ve los datos de la primera. Si RLS está mal, el resto no importa.
