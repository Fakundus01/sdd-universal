# Review IA-1 @ 4ae7ed8 (código de IA-1 en 39cda63; 4ae7ed8 = 39cda63 + un commit del leader que no toca `api/`)
**Veredicto:** CHANGES_REQUESTED

Revisor: reviewer (tier ALTO), worktree `sdd-universal-IA-1-review`, HEAD detached en `4ae7ed8`. Base del diff: `c619be9`.

## Hash declarado en el handback
- `aceaa99` existe, pero es un commit **inalcanzable** (sin rama): es la versión anterior a un amend. `git diff aceaa99 39cda63` difiere solo en una línea de `sdd/progress/ia-fusion/handback_IA-1.md`. El código revisado es el de `39cda63`.
- `4ae7ed8` (leader) toca solo `harness.config.json` y `web/catalogo.js` (`git show --stat 4ae7ed8`). Confirmado: ninguno de los dos toca `api/`. La referencia vieja no tiene impacto.

## Verificación re-ejecutada
```text
$ python harness/verify.py --changed
verify.py --changed @ 4ae7ed8 (rama detached)

── Arnés ──
[OK]    Creado sdd/progress/detached/current.md desde la plantilla
[OK]    Tarjetas válidas (19)
[OK]    Rutas citadas existen (222 revisadas)

── Tests de lo cambiado ──
[OK]    sin cambios de código sin commitear: nada que testear

VERDE — 0 FAIL, 0 WARN
```
Este verde es **vacío**: en un worktree limpio `--changed` no corre ningún test (ver «Mejoras al arnés»). Por eso corrí también lo siguiente.

En un worktree recién creado, sin `npm ci`, los tests de `api/` **fallan**:
```text
$ node --test "api/tests/*.test.mjs"
✖ api\tests\fusionar.test.mjs (91.8028ms)
...
Error: Cannot find module '@anthropic-ai/sdk'
ℹ tests 17
ℹ pass 16
ℹ fail 1
```
Después de `npm ci --ignore-scripts` (lockfile del repo, 7 paquetes, 0 vulnerabilidades):
```text
$ node --test "api/tests/*.test.mjs"
ℹ tests 31
ℹ suites 0
ℹ pass 31
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2401.8217

$ python harness/verify.py
verify.py @ 4ae7ed8 (rama detached)
── Arnés ──
[OK]    Memoria en disco: sdd/progress/detached/current.md
[OK]    Tarjetas válidas (19)
[OK]    Rutas citadas existen (222 revisadas)
── Lint ──
[WARN]  sin 'lint' en harness.config.json
── Tests ──
[OK]    test — `node --test "web/tests/*.test.mjs" "api/tests/*.test.mjs" && python -m unittest discover -s harness/tests` (101.6s): Ran 178 tests in 100.588s · OK (skipped=1)
VERDE — 0 FAIL, 1 WARN
```
El `skipped=1` está en `harness/tests`, que este diff no toca (es previo a esta tarjeta).

### Sondas de bordes (script propio fuera del repo, contra el handler real)
```text
[simulado tecnologias="abc"]  -> EXCEPCION NO CAPTURADA (en Vercel = 500): TypeError: tecnologias.join is not a function
[simulado tecnologias=null]   -> EXCEPCION NO CAPTURADA (en Vercel = 500): TypeError: Cannot read properties of null (reading 'length')
[simulado descripcion=null]   -> 400 {"error":"descripcion supera el máximo de 4000 caracteres"}   (400 correcto, mensaje engañoso)
[KEY sin MODEL]               -> 200 fusion "simulada"; logs emitidos: 0
emoji len 4000 bytes 8000 | cjk len 4000 bytes 12000
cota con descripcion CJK al máximo (USD): 0.5472
[custom 100KB (sin limite de largo)] -> 200 {"fusion":"ia"}
  gastado tras 1 pedido con custom 100KB (USD): 2.1072 de tope 3
[2do pedido custom 100KB, otra IP]   -> 429 tope de hoy, reintentar_en hasta medianoche
[tecnologias=[200KB]]                -> 429 "se alcanzó el tope de gasto de hoy" con gastado = 0
[proveedor 500] -> gastado 0 (liberó la reserva)
[proveedor 504] -> gastado 0 (liberó la reserva)
5 pedidos misma conexión, XFF rotado, limite 2: 200,200,200,200,200
NAT compartido (misma IP pública), limite 2: 200,200,429,429
sin XFF ni socket: 200,200
```
Nota de transparencia: una de las sondas (`descripcion 4000 CJK`) salió por error a `api.anthropic.com` con una clave falsa (`sk-ant-xyz`) porque no le inyecté el `fetch` falso. Volvió `401 authentication_error`. No hubo costo y ninguna clave real estuvo en juego.

