# Review v0.33.2-evals @ 11b590f

Veredicto: APPROVED

Reviewer independiente (R30). Es un cambio solo de docs: el paso 23 de `playbooks/ia-en-el-producto.md` y H26. Base `a5ec186`. El reporte completo está en el scratchpad de la sesión: `reve-review-sdd-evals.md`.

Lo contrasté con `sdd-ejemplos/chatbot`: `backend/evals/` (chequeos, juez, runner y `casos.json`), `tests/test_evals.py`, B-ADR-8 y el changelog 0.2.6–0.2.9. Todo lo que afirma el texto está implementado:
- la capa determinista mira solo lo estructural: tarjetas, markdown y HTML, una moneda pegada a un monto, montos fuera del catálogo y el system copiado;
- hay una rúbrica base en cada turno;
- el juez recibe el catálogo con precios y stock;
- la respuesta y el catálogo van escapados;
- un veredicto malformado, cortado o sin criterio cuenta como «sin veredicto» y el caso falla;
- el juez corre solo a pedido y su costo entra en el máximo que se muestra;
- son seis vueltas de review.

`node --test web/tests/*.test.mjs` → 37/37.

**Menor (redacción):** el playbook dice «los casos grises **que se aceptan** (un total calculado, una viñeta)», y se puede leer como que esas respuestas pasan. En el ejemplo pasa al revés: **fallan a propósito**. Son falsos positivos asumidos (B-ADR-8, vuelta 4) y su test es `test_los_grises_documentados_fallan`. Conviene decir «que se decide hacer fallar igual».

**Nits:**
- El corte estructural se alcanzó en la vuelta 3, no en la sexta: la 6 fue la que lo aprobó.
- En el ejemplo, B-ADR-8 conserva en su cuerpo original «Rechazos: un modelo como juez», aunque las revisiones posteriores sumaron el juez.

---

# Review v0.33.2 @ 958d61d

Veredicto: APPROVED

Reviewer independiente (R30), base `74ad57e`. El reporte completo está en el scratchpad de la sesión: `reve-review-sdd-v0332.md`.

## Evidencia

```
$ node --test web/tests/*.test.mjs     → ℹ tests 37 · ℹ pass 37 · ℹ fail 0
$ node --test dev/tests/local.test.mjs  → ℹ tests 15 · ℹ pass 15 · ℹ fail 0
$ python -m unittest discover -s harness/tests → Ran 141 tests · OK (skipped=1)
```

**R1 en dev:** un anónimo que manda `id` o `dia` → `401 permission denied for table eventos`.

**Mutantes:** de 10, mueren 8. Los que mueren:
- R1a y R1b: sin revoke/grant, o con `id` en el grant.
- R3a, R3b, R3d y R3e: sin reintento, devolver con la salida en `None`, que `verify` no reporte los git perdidos, y que el hook Stop en rojo sin salida deje cerrar.
- P1 y P2: el prompt con IA sin OWASP o sin la regla de agentes.

Sobreviven:
- R1c, que es equivalente: la política `dia = hoy` lo sostiene.
- R3c, que es el Menor de abajo.

**Navegador** (`?v=33.2`, a 360 y 1280):
- Ticketera con IA: el prompt recorre OWASP LLM01–LLM10, separa al que lee del que actúa y pide aprobación humana.
- Brownfield con IA también recorre OWASP; sin IA no aparece.
- `pgvector` está en el catálogo.
- Sin scroll horizontal.

**Contenido nuevo:**
- La tabla OWASP 2025 tiene los nombres y el alcance correctos, y cada control existe en el paquete.
- El NIST AI RMF 1.0 está bien.
- RAG, agentes, evals y lecturas son correctos.
- Los números de H26 coinciden con el ejemplo del chatbot.
- La lección de Pydantic coincide con lo medido.

## Menor

- **R3c · Falta el test de un solo pipe perdido.** `LoseOutput` (`harness/tests/test_salida_perdida.py`) siempre pierde `stdout` y `stderr` juntos. El caso que se vio en la práctica es perder solo `stderr`. Un refactor de `run_captured` que mire solo `stdout` pasa la suite y vuelve el crash: `TypeError` en el hook Stop y `AttributeError` en `decode`.

## Nits

- **Tabla OWASP:** LLM09 dice «datos de la tienda» en una tabla que es genérica, y LLM10 no menciona la extracción del modelo por API.
- **NIST *Govern*:** se apoya en R21, que es [AUTO]. En un proyecto chico no tiene dónde ir.
- **pgvector con HNSW:** el `WHERE` se aplica después del índice, así que con un filtro selectivo se pierde recall. Conviene nombrar `iterative_scan` o un índice por inquilino.
- **Playbook, paso 27:** el chatbot no manda una base de conocimiento cacheada; cachea reglas y personalidad.
- **Reintento:** puede duplicar el tiempo máximo de un comando dentro del hook.
- **Limpieza de dev:** el aviso dice 12 filas y la lista tiene 11.

---

## Historial

- **v0.33.1 @ e7a1e3e — APPROVED.** Quedaron como menores R1 (un anónimo elegía el `id`), R2 (la lección de Pydantic decía el síntoma al revés) y R3 (el test intermitente con `stdout=None`). Los tres se resolvieron en v0.33.2.
- **v0.33 @ bb6f168 — CHANGES_REQUESTED.**
  - B1: el chequeo de rutas en tablas (H13) no miraba `sdd-lite.md` ni `spec.md`.
  - M1–M6: LITE, el filtro `MODES`, el ZIP, el check de eventos, huecos de test y el texto ajeno en el prompt.
  - N1–N9.

  Todo quedó resuelto en v0.33.1.
