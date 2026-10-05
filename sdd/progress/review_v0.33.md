# Review v0.33 @ bb6f168

Veredicto: CHANGES_REQUESTED

Reviewer independiente (R30), base `2b522bd`. Reporte completo con repros y salidas: scratchpad de la sesión, `reve-review-sdd-v033.md`.

## Evidencia

```
$ node --test web/tests/combinador.test.mjs web/tests/metricas.test.mjs web/tests/paquete.test.mjs
ℹ tests 21 · ℹ pass 21 · ℹ fail 0
$ node --test dev/tests/local.test.mjs
ℹ tests 12 · ℹ pass 12 · ℹ fail 0
$ python -m unittest discover -s harness/tests
Ran 121 tests in 62.515s
OK (skipped=1)
```
Mutantes: 41 en total, 31 muertos. Sobreviven 10: M4, M11, M12, M14, M15, W9, W10, W11, W15 y W16.

## Bloqueante

- **B1 · H13 no corre donde nació.** `harness/config.py:12` (`DEFAULT_CITED_DOCS` = AGENTS, CLAUDE, `sdd/testing.md`) no incluye `sdd/sdd-lite.md` ni `sdd/spec.md`. En una copia de la landing (LITE), una fila con `consultas_inexistente.py` en `sdd-lite.md` da **VERDE** con la config por defecto. Recién da FAIL si se declara el archivo en `cited_paths_docs`. Aun así, `prompts/sdd-lite.md:70` promete que «el arnés verifica… también adentro de las tablas». Hay que arreglar los defaults (sin el master ni `orchestration.md`, que dan entre 16 y 26 falsos positivos) y sumar un test que reproduzca H13 tal cual, o corregir la plantilla y S36.

## Menores

- **M1 · H7 a medias.** En LITE, el hook de contexto manda a hacer el relevo en `sdd/sdd-lite.md`, pero `prompts/relevo.md:10` y la skill `relevo` dicen que se cree `sdd/progress/<rama>/current.md`. Además, `--e2e` escribe `sdd/progress/e2e.md` (`verify.py:104`) y `checks.py:315` avisa en cada `--quick` hasta que ese archivo existe.
- **M2 · Detección LITE sin test sobre el archivo real.** El filtro `MODES` de `sdd_mode` es lo que sostiene la detección: sobre el `sdd-lite.md` real de la landing la regex devuelve `['LITE','CONFIANZA']`. El mutante M14 lo saca y ningún test cae.
- **M3 · Prompt viejo en el ZIP al cambiar «IA en el producto».** Si se cambia la casilla después de generar, el ZIP sale incoherente: `combinador.js:132` repinta la lista pero no el prompt, y `combinador.js:68` usa el prompt viejo. Resultado: un PROMPT-DE-ARRANQUE que dice que adjunta `ia-en-el-producto` y un ZIP que no lo trae.
- **M4 · ADR-013 y `contracts.md` prometen más que el check.** `decisions.md:169` y `contracts.md:118` dicen que la base rechaza todo lo que no sea una de las dos clases. El check solo mira lo que va después de `|` en `visita`. Un anónimo inserta `visita` con un mail o un UA sin barra (201), cualquier cosa en los otros tipos (201) y `dia=2099-01-01`, que la vista de 30 días cuenta para siempre (`metricas.sql:124`, sin cota superior). La RLS de lectura sí aguanta: anon y ana ven 0 filas.
- **M5 · Huecos de test.** Sobreviven W15 (el combinador deja de leer CONFIANZA del configurador, que es el camino real de H3), W16 (el chip «Sumar igual» sin `esc`; en el navegador hoy está bien escapado), W10 (O4 cuenta llegadas sin clase) y W11 (el borde de la meta).
- **M6 · Texto ajeno sin límite en el prompt.** El nombre de una tecnología que viene de una combinación o de un link no se limpia: un nombre con saltos de línea queda en el prompt como instrucción suelta (R26). El tope de 60 está solo en el input. Aparte, y desde antes de 0.33: el link `#/combinador?c=` no carga, porque `catalogo.js:149` borra el hash antes que `inicio.js:222`.

## Nits

- El master tiene 405 líneas contra el «~400» de R20; la base ya tenía 403.
- `scenarios.md:93` cita `sdd-ejemplos/HALLAZGOS.md`, que está fuera del repo.
- Conteos viejos: `README.md:30` dice «101 tecnologías» y `catalogo.js:32` «23 situaciones».
- Cuando el combinador y el configurador tienen perfiles distintos, el prompt y `custom.md` se contradicen en PERFIL.
- `sesion.js:295` corta en 120 caracteres después de pegar la clase: con una ruta larga la visita se pierde.
- Precisión del playbook de IA: la cota en bytes no cuenta el sistema interno de tool use, y el caché con TTL de 1 h cuesta 2×.
- Sobreviven M11, M12 y M15 del arnés. M4 es casi equivalente.

## Lo que se sostiene

- Detección de modo con los `custom.md` reales: el paquete, turnos, chatbot, ecommerce y ticketera-ia dan FULL; la landing da LITE. `--quick` en LITE no crea nada.
- H13 no da falsos positivos en ninguno de los cuatro ejemplos.
- H23 queda completo.
- No hay XSS en los chips, en el aviso ni en las vistas nuevas del admin.
- La RLS de `metricas_30_dias` aguanta y el PATCH de admin da 403.
- No hay scroll horizontal a 360 ni a 1280.
- La lógica de R01, R12, el playbook y LITE en `prompt.js` está bien cubierta: W1–W8 mueren.
- El playbook de IA coincide con lo que se implementó en chatbot y ticketera-ia.
