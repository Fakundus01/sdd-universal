# spec.md · SDD Hub (la web del catálogo)

**Versión:** 0.8 · **Última actualización:** 2026-08-15 · **Estado:** vigente

## 1 · Problema

El paquete SDD Universal son 20 archivos Markdown en un repo. Para quien ya sabe qué busca, alcanza. Para todos los demás hay tres barreras concretas:

1. **No se sabe qué descargar.** Ver 20 `.md` sin saber que solo uno es obligatorio hace que la gente descargue todo, o nada.
2. **No se sabe qué hace.** "Spec-Driven Development" no significa nada hasta que lo ves funcionando.
3. **Escribir el prompt de arranque a mano es fricción**, sobre todo para alguien sin experiencia en código, que es justo el público que más lo necesita (R23).

## 2 · Outcomes (medibles)

| # | Outcome | Cómo se mide | Meta |
|---|---|---|---|
| O1 | La gente descarga el archivo correcto | Descargas de `SDD-MASTER.md` sobre el total | > 60% |
| O2 | El prompt sale de la web y no a mano | Clics en "Generar" sobre visitas | > 25% |
| O3 | Se entiende sin leer nada | Alguien ajeno al proyecto explica qué es después de 2 min en la página | Sí / No, con 3 personas |
| O4 | Entra desde el celular | Visitas móviles que llegan al combinador | > 30% |

## 3 · Qué NO entra

- **Generar el `sdd/` desde la web.** La web arma el prompt; el `sdd/` lo genera el agente del usuario. Meter un modelo en el medio nos obliga a tener API keys, costos por uso y moderación — es la v2 que describe `blocks.md`, y no es este proyecto.
- **Ejecutar código del usuario.** No somos un playground.
- **Analytics de terceros.** Los outcomes se miden con lo que da Vercel, sin píxeles ni cookies de tracking.
- **Un CMS.** El catálogo se edita commiteando. Son 24 cards, no 24.000.
- **Traducción al inglés.** Decisión pendiente, no descartada — ver `status.md`.

## 4 · Constraints y supuestos

- **C1** · **Sin build.** HTML, CSS y JS que se abren y andan. Un paquete que predica simplicidad no puede necesitar `npm install` para mostrar su propia web.
- **C2** · **Sin dependencias de terceros en el front.** Ni CDN, ni frameworks, ni librerías. Todo lo que se carga sale de este repo.
- **C3** · **USD 0/mes** (R14). Ver `costs.md`.
- **C4** · **Tiene que funcionar sin cuenta** — revisado el 2026-08-15 (ADR-010). El login suma, no habilita: catálogo, descargas, paquete `.zip`, combinador, tecnologías y reglas funcionan completos sin registrarse. **Lo único que la cuenta habilita es persistencia:** sin ella se guardan hasta 3 combinaciones y solo en ese navegador.
- **S1** · *Supuesto:* la gente llega desde GitHub o desde un link compartido, no desde buscadores. Por eso importan las metaetiquetas OG más que el SEO.

## 5 · Decisiones ya tomadas

- HTML estático sin build, deployado en Vercel — ADR-001
- Tema **oscuro por default**, claro opt-in — ADR-005
- Supabase para cuentas, con degradación a `localStorage` — ADR-006
- Los datos (tecnologías, reglas) se **generan** desde las fuentes, no se transcriben — ADR-004

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
