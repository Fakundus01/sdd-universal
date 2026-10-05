# Review v0.33.1 @ e7a1e3e

Veredicto: APPROVED

Reviewer independiente (R30), vuelta 2, base `8cfac06`. El reporte completo, con los repros y las salidas, está en el scratchpad de la sesión: `reve-review-sdd-v033-v2.md`.

## Evidencia

```
$ node --test web/tests/*.test.mjs        → ℹ tests 34 · ℹ pass 34 · ℹ fail 0
$ node --test dev/tests/local.test.mjs     → ℹ tests 13 · ℹ pass 13 · ℹ fail 0
$ python -m unittest discover -s harness/tests   (sola, 4 corridas) → Ran 132 tests · OK (skipped=1) ×4
```

- **Mutantes:** de 33, mueren 29. Los 4 que sobreviven son equivalentes o casi:
  - M4: el lookahead que sacó el mutante no cambia el resultado, porque el filtro de modos y el orden de lectura ya lo cubren.
  - W9: la base rechaza una segunda barra de todos modos.
  - W15: la línea quedó redundante, porque el perfil ahora sale del configurador.
  - S11: `eventos_tipo_check` ya rechaza el tipo.
- **Sobrevivientes de la vuelta 1:** murieron M11, M12, M14, M15, W10, W11 y W16. W15 pasó a ser equivalente.
- **Navegador** (a 360 y 1280, con `?v=33.1`):
  - Prompt, lista y ZIP salen del mismo estado.
  - El perfil tiene una sola fuente.
  - El link compartido carga y limpia las tecnologías.
  - No hay XSS ni scroll horizontal.
  - Los 14 POST a `eventos` dieron 201.
- **Sonda de la base contra :4321:**
  - Mail, UA, salto de línea, tipo o detalle vacío → 400.
  - `dia` 2099 o 2020 → 401 (RLS).
  - Para anon y ana, la vista de 30 días, `eventos` y el resumen dan 0 filas.
  - El PATCH para hacerse admin → 403.
- **Lo pedido en la vuelta 1:** B1, M1–M6, N1–N9 y el link quedaron resueltos y verificados.

## Menores (para 0.33.2; no bloquean)

- **R1 · Un anónimo elige el `id` de `eventos`.** Si ocupa un id por delante de la secuencia, el siguiente contador legítimo da `409 duplicate key` y se pierde en silencio. Arreglo: `revoke insert … ; grant insert (tipo, detalle) on public.eventos to anon, authenticated`.
- **R2 · La lección de Pydantic (H24) describe el síntoma al revés.** Está en `tecnologias.md` y en `web/tecnologias.js`. Con pydantic 2.13.5, el validador que se llama como el campo convierte al método en el default del campo: un campo obligatorio pasa a ser opcional y revienta al serializar (500). No pasa de opcional a obligatorio, como dice el texto.
- **R3 · Flaky de los tests del arnés bajo carga.** No viene del reinicio de dev. Con dos suites en paralelo, el hilo lector de `subprocess` falla con `WinError 1` y deja `stdout=None`.
  - En los tests rompe `support.py:57`.
  - En el producto puede romper `repo.py:24` y `verify._command`.
  - Fallaron 3 de 8 corridas con carga y 0 de 4 sin carga.
  - Arreglo: tratar `None` como falla transitoria y reintentar una vez.

## Nits

- El §11 del master dice «últimas tres versiones», pero la tabla muestra cuatro.
- La línea de W15 quedó redundante en `combinador.js`.
- El barrido de valores legítimos contra el formato del SQL no está como test.
- El placeholder `handback_E-n.md` del ejemplo ecommerce da FAIL con la regla general de rutas. Es anterior a 0.33.

---

## Vuelta 1 · v0.33 @ bb6f168

Resultado: CHANGES_REQUESTED.

- **B1:** H13 no corría sobre `sdd-lite.md` ni sobre `spec.md`.
- **M1:** en LITE, el relevo y `--e2e` creaban `progress/`.
- **M2:** el filtro `MODES` no tenía test.
- **M3:** el ZIP salía incoherente si se cambiaba «IA en el producto» después de generar.
- **M4:** ADR-013 exageraba lo que hacía cumplir el check; además, un anónimo podía meter texto identificante y un `dia` futuro.
- **M5:** huecos de test (W10, W11, W15 y W16).
- **M6:** el texto ajeno entraba al prompt sin límite; el link compartido estaba roto desde antes.
- **N1–N9.**

Detalle en `reve-review-sdd-v033.md` del scratchpad.
