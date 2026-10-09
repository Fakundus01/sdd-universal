# spec.md · SDD Hub (la web del catálogo)

**Versión:** 0.11 · **Última actualización:** 2026-10-09 · **Estado:** vigente

## 1 · Problema

El paquete SDD Universal son 20 archivos Markdown en un repo. Para quien ya sabe qué busca, alcanza. Para todos los demás hay tres barreras concretas:

1. **No se sabe qué descargar.** Ver 20 `.md` sin saber que solo uno es obligatorio hace que la gente descargue todo, o nada.
2. **No se sabe qué hace.** "Spec-Driven Development" no significa nada hasta que lo ves funcionando.
3. **Escribir el prompt de arranque a mano es fricción**, sobre todo para alguien sin experiencia en código, que es justo el público que más lo necesita (R23).

## 2 · Outcomes (medibles)

| # | Outcome | Cómo se mide | Meta |
|---|---|---|---|
| O1 | La gente descarga el archivo correcto | Descargas de `SDD-MASTER.md` sobre el total de descargas | > 60% |
| O2 | El prompt sale de la web y no a mano | Clics en "Generar" sobre cargas de la página | > 25% |
| O3 | Se entiende sin leer nada | Alguien ajeno al proyecto explica qué es después de 2 min en la página | Sí / No, con 3 personas |
| O4 | Entra desde el celular | De las llegadas al combinador, cuántas vienen de un celular | > 30% |
| O5 | La fusión con IA se usa de verdad, no solo se prueba | % de paquetes generados que usaron la fusión con Claude (ADR-016) sobre el total | > 15% |

**Cómo se mide (0.33, ADR-013):** O1, O2 y O4 salen de los contadores anónimos propios (`supabase/metricas.sql`) sobre los **últimos 30 días**, y el panel (`admin.html`) los muestra contra la meta. Para O4, la visita guarda una clase gruesa de dispositivo (`movil` / `escritorio`), nunca el user-agent. **O3 es manual**: no sale de ningún contador; el panel tiene dónde anotarlo, y el resultado que vale se escribe en `status.md`.

## 3 · Qué NO entra

- **Promoción automática de combinaciones al catálogo** (la v2 completa de `blocks.md` §7). La fusión con IA (ADR-016) solo arma un `sdd/` a medida para quien lo pide; que una combinación se vuelva bloque oficial sigue pasando por una persona, igual que cualquier fila nueva de `scenarios.md` (R20).
- **Ejecutar código del usuario.** No somos un playground.
- **Analytics de terceros.** Los outcomes se miden con contadores propios y anónimos (sin usuario, IP, user-agent ni cookies), sin píxeles ni servicios de afuera.
- **Un CMS.** El catálogo se edita commiteando. Son 24 cards, no 24.000.
- **Traducción al inglés.** Decisión pendiente, no descartada — ver `status.md`.

## 4 · Constraints y supuestos

- **C1** · **Sin build.** HTML, CSS y JS que se abren y andan. Un paquete que predica simplicidad no puede necesitar `npm install` para mostrar su propia web.
- **C2** · **Sin dependencias de terceros en el front.** Ni CDN, ni frameworks, ni librerías. Todo lo que se carga sale de este repo.
- **C3** · **USD 0/mes** (R14). Ver `costs.md`.
- **C5** · **Cada vista tiene su URL real** (ADR-015): `/web/catalogo`, `/web/combinador`… se recargan, se comparten y el atrás del navegador funciona. Los links viejos con `#/` siguen andando: redirigen a la ruta nueva.
- **C4** · **Tiene que funcionar sin cuenta** — revisado el 2026-08-15 (ADR-010). El login suma, no habilita: catálogo, descargas, paquete `.zip`, combinador, tecnologías y reglas funcionan completos sin registrarse. **Lo único que la cuenta habilita es persistencia:** sin ella se guardan hasta 3 combinaciones y solo en ese navegador. **Desde 0.34 (ADR-014) no hay portón:** el sitio abre directo, sin cuenta, y entrar es opcional, en su propia ruta (`/web/login`), para quien quiera guardar combinaciones o entrar al panel.
- **S1** · *Supuesto:* la gente llega desde GitHub o desde un link compartido, no desde buscadores. Por eso importan las metaetiquetas OG más que el SEO.
- **C6** · **La función serverless de la fusión con IA nunca expone la clave de la API al front** (ADR-016): vive solo en su propio entorno, nunca en `web/`.

