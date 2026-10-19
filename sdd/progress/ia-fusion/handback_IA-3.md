# Vuelta 3 · @ HASHPLACEHOLDER

- **Estado:** review (vuelta 3; la vuelta 2 fue `CHANGES_REQUESTED` por un solo bloqueante, ver [`review_IA-3.md`](review_IA-3.md))
- **Rama / commit:** `ia-fusion-IA-3-v3` @ HASHPLACEHOLDER
- **Quién:** implementer. No puede autoaprobarse (R30).

## Qué cambió (solo `api/tests/topeEndpoint.test.mjs`)

1. **`fetchLento` + G1.** `fetchLento` recibe `(url, init)` y, sin `usage` explícito, lo construye del pedido real que mandó el handler: `output_tokens: JSON.parse(init.body).max_tokens` y `cache_creation_input_tokens: bytesUtf8(init.body)`. G1 usa `fetchLento({})` en vez de fabricar `output_tokens: MAX_TOKENS_SALIDA`. Los tres asserts de G1 quedan igual; sin tests nuevos. G2, G3, G3b y G4 no se tocaron (siguen pasando su `usage` explícito).
2. **Rojo medido de M5b** agregado (abajo).
3. **Comentario del encabezado corregido:** `cotaUSDDe()` llama a `estimarCotaUSD` de producción y G3 compara contra `costoRealUSD`; lo que el test reimplementa es qué bytes entran en la cota. Limitación nombrada: la tabla de precios de `api/_lib/costo.js` no la fija ningún test (M9 sobrevive).

`api/fusionar.js` no se tocó: `git hash-object api/fusionar.js` = `56a62dda9faf9c51e8f3e6be4cedaea807aabde4` antes y después de los mutantes, y `git status` no lo lista.

## Rojo medido (R29)

Cada mutante se aplicó a `api/fusionar.js` con una copia de seguridad, se corrió `node --test api/tests/topeEndpoint.test.mjs` y se restauró.

```text
$ node --test api/tests/topeEndpoint.test.mjs      # código real
tests 5 · pass 5 · fail 0

== M5b · max_tokens: MAX_TOKENS_SALIDA * 2 en messages.create (la cota intacta)  -> MUERE (en la vuelta 2 sobrevivía)
ℹ tests 5 · ℹ pass 4 · ℹ fail 1
✖ G1: 8 pedidos en paralelo al endpoint nunca gastan más que el tope (S33, mata M1b)
  AssertionError [ERR_ASSERTION]: gastado final USD 1.2435 > tope 1

== M1b · chequear el tope y llamar; anota después (y la cota en el catch si es ambiguo)  -> MUERE (sigue muriendo, con el primer assert)
ℹ tests 5 · ℹ pass 4 · ℹ fail 1
✖ G1: 8 pedidos en paralelo al endpoint nunca gastan más que el tope (S33, mata M1b)
  AssertionError [ERR_ASSERTION]: 8 llamada(s) al modelo × USD 0.63626 = USD 5.0901 contra un tope de USD 1 (codigos: 200,200,200,200,200,200,200,200)

[restaurado] git status: solo api/tests/topeEndpoint.test.mjs; git hash-object api/fusionar.js = 56a62dda9faf9c51e8f3e6be4cedaea807aabde4
```

## Verificación

```text
$ node api/tests/correr.mjs
ℹ tests 61
ℹ pass 61
ℹ fail 0

$ python harness/verify.py
verify.py @ f8a3e6c (rama ia-fusion-IA-3-v3)
[OK] Memoria en disco · [OK] Tarjetas válidas (21) · [OK] Rutas citadas existen (282 revisadas) · [OK] Arranque liviano
[WARN] sin 'lint' en harness.config.json
[OK] test — ... Ran 241 tests in 14.257s · OK (skipped=3)
VERDE — 0 FAIL, 1 WARN
```

## Sin resolver (no es de esta vuelta)

Los hallazgos no bloqueantes de la review (200 sin `usage` libera la reserva, tabla de precios sin test literal, ADR-017) siguen para el leader; no se tocó código de IA-1.

---

# Handback IA-3 · vuelta 2 — Tests adversarios del tope de gasto, a nivel endpoint

- **Estado:** review (vuelta 2; la vuelta 1 fue `CHANGES_REQUESTED`, ver [`review_IA-3.md`](review_IA-3.md))
- **Rama / commit:** `main` @ el commit de este handback
- **Quién:** implementer. **No puede autoaprobarse** (R30): falta un reviewer que no sea quien escribió estos tests.

## Qué pedía la vuelta 1

La review no pidió rehacer la tarjeta: cuatro de los siete criterios ya estaban cubiertos por `IA-1` (1, 3, 4 y 7). Pedía **cuatro tests a nivel handler**, zona `api/tests/` y sin tocar `api/fusionar.js`. Están los cuatro, en `api/tests/topeEndpoint.test.mjs` (5 tests: G3 quedó partido en dos, G3 y G3b, porque la review pedía dos cosas distintas).