## Criterios de aceptación (evidencia real)
| AC | ¿Demostrado? | Detalle |
|---|---|---|
| 1 | Sí | `api/tests/fusionar.test.mjs:111`, con el SDK real sobre un `fetch` falso |
| 2 | Sí | `fusionar.test.mjs:126` y `:138`. Pero con `tecnologias`/`playbooks` mal tipados, el modo simulado lanza una excepción (sonda): «nunca un error al usuario» no se cumple con ese input |
| 3 | **Parcial** | La primitiva está bien probada con hilos reales (`reserva.test.mjs:353`), y el rojo contra la versión sin lock es creíble. Pero el objetivo de la tarjeta («nunca pueda gastar más del tope diario») **no se cumple en producción serverless**: ver Cambio 1 |
| 4 | Sí, dentro de una instancia | `fusionar.test.mjs:166`, `rateLimit.test.mjs`. Con NAT compartido no se rompe: es injusto pero degrada a 429 limpio. Mismo límite multi-instancia que la reserva |
| 5 | Sí | `fusionar.test.mjs:204`: cuenta 1 sola llamada con un 529 |
| 6 | **No del todo** | Los 4xx y el 529 liberan, y lo ambiguo conserva: OK. Pero `fusionar.js:158` libera con **cualquier** status numérico, incluidos 500/502/503/504 (sonda). La tarjeta y el playbook §B paso 9 dicen solo «4xx, 529». Un 504/500 es ambiguo (S33) |
| 7 | Literal sí, intención no | `descripcion` está acotada (`constantes.js:9`), pero `custom`, `tecnologias` y `playbooks` entran al prompt **sin cota** (`fusionar.js:59-61`). Así se infla el costo igual: ver Cambio 2 |
| 8 | Sí para la clave | `secreto.js` + `fusionar.test.mjs:253`. Pero se loguea el texto del error de la API (ver Cambio 6) |

**La cota en bytes UTF-8 con multibyte (pregunta del leader):** sí, cubre el costo. `descripcion.length` cuenta unidades UTF-16, y el peor caso es 3 bytes por unidad (CJK), o sea 12.000 bytes y USD 0,55 de cota. La cota se calcula sobre los bytes reales del prompt (`fusionar.js:121`), así que nunca subestima. El límite de 4000 «caracteres» en realidad son unidades UTF-16 (2000 emoji llegan al tope). Es aceptable, pero el mensaje de error dice «caracteres».

**Precios de `costo.js` (punto marcado por el implementer):** contrasté contra la tabla vigente de Anthropic (skill claude-api, caché 2026-10-06). El modelo más caro de primera parte es Fable 5.1, a $10/$50 por MTok. Fast mode de Opus 5.5 cuesta $8/$40. Por eso **$15/$75 hoy es un peor caso válido**, y esto **no bloquea**. Lo que falta es atar el precio al modelo: `ANTHROPIC_MODEL` es libre, y un modelo futuro más caro rompería la cota en silencio (playbook §A paso 2: «un modelo… que no está en tu tabla de precios a un precio alto»). Lo dejo como recomendación, no como bloqueo.