## 5 · Decisiones ya tomadas

- HTML estático sin build, deployado en Vercel — ADR-001
- Tema **oscuro por default**, claro opt-in — ADR-005
- Supabase para cuentas, con degradación a `localStorage` — ADR-006
- Los datos (tecnologías, reglas) se **generan** desde las fuentes, no se transcriben — ADR-004
- Función serverless con Claude fusiona los bloques en un `sdd/` a medida, con tope de gasto como reserva, rate limit por IP y alerta — ADR-016

## 6 · Sub-tareas

| ID | Sub-tarea | Depende de |
|---|---|---|
| T1 | Catálogo con filtros y combinador | — |
| T2 | Catálogo de tecnologías con selección múltiple | T1 |
| T3 | Configurador de reglas → `custom.md` | T1 |
| T4 | Cuentas y combinaciones guardadas | T1 |
| T5 | Guía navegable y demo comparativo | — |

## 7 · Criterios de verificación

- **V1** · El combinador genera un prompt que incluye tipo, stack, nivel, perfil, playbooks y tecnologías elegidas, y lista los archivos exactos a descargar.
- **V2** · Con `supabase-config.js` vacío, la página funciona completa y el botón de sesión no aparece.
- **V3** · Al entrar con cuenta por primera vez, las combinaciones guardadas en el navegador se suben y no se pierde ninguna.
- **V4** · Ninguna página tiene scroll horizontal a 375 px ni a 768 px.
- **V5** · El tema arranca en oscuro aunque el sistema esté en claro.
- **V6** · El configurador de reglas no permite apagar ninguna regla marcada como `fija`.
- **V7** · Los dos demos son operables y demuestran una diferencia observable en los tres casos borde (V1/V2/V3 de `examples/turnos`).
- **V8** · El combinador respeta lo que configuró la persona: con `R01=OFF` (o perfil CONFIANZA) el prompt no promete esperar el OK del commit; con «IA en el producto» trae N4, R12 y el playbook `ia-en-el-producto`; una tecnología que no está en el catálogo llega al prompt marcada, no se pierde, y en una sola línea de 60 caracteres como máximo. El prompt y el ZIP salen siempre del mismo estado: si se cambia algo después de generar, se regeneran juntos. El perfil tiene una sola fuente, así que el prompt y el `custom.md` nunca dicen dos distintos.
- **V10** · Un link `/web/combinador?c=…` (o el viejo `#/combinador?c=…`) abre el combinador con esa combinación cargada y el prompt generado.
- **V11** · Sin cuenta, `/web/` abre la app y se puede usar entera: nada tapa la página ni pide entrar.
- **V12** · Cada vista se recarga en su ruta (200 con la app, en la vista correcta), atrás/adelante recorren las vistas, y un `#/x?…` viejo termina en `/web/x?…`.
- **V13** · `/web/login?volver=…` vuelve solo a rutas internas bajo `/web/`: `//evil.com`, `https:…`, `/\evil`, `javascript:` y `/web/../` caen en `/web/`.
- **V14** · El onboarding vive en `/web/preferencias`, como una página: la primera visita sin onboarding entra ahí, sin bloquear el resto, y «Rehacer» del perfil lleva ahí.
- **V9** · El panel muestra O1, O2 y O4 de los últimos 30 días contra su meta, con «sin datos» cuando no hay eventos, y O3 como manual.