## Hecho

| Pedido | Test | Qué fija |
|---|---|---|
| **G1** · carrera en el endpoint (criterios 2 y 6a) | `G1: 8 pedidos en paralelo…` | 8 pedidos concurrentes al `handler` con `Promise.all`, **IPs distintas** (que el rate limit no sea lo que salve al tope) y un `fetch` lento de 30 ms. Assert como lo escribió la review: `llamadas × cota ≤ tope`, más `gastado ≤ tope` y `llamadas === oks` (ninguna llamada sin reserva) |
| **G2** · la cota sale del prompt real (6b) | `G2: la cota sale del prompt real…` | Con un tope **entre** la cota de un pedido corto y la de uno largo, el corto entra con `fusion:"ia"` y el largo recibe 429 |
| **G3** · sin reservas colgadas tras un éxito (6c) | `G3` y `G3b` | Un éxito con `usage` chico deja anotado el **costo real exacto** (`usdAMicros(costoRealUSD(usage))`), no la cota; y con tope para dos cotas, tres éxitos chicos seguidos entran los tres |
| **G4** · corte a mitad de la respuesta (criterio 5) | `G4: un corte a mitad…` | Un `200` cuyo cuerpo es un `ReadableStream` que manda medio JSON y después `error()`: responde 200 `fusion:"simulada"` y **conserva** la reserva (`gastado > 0`), porque es ambiguo |

`api/fusionar.js` no se tocó: `git status` lo confirma byte a byte después de los mutantes.

Los cuatro cálculos de cota y costo se repiten en el test a propósito, con las funciones exportadas de `costo.js` y `promptSeguro.js`: un test que le pregunta al código cuánto debería gastar no prueba nada.

## Rojo medido (R29)

`IA-1` está `done`, así que el rojo se midió como pide la tarjeta: aplicando cada mutante sobre una copia de seguridad de `api/fusionar.js`, corriendo la suite, y restaurando.

```text
$ node --test "api/tests/topeEndpoint.test.mjs"      # código real
tests 5 · pass 5 · fail 0

== M1b · chequear y después llamar (la forma «prolija»: en el catch anota la cota si el error es ambiguo)
   tests 5 · pass 4 · fail 1  -> MUERE
   cae: G1
   AssertionError [ERR_ASSERTION]: 8 llamada(s) al modelo × USD 0.63626 = USD 5.0901
   contra un tope de USD 1 (codigos: 200,200,200,200,200,200,200,200)

== M2 · cota fija de USD 0,06 en vez de los bytes del prompt
   tests 5 · pass 3 · fail 2  -> MUERE
   cae: G1, G2

== M3 · no ajusta la reserva al costo real después de un éxito
   tests 5 · pass 3 · fail 2  -> MUERE
   cae: G3, G3b

== M4 · libera la reserva con cualquier error, también el ambiguo
   tests 5 · pass 4 · fail 1  -> MUERE
   cae: G4

[restaurado] api/fusionar.js vuelve al original
```

**M1b es el que importa.** Sobrevivía las 56 pruebas de `IA-1` en verde gastando 5× el tope, y es el mutante clásico de S33. Ahora muere con la cuenta en el mensaje del assert, que es la que se lee en el rojo sin tener que entrar al test.

## Verificación

```text
$ node api/tests/correr.mjs
tests 61 · pass 61 · fail 0

$ python harness/verify.py
VERDE — 0 FAIL, 1 WARN     (el WARN de siempre: sin 'lint' declarado)
```

## Lo que no se hizo, y por qué

- **No se repitieron** los tests de los criterios 1, 3, 4 y 7, ni la concurrencia con hilos reales de la primitiva: la review dijo explícitamente que no hacía falta y que ya matan al mutante «sin lock».
- **No se tocó `api/fusionar.js`.** Si un test hubiera revelado un bug real, iba al handback para que el leader lo re-despachara. No apareció ninguno: el código real aguanta los cuatro mutantes.
- **Sigue en pie lo de ADR-017**: esto prueba el freno **por instancia**. Un abuso distribuido entre varias instancias de Vercel sigue acotado solo por el límite de gasto de la consola de Anthropic, que hay que configurar antes de producción. Ningún test puede cubrir eso desde acá.
- **Sin review todavía** (R30). Para la vuelta 2 hace falta alguien que no haya escrito estos tests: re-ejecutar `node api/tests/correr.mjs` (requiere `npm ci`, ADR-018), repetir al menos un mutante por su cuenta, y mirar que los asserts no estén mirando una copia del código en vez del código real — que es justo la regresión que apareció en la vuelta 2 de `IA-1`.
