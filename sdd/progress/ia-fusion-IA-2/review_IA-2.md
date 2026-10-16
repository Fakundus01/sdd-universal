# Review IA-2 @ e42a585
**Veredicto:** CHANGES_REQUESTED (vuelta 1) → **APPROVED** (vuelta 2, al final de este archivo)

Revisor: sesión distinta de la que implementó (R30). La tarjeta la implementó otro agente; acá se re-ejecutó la verificación en el worktree `sdd-universal-IA-2`, se miró el diff real y se aplicó un mutante.

**Resumen.** Los 7 criterios están implementados y el camino v1 está bien protegido: el mutante que saca el fallback mata el test que lo cubre. Pero el **criterio 6 no funciona en producción**: los tres valores de `detalle` que emite violan el CHECK de `supabase/metricas.sql`, así que el insert falla y la métrica se pierde **en silencio**. El implementador marcó exactamente esta duda en su handback, porque no podía leer ese archivo desde su contexto; la respuesta es que sí, el formato es cerrado.

## Verificación re-ejecutada

```text
$ cd ../sdd-universal-IA-2 && node --test "web/tests/*.test.mjs"
ℹ tests 79 ℹ pass 79 ℹ fail 0
```

### Mutante (no lo repetí del handback: lo apliqué yo)

| Mutante | Qué cambia | Resultado |
|---|---|---|
| Sin fallback a v1 | `const n = await Paquete.proyecto(...)` → `const n = 0` en el `catch` | **4 pass / 1 fail: muere.** Cae «si la llamada falla (red, 429 o 500) cae al v1 automáticamente» |

El worktree quedó restaurado (`git status` limpio).

## Bloqueante

**B1 · Los tres `detalle` nuevos no entran a la base: la métrica del criterio 6 se pierde en silencio.**

`supabase/metricas.sql:143` valida el formato **por tipo**, y para `paquete` es cerrado:

```sql
when 'paquete' then detalle ~ '^(sueltos|skills|(proyecto|rapido):[a-z0-9-]{1,30})$'
```

`combinador.js` emite `"ia:" + tipo`, `"ia-simulada:" + tipo` y `"ia-fallback:" + tipo`. Ninguno matchea: el prefijo admitido es solo `proyecto` o `rapido`. Cada descarga con fusión IA va a fallar el insert, y como `Sesion.contar` no frena la interfaz por una métrica (correcto), **nadie se entera**: el panel de outcomes (F22) va a reportar de menos sin ningún síntoma.

Es el modo de falla que R16 nombra: documentar sin frenar es tranquilidad, no seguridad. Acá, medir sin que entre es peor que no medir, porque el número que se muestra parece completo.

**No se arregla en IA-2.** `supabase/` está fuera de su zona de archivos, y la tarjeta se lo prohíbe explícitamente. Va al leader: sumar los tres prefijos al CHECK. El handback ya lo había pedido («avisar antes de mergear a `ia-fusion`»), y se mergeó sin que nadie contestara — eso es lo que esta review corrige.

## Menor (no bloquea)

**M1 · `#cdesc` sigue sin `maxlength`.** El handback lo justificó bien en su momento: el tope lo definía IA-1 y no se podía inventar un número. Pero IA-1 ya está en `main` y el número existe y es legible: `MAX_DESCRIPCION_CHARS: 4000` en `api/_lib/constantes.js`. Hoy un texto más largo da 400 → cae al fallback v1 → el usuario recibe «la fusión no respondió», que es cierto pero no le dice que puede arreglarlo escribiendo menos. Con el número ya fijado, un `maxlength="4000"` cuesta un atributo. Queda como mejora, no como condición: el camino no se rompe.

**M2 · El agujero del arnés que dejó pasar B1.** Ningún test cruza los literales de `Sesion.contar` de `web/*.js` contra los regex de `metricas.sql`: `web/tests/metricas.test.mjs` prueba el cálculo de O1/O2/O4 y la clase de dispositivo, no el formato de `detalle`. Por eso un valor nuevo puede llegar a producción y romperse ahí. Es un arreglo de nivel 1 (un test que falla si se repite) y le corresponde al leader / `prompter`, no a esta tarjeta.

