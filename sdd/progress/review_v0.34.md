# Review v0.34.1 @ b4af348

Veredicto: APPROVED

Reviewer independiente (R30), base `aa41371`. El reporte completo está en el scratchpad de la sesión: `reve-review-sdd-v0341.md`.

**Suites:** web 49/49, dev 17/17.

**Los cuatro nits de la v0.34 quedaron resueltos.** Lo verifiqué en Chrome a 360, con un perfil limpio.
- **`canonizar`:** `/web/inicio`, `/web/index.html`, `/web/inicio?x=1#a` y `/web/index.html#seccion` quedan en `/web/…`, sin pasos extra en el historial. «Atrás» vuelve a `/web/`.
- **Variantes de login:** `/web/login/`, `/web/LOGIN`, `/web/Login/`, `/web/login//`, `/web/login?x=1` y `/web/login/#a` llevan a `/web/`. Las 60 variantes del fuzz siguen sin escapar del origen ni de `/web/`.
- **`PAGINAS`:** `/web/admin`, `/web/guia` y `/web/demo` sirven su página. `/web/demo-con-sdd`, `/web/demo-sin-sdd` y `/web/index` caen en la app, igual que en `vercel.json`. Los 404 de traversal, mayúsculas y barras dobles se mantienen.
- **«Prefiero no decir»:** aparece en los pasos 1 a 4. En el 4 termina y guarda `onboarding: true`.

**`canonizar` no rompe el link compartido ni la migración:**
- `/web/combinador?c=…`, `/web/#/combinador?c=…` y `/web/inicio#/combinador?c=…` terminan todos en `/web/combinador?c=…` con la combinación cargada (`migrar` corre antes que `canonizar`).
- `/web/index.html#/catalogo` → `/web/catalogo`.
- `/web/?cat=Base#/catalogo` → `/web/catalogo?cat=Base`.

Sin hallazgos nuevos.

---

# Review v0.34 @ aa45525

Veredicto: APPROVED

Reviewer independiente (R30), base `fbdf462`. El cambio saca el portón, deja el login como opcional en `/web/login`, pasa el onboarding a `/web/preferencias` y usa rutas reales. El reporte completo está en el scratchpad de la sesión: `reve-review-sdd-v034.md`.

## Evidencia

```
$ node --test web/tests/*.test.mjs     → ℹ tests 45 · ℹ pass 45 · ℹ fail 0
$ node --test dev/tests/local.test.mjs  → ℹ tests 16 · ℹ pass 16 · ℹ fail 0
$ python -m unittest discover -s harness/tests → OK (skipped=1)
```

- **`volverSeguro`:** probé 60 variantes: barras dobles, barras invertidas, `%2e`, `%252e`, `%2f`, `%5c`, `\t`, `\r\n`, `\0`, U+2028, U+3000, barras de ancho completo, `javascript:`, `data:`, `@` y los loops a `/web/login`. Además probé las decodificaciones de `URLSearchParams`. No hay redirección abierta: ningún resultado sale del origen ni de `/web/`.
- **Rewrite de dev:**
  - Mayúsculas, barras dobles, `%2e%2e/%2f/%5c`, `%00`, `%0a`, `.env`, `.git`, `dev/.data` y el alias 8.3 dan 404.
  - Los `..` que sí se resuelven no salen del repo.
  - Una barra final da 308 con un `Location` armado con lo validado.
  - Un path de 70 KB corta la conexión.
  - `vercel.json` es JSON válido y equivalente a dev, salvo un Nit.
- **Sin portón** (como anónimo):
  - Combinaciones, perfiles, eventos y las tres vistas de métricas dan `[]`.
  - Un POST a una combinación ajena da 401 y el registro da 422.
  - En `/web/admin` sale «Necesitás entrar» y el botón lleva a `/web/login?volver=%2Fweb%2Fadmin`. Al entrar se vuelve a `/web/admin` con O1–O4.
- **Navegación** (Chrome a 360 y 1280, perfil limpio):
  - Atrás y adelante andan, y un clic repetido no suma entradas al historial.
  - Recargar cualquiera de las 10 vistas abre la vista correcta, sin diálogos.
  - El link `?c=` carga, también en una primera visita.
  - Los links viejos con `#/` se migran con `replaceState`.
  - No hay 404 de recursos y el tema se mantiene en todas las rutas.
- **Onboarding:** en la primera visita lleva a `/web/preferencias`, se puede clickear y «Saltar todo» lo cierra y guarda. Atrás no lo vuelve a abrir. El bug original (el onboarding y el portón tapándose entre sí) ya no se reproduce.
- **Sin regresiones** en el combinador (prompt con IA y playbooks del ZIP), las métricas (los formatos nuevos entran en el check del SQL) y los temas. No hay scroll horizontal.

## Nits

- `volver=/web/login/`, con barra final, pasa el filtro: después de entrar deja una parada de más en la vista de login, no un loop.
- Dev sirve cualquier `web/<x>.html` (`/web/demo-con-sdd`). En `vercel.json` esa ruta cae en la app.
- Falta confirmar en un preview de Vercel que `/WEB/x` también da 404.
- En el onboarding, «Prefiero no decir» se oculta en el paso 4 de 4.
- `/web/inicio` no se normaliza a `/web/`.
