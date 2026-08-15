# testing.md · SDD Hub

**Versión:** 0.8 · R07, variante front: verificación en el navegador del agente. **No hay tests automatizados todavía** — está anotado como deuda D2 en `status.md`, con fecha de revisión.

## Por qué todavía no hay suite

Sin build (ADR-001) montar Vitest o Playwright significa traer `node_modules` a un proyecto que hoy no tiene ninguno. Con 8 features y un solo mantenedor, la verificación en navegador cubre lo mismo más rápido. **Lo que cambia esa cuenta:** la primera regresión que llegue a producción. Ahí el costo de no tener tests deja de ser teórico, y por eso D2 tiene fecha.

Mientras tanto la disciplina es: **todo cambio se verifica leyendo el DOM, no mirando la pantalla.** "Se ve bien" no es una verificación; `document.querySelectorAll('.c').length === 12` sí.

## Verificación de los criterios de la spec

| CV | Cómo se verifica | Estado |
|---|---|---|
| V1 · el prompt incluye todo y lista los archivos | Generar con tipo, stack, nivel, playbooks y 3 tecnologías; leer el textarea y `#filelist` | ✅ |
| V2 · sin Supabase la página funciona entera | `Sesion.activo() === false` y `#authbtn.hidden === true`; guardar y recuperar una combinación | ✅ |
| V3 · al entrar, lo local se sube | `migrarLocales()` con combinaciones en `localStorage` | ⏳ necesita proyecto Supabase real |
| V4 · sin scroll horizontal a 375 y 768 | `document.documentElement.scrollWidth <= innerWidth` y ningún elemento con `right > innerWidth` | ✅ |
| V5 · arranca en oscuro | `document.documentElement.dataset.theme === "dark"` con el sistema en claro | ✅ |
| V6 · las fijas no se pueden apagar | `document.querySelector('[data-regla="R08"]').disabled === true` | ✅ |
| V7 · los demos muestran diferencia observable | Los tres casos borde, en los dos iframes (abajo) | ✅ |

## El test que más vale: los tres casos del demo

Se corre sobre `demo.html` leyendo el DOM de los dos iframes:

| Caso | Sin SDD | Con SDD |
|---|---|---|
| Días cerrados | 0 días deshabilitados sobre 14 | 4 deshabilitados (domingos y lunes) |
| Color (90 min) al final del día | último slot 18:30 → termina 20:00, cerrado | último slot 17:30 → termina 19:00 justo |
| Doble reserva del mismo horario | "¡Listo!" y **dos clientas a la misma hora** en la agenda | "Ese horario se acaba de ocupar", no se crea nada |

Es el test que mejor protege el proyecto: si alguien "mejora" el demo sin SDD y lo hace correcto, la comparación entera pierde sentido y nadie se daría cuenta mirando la página.

## Verificación manual antes de cada deploy

1. Las tres páginas cargan sin errores en consola.
2. Ningún link interno da 404 (se recorren todos los `href` con `fetch`).
3. El toggle de tema va y vuelve, y sobrevive a recargar.
4. Los tres diálogos abren centrados, cierran con Escape y con clic afuera.
5. A 375 px: sin scroll horizontal en las tres páginas.

## Lo que a propósito no se testea

Que el navegador centre un `<dialog>`, que `fetch` traiga un archivo o que Supabase respete RLS. Lo primero es del navegador, lo último **se verifica una vez de verdad** — con dos cuentas distintas, según el playbook — y después se confía en las políticas.