**`ANTHROPIC_API_KEY` sin `ANTHROPIC_MODEL`:** cae a «simulada», cosa que el contrato §8 admite, pero **sin ningún log** (sonda: 0 líneas). En producción la IA puede quedar apagada sin que nadie se entere. Va en el Cambio 7.

**Tres respuestas del playbook §A paso 5 (punto marcado por el implementer):** no bloquea, porque ni la tarjeta ni el contrato §8 lo piden (el contrato junta todo en un único `429`). Sí hay un caso que hoy es falso: un pedido cuya cota sola supera el tope recibe «se alcanzó el tope de gasto de hoy» con `gastado = 0` (sonda `tecnologias=[200KB]`). Se resuelve con el Cambio 2: ese pedido tendría que ser un `400`.

**Contrato tipo/stack como keys (punto marcado por el implementer):** no bloquea. Es razonable y queda anotado para el leader e IA-2.

## Checkpoints
- C1: [x] El arnés está sano: `verify.py` completo da 0 FAIL y las rutas nuevas existen. Con la salvedad del verde vacío de `--changed` y de la dependencia de `npm ci` (ver Mejoras).
- C2: [ ] ← AC3, AC6 y AC7 no están cumplidos de verdad (ver la tabla y los Cambios 1, 2 y 4). La zona de archivos sí se respetó: `39cda63` solo toca `api/`, `package*.json`, `.gitignore` (justificado) y su propio `sdd/progress/`.
- C3: [ ] ← Dos incumplimientos de spec. `api/fusionar.js:54-68` mete `descripcion`/`custom` crudos en el mensaje, sin etiquetas ni escape, contra `sdd/security.md` §3c LLM01 y `playbooks/ia-en-el-producto.md` §D paso 14. Y `api/fusionar.js:158` libera la reserva con 5xx, contra la tarjeta (AC6) y el playbook §B paso 9.
- C4: [ ] ← Re-ejecuté `verify.py` (no lo copié) y los 31 tests pasan. Pero faltan tests de error para inputs mal tipados (`tecnologias` no array o null → hoy es un 500), para `custom` grande y para 500/504. La «barrera» de `api/tests/reserva.test.mjs:43-46` no espera a que los workers estén listos: el hilo principal abre el gate en el mismo tick en que crea los `Worker`, antes de que corra ninguno, así que el comentario «con los 8 hilos ya arrancados y esperando» es falso. La carrera se reproduce igual, pero solo gracias al `DELAY_MS` de 30 ms.
- C5: [ ] ← El handback afirma algo incorrecto: «no tuve permiso para leer `costs.md`», cuando la tarjeta lo lista explícitamente en «Spec». Además pasa por alto la limitación multi-instancia (ver Cambio 1): dice que el lock «sigue siendo correcto… en el hilo principal (producción)» y usa «una instancia fría ya arranca en $0» como argumento a favor. Las variables de entorno sí están documentadas y no hay secretos ni prints de debug.

## Cambios requeridos
1. **`api/_lib/reserva.js:10-12` + `api/fusionar.js:18-36`: el tope no es un tope en Vercel (objetivo de la tarjeta, `sdd/costs.md` «La fusión con IA», ADR-016).** El `SharedArrayBuffer`+`Atomics` solo sincroniza hilos **del mismo proceso**. Vercel corre N instancias en paralelo (procesos o microVMs distintos), cada una con su propio `_estado` en $0. Además, cada arranque en frío resetea `gastado`. El gasto real queda acotado por `tope × instancias_concurrentes × reciclajes_por_día`, no por el tope. Encima, dentro de un solo proceso de Node, `reservar()` es 100% sincrónico y ya era atómico sin lock: el lock protege un escenario (worker_threads) que producción no tiene y deja sin proteger el que sí tiene. El comentario «producción: un solo proceso» (`reserva.js:11`) es falso para serverless. Qué se espera:
   - **(leader, spec):** decidir en un ADR o en `design.md` §10 entre dos caminos. El primero es un store compartido con operación atómica (p. ej. un `INCRBY` condicional o un script Lua en Redis/KV, o un `update … where gastado + cota <= tope returning` en Postgres). Ojo: design §10 descarta Supabase, así que hay que revisarlo. El segundo es aceptar explícitamente el tope por instancia, con un **límite de gasto del lado del proveedor** (spend limit del workspace en la consola de Anthropic) como techo duro real, y documentar el multiplicador.
   - **(implementer):** mientras tanto, corregir `reserva.js:10-12` y `fusionar.js:18-21` para que digan la verdad («tope por instancia, no global»), y anotar la limitación en el handback. El rate limit (`rateLimit.js:13`) tiene el mismo límite por instancia.