## Checkpoints

- **C1 · El arnés está sano:** [x] `verify.py --quick` en 0 en el worktree; las rutas nuevas existen.
- **C2 · Cumple la tarjeta:** [ ] 6 de 7 criterios. El 6 está escrito pero no funciona contra la base (B1). Zona de archivos respetada: solo `web/combinador.js`, `web/index.html` y `web/tests/`; no tocó `api/` ni `web/prompt.js`, como pedía la tarjeta.
- **C3 · Respeta diseño y convenciones:** [x] Reusa `Zip.descargar` y `Paquete.proyecto` reales en vez de reimplementar el empaquetado; `custom` sale de la misma expresión literal que `opcionesPaquete()`, así no hay dos lugares que puedan decidir distinto; `tipo`/`stack` van como key del catálogo, que es la diferencia explícita que marca `contracts.md` §8.
- **C4 · La verificación es real:** [x] Re-ejecutada, no copiada. Mutante aplicado por el revisor, muere. Nada skipeado ni debilitado.
- **C5 · Cierra limpio:** [x] Handback completo y commiteado con hash real; sin archivos de descarte, prints de debug ni secretos.

## Para la vuelta 2

1. **Leader:** sumar `ia`, `ia-simulada` y `ia-fallback` al CHECK de `supabase/metricas.sql` (una línea), y anotar en `sdd/status.md` → Bloqueos que ese `.sql` hay que volver a correrlo al reactivar Supabase, como los de 0.32 y 0.33.
2. **Leader / `prompter`:** el test de M2, con su rojo forzado.
3. Con eso, IA-2 queda `APPROVED` sin tocar una línea de su propio código: el bloqueante no era suyo.

---

## Vuelta 2 — APPROVED

El bloqueante B1 no era de IA-2: su arreglo caía fuera de su zona de archivos. Lo resolvió el leader sin que la tarjeta tocara una línea de su propio código.

**B1 · resuelto.** `supabase/metricas.sql` suma los tres prefijos al CHECK de `paquete`. `ia-simulada` e `ia-fallback` van **antes** de `ia` a propósito: con la alternativa corta primero, un motor que no busca el match más largo corta en `ia` y después no encuentra el `:`. Verificado contra el regex, valor por valor:

```text
  ia:webapp              entra
  ia-simulada:webapp     entra
  ia-fallback:webapp     entra
  proyecto:webapp        entra      (no se rompió lo que ya andaba)
  sueltos                entra
  ia:                    NO entra   (sigue exigiendo sufijo)
  otro:x                 NO entra
```

**M2 · resuelto.** `web/tests/metricas-formato.test.mjs` cruza cada `Sesion.contar("<tipo>", "<literal>"…)` de `web/*.js` contra el regex que `metricas.sql` exige para ese tipo. El segundo test es un inventario de los que pasan una variable y no se pueden verificar, con un tope: si se vuelven demasiados, avisa.

Rojo forzado (R29), plantando en `main` —antes del arreglo del SQL— el valor real que trae esta tarjeta:

```text
$ node --test "web/tests/metricas-formato.test.mjs"
pass 1 / fail 1
AssertionError: web/combinador.js: «ia:x» (tipo paquete) no entra en el CHECK de metricas.sql
  — el insert va a fallar en producción y la métrica se pierde en silencio
```

Con el arreglo, y ya con los tres valores reales de IA-2 en el árbol:

```text
$ node --test "web/tests/*.test.mjs"
tests 87 / pass 87 / fail 0
```

**M1 (el `maxlength`) queda como mejora, no como condición:** el camino no se rompe sin él, y cambiarlo ahora tocaría código de una tarjeta ya aprobada por un motivo de interfaz, no de corrección.

**Veredicto de la vuelta 2: APPROVED.** Los 7 criterios cumplidos — el 6, ahora de verdad.
