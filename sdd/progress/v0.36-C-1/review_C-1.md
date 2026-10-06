# Review C-1 @ 2fcf6b7
**Veredicto:** APPROVED

Base `d61f084`, diff revisado `git diff d61f084..2fcf6b7` (11 archivos).

## Verificación re-ejecutada
```text
$ node --test "web/tests/*.test.mjs"
ℹ tests 49
ℹ pass 49
ℹ fail 0
ℹ skipped 0
$ node web/tests/smoke/smoke.mjs   (tail)
ok   descarga rápida: el popup baja la carpeta del proyecto
PASS smoke: 22 pasos, 0 errores de consola
$ python harness/verify.py --changed   (tail)
[OK]    Tarjetas válidas (13)
[OK]    Rutas citadas existen (96 revisadas)
VERDE — 0 FAIL, 0 WARN
```

## Criterios
1. Tests en verde: [x] 49/49 re-ejecutado; N3 pasa con 42.
2. Sin «40/41 situaciones/escenarios»: [x] `grep -rnE "\b(40|41) (situaciones|escenarios)" web README.md sdd-universal-tablero.html` sin resultados. El único conteo de playbooks es «4 playbooks» en el roadmap histórico v0.4 del tablero (línea 344), que es correcto como historia y no se toca. README no tiene conteos.
3. Playbook en la web igual que los demás: [x] card en `web/catalogo.js:65`, `PB_META['obsidian-cerebro']` en `web/catalogo.js:129` (el ZIP lo toma vía `web/combinador.js:63`), checkbox en `web/index.html:758`, fila en Manuales `web/manuales.js:49`. Mismo patrón que `go-live` (los cuatro sitios donde aparece go-live, salvo R32 en reglas.js, que es específico). `prompt.js` solo autoincluye `ia-en-el-producto` por diseño; obsidian-cerebro no requiere autoinclusión.
4. Smoke PASS: [x].
5. `?v=` subido: [x] 35 -> 36 en index/admin/guia/demo y tablero; no queda ningún `?v=3[0-5]` en HTML/JS.

## Tests tocados (¿debilitados?)
- `web/tests/rutas.test.mjs`: solo cambia la versión esperada 35 -> 36 (dos aserciones y el nombre del test). La aserción sigue exigiendo un único valor en todo el archivo; no se debilitó. Ajuste legítimo del bump de cache.
- `web/tests/combinador.test.mjs`: se agrega `obsidian-cerebro` a la lista del test de playbooks nuevos; la aserción se **fortalece** (un caso más, mismas comprobaciones de PB_META, archivo, card y Manuales). El rojo con base `d61f084` está pegado en el handback y es coherente (falta PB_META).

## Checkpoints
- C1 (criterios con evidencia): [x]
- C2 (verificación re-ejecutada, nada skipeado): [x]
- C3 (sin duplicación / patrón existente): [x]
- C4 (zona de archivos respetada): [x] solo `web/**`, tablero y su handback/current.md.
- C5 (tests no debilitados): [x]

## Observaciones menores (no bloquean)
- El handback dice «Rama / commit: 5bd8ed2 (el hash del commit que contiene este handback es el tip)»: correcto, tip `2fcf6b7`.
- Sin tabla de mutantes: aceptable, el cambio es solo datos.

## Mejoras al arnés detectadas
- Un test que compare `ls playbooks/*.md` (menos `_template` y `catalog`) contra `PB_META`/Manuales detectaría cualquier playbook futuro que falte en la web sin depender de listas a mano en el test.