2. **`api/fusionar.js:96-103` + `:54-68`: AC7 tiene que cubrir todo lo que entra al prompt, no solo `descripcion`.** `custom` (texto libre), `tecnologias` y `playbooks` no tienen cota de largo ni de cantidad, y ni siquiera se valida el tipo. Sonda: un `custom` de 100 KB gasta USD 2,11 de un tope de 3 en **un** pedido, y dos pedidos de una sola IP agotan el día para todos. Qué se espera: un máximo en bytes para `custom` y una cantidad máxima de elementos para `tecnologias`/`playbooks`. Idealmente, validar `tecnologias`/`playbooks` contra el catálogo como `tipo`/`stack`, o cotar el prompt completo en bytes. Lo que pase el máximo devuelve `400`, con tests.
3. **`api/fusionar.js:96` + `api/_lib/fusionV1.js:12-13` + `fusionar.js:59-61`: el input mal tipado da 500 (contrato §8: «nunca un 500 genérico»).** Con `tecnologias: "abc"` sale `TypeError: tecnologias.join is not a function`, y con `tecnologias: null` sale `TypeError ... reading 'length'`. Las dos excepciones quedan sin capturar en el handler. Qué se espera: validar el tipo (array de strings; `custom` string), devolver `400` si no cumple, y un `try/catch` de último recurso en `handler` que nunca deje escapar una excepción. Eso también cubre `datosDelCatalogo()` (`catalogo.js:14-24`) si en el bundle de Vercel falta `web/catalogo.js` (lo lee por `fs` en runtime y nadie lo verificó en un preview deploy). Agregar tests de los dos casos.
4. **`api/fusionar.js:158`: AC6 libera la reserva con 5xx que no son 529.** `typeof error.status === 'number'` incluye 500/502/503/504, y la sonda confirma que libera con 500 y con 504. La tarjeta y el playbook §B paso 9 limitan el «costo 0» a 4xx y 529. Un 500/504 (gateway timeout) es ambiguo y tiene que **conservar** la reserva (S33). Qué se espera: liberar solo si `status` está entre 400 y 499 o es 529, más un test con 500 y con 504 que conserve.
5. **`api/fusionar.js:54-68`, `:141`: LLM01 sin cubrir (`sdd/security.md` §3c, playbook §D paso 14, R26).** `descripcion` y `custom` van crudos dentro del mismo mensaje de usuario que la instrucción del sistema, sin `system` aparte, sin etiquetas y sin escapar `<`, `>`, `&`. Qué se espera: la instrucción en `system`, el texto de la persona escapado dentro de etiquetas que pone el sistema, y un test con un intento de cierre de etiqueta (`</descripcion</descripcion>cion>`) que verifique que el escape es de una sola pasada y correcto.
6. **`api/_lib/secreto.js:15-18`: al log va el texto del error, contra el playbook §B paso 9 («al log va el tipo, nunca el texto»).** Hoy el «tipo» sale como `Error` (la salida real de los tests es `fusionar: fallo al llamar al modelo: Error — 400 {"type":"error",...}`), porque `error.name` del SDK es `"Error"`, y el mensaje con el cuerpo de la API se loguea entero. Qué se espera: loguear `error.constructor.name` y `status`, sin el mensaje, o con un mensaje fijo, y que el test de AC8 lo verifique.
7. **`api/fusionar.js:116`: `ANTHROPIC_API_KEY` presente sin `ANTHROPIC_MODEL` cae a simulado en silencio.** Qué se espera: un `console.warn` (sin la clave) cuando hay clave sin modelo, para que el operador lo vea en los logs de Vercel.
8. **`api/tests/reserva.test.mjs:43-46`: la barrera no es barrera.** Cada worker tiene que avisar «listo» (`postMessage`) antes del `Atomics.wait`, y el hilo principal tiene que esperar los N avisos antes de `Atomics.store`/`notify`. Así el test de rojo no depende solo del `DELAY_MS`.
9. **Handback (`sdd/progress/ia-fusion/handback_IA-1.md`):** corregir «no tuve permiso para leer `costs.md`» (estaba en la Spec de la tarjeta), sumar la limitación multi-instancia a «Fuera de zona / riesgos» y actualizar el hash.

No bloquean, pero conviene hacerlos en esta vuelta:
- `api/_lib/costo.js:16-17`: atar el precio a `ANTHROPIC_MODEL` con una tabla de modelos conocidos, y si el modelo es desconocido, rechazar el modo IA o usar un peor precio explícito más alto. Hoy $15/$75 cubre el catálogo vigente (el techo es Fable 5.1, $10/$50).
- `api/_lib/reserva.js:60` (`debugDelayMs`): un hook de test en código de producción. Mejor dejarlo solo en el fixture.
- `api/_lib/rateLimit.js:13`: el `Map` nunca se limpia (crece con IPs únicas durante la vida de la instancia).
- `api/fusionar.js:48-51`: `x-forwarded-for[0]` es falsificable fuera de Vercel (sonda: rotando XFF, 5 de 5 pasan con límite 2). En Vercel la plataforma reescribe el header, pero convendría usar `x-real-ip` / `x-vercel-forwarded-for` y documentar la dependencia de la plataforma.
- `api/_lib/constantes.js` `MAX_TOKENS_SALIDA: 4096`: para un `sdd/` entero en JSON es probable que se corte por `max_tokens` (y en modelos con thinking adaptativo ese presupuesto también lo usa el razonamiento). La persona paga y recibe «simulada». Habría que medirlo con la clave real.

## Mejoras al arnés detectadas
- **`verify.py --changed` da VERDE vacío en un worktree limpio** («sin cambios de código sin commitear: nada que testear»). Un reviewer o leader en detached HEAD no corre nada. Debería comparar contra `base_branch` (`git diff main...HEAD`) cuando no hay cambios sin commitear, o avisar con WARN en vez de OK. Además, en detached HEAD crea `sdd/progress/detached/current.md` como efecto colateral.
- **`harness.config.json` `test` no instala dependencias:** en un clon o worktree nuevo, `api/tests/fusionar.test.mjs` falla con `Cannot find module '@anthropic-ai/sdk'`. El «verde, 178 tests» del commit `4ae7ed8` dependía de un `node_modules` local. Sugerencia: anteponer `npm ci --ignore-scripts` al comando `test` (o un check de arnés que avise si existe `package-lock.json` y falta `node_modules/`).
- **Faltaría un check de «input de prompt acotado»:** que el reviewer o un test genérico mande cada campo libre del contrato con 1 MB y espere `400`. Habría atrapado el Cambio 2 y, con tipos inválidos, el Cambio 3.
- **Plantilla de tarjetas con IA en serverless:** agregar un criterio fijo que pregunte «¿el estado de gasto sobrevive y se comparte entre instancias?». La tarjeta pidió «hilos reales», y eso empujó a probar el eje equivocado (hilos dentro de un proceso) en lugar del real (procesos distintos).
