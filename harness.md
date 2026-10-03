# harness.md · El arnés: que lo que el agente dice que hizo sea cierto

**Versión:** 0.30.1 · 2026-10-02 · **Para agentes:** leer cuando la tarea sea cerrar algo como `done` (R30), escribir un test o un check (R29), configurar el arnés de un proyecto, o retomar trabajo después de un corte de contexto. **Para humanos:** por qué un «listo» del agente no alcanza y qué lo reemplaza.

> Nace de **Relay**, el sistema que se usó en producción en `chat-commerce-ai` (features H-1 a H-11). Escenarios S28–S31.
> El SDD gobierna *qué* se construye; el arnés hace cumplir *que esté construido*.

---

## 1 · Qué es y cuándo se activa

El arnés son tres cosas que viven en el repo, no en el chat:

| Pieza | Qué hace | Dónde |
|---|---|---|
| **Verificación** | Un solo punto de entrada que corre los checks por niveles y dice `[OK]`/`[WARN]`/`[FAIL]` | `harness/verify.py` + `harness.config.json` |
| **Evidencia** | Qué cuenta como prueba de que algo anda, y quién la re-ejecuta | este archivo §4 + R30 |
| **Memoria en disco** | El estado del trabajo en vuelo, para que un corte de contexto no lo borre | `sdd/progress/<rama>/` |

Se activa con **R29/R30** (ON por default). Funciona con un solo agente: no hace falta orquestación para tener evidencia. La orquestación con roles (R31) vive en `orchestration.md` y se apoya en esto.

**Universal:** nada de este archivo nombra un lenguaje ni un framework. Lo propio del proyecto (con qué se testea, se lintea, se despliega) se declara en `harness.config.json` y en ningún otro lado.

---

## 2 · `harness.config.json` (por proyecto, en la raíz)

```json
{
  "test": "npm test",
  "test_quick": "npm test -- --changed",
  "lint": "npm run lint",
  "lint_file": "npx eslint {file}",
  "lint_ext": [".js", ".ts", ".tsx"],
  "e2e": "npx playwright test",
  "prod_readonly_query": "psql \"$PROD_RO_URL\" -c \"{sql}\"",
  "deploy": "git push origin dev:main",
  "base_branch": "dev",
  "prod_branch": "main",
  "context_threshold": 400000
}
```

| Clave | Obligatoria | Uso |
|---|---|---|
| `test` | sí | La suite que define «verde». Sin esto no hay R30. |
| `test_quick` | no | Subconjunto rápido para `--changed`. Si falta, se usa `test`. |
| `lint` | no | Lint completo (nivel completo). |
| `lint_file` | no | Lint de lo cambiado: `{file}` corre una vez por archivo, `{files}` una sola vez con todos. **No pasa por un shell** (S32): ver abajo. Lo usan `--quick`, el pre-commit y el hook post-edición. |
| `lint_ext` | no | Extensiones a las que se les pasa `lint_file` (ej. `[".ts", ".tsx"]`). Si falta: todo menos `.md` y `.json`. |
| `e2e` | no | End to end a demanda (`verify.py --e2e`). Cada corrida verde se anota con su hash en `sdd/progress/e2e.md`; si `e2e` existe y ese registro está vacío, `--quick` avisa (S29). |
| `prod_readonly_query` | no | Consulta de **solo lectura** a producción para R32. Las credenciales van en `.env` con un usuario sin permisos de escritura (R17). |
| `deploy` | no | **Documental: el agente jamás lo ejecuta** (R32). Está para que el humano y el `infra-implementer` sepan cuál es el comando. |
| `base_branch` / `prod_branch` | no | Ramas de integración y de producción (default: `main` / `main`). |
| `context_threshold` | no | Tokens de *trabajo* de la sesión antes de pedir relevo (§6). Default 400000. |
| `cited_paths_docs` | no | Docs cuyas rutas citadas tienen que existir (§7). Default `AGENTS.md`, `CLAUDE.md`, `sdd/testing.md`. |

JSON y no YAML/TOML: lo leen la stdlib de Python y de Node sin dependencias (R28). Los comentarios van en `sdd/design.md`, no en el JSON. Tipos inválidos o claves desconocidas dan error o aviso, nunca un traceback.

**`lint_file` y los nombres de archivo (S32).** Es el único comando que recibe datos que no escribió el usuario: nombres de archivo que salen de `git status`. Por eso se parte en argumentos y corre **sin shell**; `{file}` va como argumento entero (`eslint {file}`, `eslint "{file}"`) o como valor de una opción (`--stdin-filename={file}`), nunca dentro de `sh -c "…"` ni `python -c "…"` (se rechaza al cargar la config); y **toda ruta entra como `./…`**, para que el linter no tome `--config=x` como una opción ni `@x` como un response file. En Windows el linter se busca solo en el `PATH` o, si trae ruta, contra la raíz: nunca en la carpeta actual. Para encadenar linters, un script que reciba `"$1"`.

---

## 3 · Niveles de verificación

Un solo comando, tres niveles. Lo corre el agente al arrancar, mientras trabaja, antes de entregar, y lo re-ejecuta el reviewer.

| Nivel | Qué corre | Cuándo |
|---|---|---|
| `verify.py --quick` | Integridad del arnés (§7) + estado de tarjetas + lint de lo cambiado. Segundos. | Al arrancar; al cerrar cada respuesta (hook) |
| `verify.py --changed` | `--quick` + `test_quick` sobre las áreas con cambios sin commitear | Mientras se trabaja; antes del handback |
| `verify.py` (o `--full`) | Todo, igual que CI: `lint` + `test` | Antes de pedir review; el reviewer siempre |
| `… --e2e` | Además `e2e`, y registra el verde con su hash | Si la tarjeta lo pide; antes de desplegar |

La primera línea de la salida es el comando, el hash y la rama (`verify.py --changed @ 3f1c9a2e (rama feat/stock)`): pegada entera, ya es evidencia (§4). En CI, con HEAD detached, la rama sale de `GITHUB_HEAD_REF` o `CI_COMMIT_REF_NAME`. En un monorepo, la raíz es la carpeta que contiene `harness/` y los cambios se cuentan relativos a ella. Sin git, `--changed` corre los tests igual y avisa que no puede saber qué cambió.

Exit distinto de 0 si algo falla. Pensado para Windows (Git Bash, PowerShell, cmd), macOS y Linux; probado en Windows, y el workflow `harness.yml` del paquete corre la suite en los tres.

**Línea base medida.** `sdd/testing.md` anota la última corrida completa con su hash: `2026-10-01 @ a942c177 — 2245 passed, 9 skipped`. Toda cuenta de tests de un handback se explica contra esa base. Si la cuenta bajó, hay que decir qué test se fue y por qué.

---

## 4 · Qué cuenta como evidencia (R30)

> El agente no dice «funciona»: lo demuestra. El reviewer no confía: re-ejecuta.

Evidencia válida = **comando exacto + salida literal + hash del commit** donde corrió.

```text
$ python harness/verify.py --changed      # @ 3f1c9a2e
[OK]    harness · 0 problemas
[OK]    test_quick — 2251 passed, 9 skipped (0:01:42)
```

- **Por criterio de aceptación:** cada criterio de la tarjeta nombra el test o check que lo demuestra.
- **Salida tal cual.** Sin recortar ni reescribir líneas. Si usás `| tail -N`, pegás las N líneas o decís que recortaste. (En Relay faltaba el `(h:mm:ss)` de pytest y eso delató una salida editada.) Las salidas van en un bloque ` ```text ` aunque traigan `\` de Windows: no se convierten a mano.
- **Hash real.** `a942c177`, nunca «ver git log». El handback se commitea **antes** de responder `done`: uno sin commitear no viaja con la rama.
- **Lo largo va al archivo**, no al chat: al chat vuelve `done -> <ruta>`.

**No es evidencia:** «debería andar» · un test que solo verifica que no explota · `done` con el verificador en rojo · tests skipeados o con la expectativa cambiada para que pase sin entender por qué fallaba · una salida «del handback» copiada por el reviewer en vez de re-ejecutada.

**Reviewer independiente.** Con subagentes: el rol `reviewer` (`orchestration.md`). Sin subagentes: una **sesión nueva** con contexto limpio que solo recibe la tarjeta, el handback y el diff — o el humano. Nunca la misma sesión que implementó. Aunque el cambio «sea trivial»: es justo donde el implementador no mira.

---

## 5 · TDD y rojo forzado medido (R29)

**Ciclo:** rojo → verde → refactor. El test se escribe primero y se lo ve fallar **por la razón correcta** (no por un import roto).

**El rojo se mide, no se infiere.** Si el handback dice que un test fallaba antes del fix, se corrió contra la base (un worktree temporal o el commit anterior) y se pega la salida con el hash de la base. En Relay, un «fallaba con NameError» deducido de un lint era falso. Si el cambio no altera la cuenta, el antes y el después son idénticos y solo el hash prueba que se midió.

**Rojo forzado:** todo **check, guard, hook o test de infraestructura nuevo** —y todo cambio en cómo se reporta un error— se prueba rompiéndolo a propósito una vez (temporal, sin commitear) y pegando la cola de la salida donde se ve el `FAIL`. Un check que nunca vio un rojo no se sabe si funciona: puede estar no corriendo. Fue la práctica que más bugs de los propios checks atrapó.

**Variantes de dominio:** DATA → el «test» es una validación de datos (esquema, rangos, nulos) y el rojo forzado es un dataset roto a propósito. GAME → `playtest.md` documenta el caso y su resultado; el rojo forzado es el estado de juego que el check debe rechazar.

### Checks de drift fuente ↔ realidad

Los checks comunes comparan el código consigo mismo. Hacen falta además checks que comparen **lo declarado contra lo que corre de verdad**:

| Drift | Check |
|---|---|
| Esquema de las migraciones ≠ modelos | Comparar metadata (ej. `compare_metadata` en Alembic, `prisma migrate diff`) |
| CI que nunca corrió (workflow en una rama que no es la por defecto) | `verify.py` avisa si `e2e` está declarado y no hay corrida verde registrada |
| Rutas citadas en los MD que no existen | Check de rutas (§7) |
| Lógica de negocio vs datos de producción | `prod_readonly_query` antes del deploy (R32) |

---

## 6 · Memoria en disco

El chat se corta, se degrada o se limpia. El estado no puede vivir ahí.

```
sdd/
├── cards/<ID>.md                 # tarjetas: la cola de trabajo (frontmatter: estado, rama, aceptación)
└── progress/<rama-con-guiones>/
    ├── current.md                # estado vivo: plan, bitácora, verificación, PRÓXIMO PASO
    ├── handback_<ID>.md          # lo escribe quien implementó
    ├── review_<ID>.md            # lo escribe el reviewer
    ├── explore_<tema>.md         # lo escribe el analytic
    └── harness_fixes.md          # lo escribe el prompter (§8)
```

- **Una carpeta por rama:** varias sesiones en paralelo no se pisan ni chocan al mergear. Se commitea con la rama: es la traza auditable.
- **Tarjetas como cola:** un archivo por tarjeta en `sdd/cards/`, con frontmatter `estado: pending | in_progress | review | done | blocked`, `rama`, `feature` (la de `status.md`). `status.md` sigue siendo la vista humana y enlaza las tarjetas; el check §7 verifica que coincidan. Plantilla: `prompts/task-card.md`.
- **Relevo:** cuando la sesión pasa `context_threshold` tokens de **trabajo** (el uso actual menos el de la primera respuesta: la base ya ocupa decenas de miles), el agente reescribe `current.md` completo —feature y rol, plan con lo hecho, decisiones con su porqué, qué se probó y no anduvo, próximo paso accionable, tarjetas en vuelo— commitea lo que esté a medias como `wip:` y le pide al humano que limpie el contexto. La sesión nueva arranca leyendo `current.md`. Plantilla: `prompts/relevo.md`.

---

## 7 · Qué revisa el arnés (`verify.py --quick`)

1. Existen los archivos base (`harness.config.json`, `sdd/SDD-MASTER.md`, `sdd/progress/<rama>/current.md` — lo crea si falta).
2. Toda ruta citada en los docs de `cited_paths_docs` y en las tarjetas `done` existe (`src/x.ts:120` y `#L3` se aceptan). Las tarjetas pendientes y `design.md` pueden citar archivos que todavía no existen: R08 los escribe antes que el código.
3. Tarjetas: frontmatter válido, una sola `in_progress` por rama, toda `done` con criterios de aceptación y un `review_<ID>.md` en `APPROVED` con hash.
4. Handbacks de la rama: commiteados, con hash real, sin TAB literal.
5. `status.md` coherente con las tarjetas (una feature al 100% tiene todas sus tarjetas `done`).
6. Lint de los archivos cambiados (`lint_file`).

Cada uno de estos checks tiene su test **con rojo forzado** (`harness/tests/`, en el repo del SDD Universal: no viaja en el ZIP del proyecto). El arnés se prueba con las mismas reglas que exige.

### Checkpoints del reviewer

El reviewer recorre cada casilla y marca `[x]` o `[ ]` con el motivo. Una casilla vacía en C1–C5 es `CHANGES_REQUESTED`.

- **C1 · El arnés está sano:** `verify.py --quick` en 0; las rutas nuevas existen.
- **C2 · Cumple la tarjeta:** cada criterio con evidencia; solo se tocó la zona de archivos (o la excepción está justificada); no se mezclaron otras features.
- **C3 · Respeta diseño y convenciones:** `sdd/design.md`, `sdd/contracts`, R05/R06.
- **C4 · La verificación es real:** el reviewer re-ejecutó `verify.py` (no lo copió); hay tests nuevos que cubren el cambio (camino feliz + un error); nada skipeado ni debilitado.
- **C5 · Cierra limpio:** handback completo y commiteado; `current.md` al día; sin archivos throwaway, prints de debug ni secretos (R17); variables de entorno nuevas documentadas.

---

## 8 · Auto-mejora: que el error no se repita

Cuando algo falla **por culpa del entorno** (faltaba contexto, regla ambigua, regla sin control, check ausente o mentiroso, permiso de más) la pregunta no es «¿qué hizo mal el agente?» sino **«¿qué le faltó al arnés para que no se equivocara?»**. Lo hace el rol `prompter` (o la skill `/harness-fix`).

Se arregla en el **nivel más mecánico posible**, de mejor a peor:

1. Un **test** que falle si se repite.
2. Una **regla de lint**.
3. Un **hook o permiso** de la herramienta.
4. Un **check** en `verify.py`.
5. Una **regla escrita** en `sdd/` (último recurso; concreta y con ejemplo, nunca «tené cuidado con X»).

Cada arreglo lleva su rojo forzado (R29), se anota en `sdd/progress/<rama>/harness_fixes.md` (falla · causa · arreglo y nivel · evidencia) y va en un commit separado `chore(harness): …`. Si el arreglo es una regla nueva para el SDD mismo, entra por `scenarios.md` (R20).

---

## 9 · El arnés en cada herramienta (R22)

Lo que **hace cumplir** el arnés en cualquier herramienta son **git hooks + CI**: corren igual sin importar qué agente escribió el código. Los hooks de la herramienta son un extra que da feedback antes.

| Herramienta | Hooks propios | Lo que hace cumplir | Roles (R31) |
|---|---|---|---|
| Claude Code | Sí: inicio de sesión (muestra `current.md`), guardia de contexto, lint post-edición, `--quick` al cerrar | todo lo de abajo + hooks | subagentes |
| Codex, Cursor, Copilot, Gemini CLI | Varían por versión: se usan si existen, nunca se asumen | `pre-commit` → `verify.py --quick` · CI → `verify.py` | sesiones separadas con la misma tarjeta |
| Agentes solo-chat | No | El humano corre `verify.py` y pega la salida | el reviewer es un chat nuevo |

El scaffold trae los tres: `harness/hooks/` (Claude), `harness/git-hooks/pre-commit` y un workflow de CI de ejemplo. Los nombres de eventos de cada herramienta envejecen: R19 los audita.

---

## 10 · Toggles y modo NOVATO

| Regla | Default | NOVATO (R23) | Si se apaga |
|---|---|---|---|
| R29 TDD-ROJO-PRIMERO | ON | ON — el agente escribe y corre los tests; el humano no puede revisar el código | Los tests pueden venir después del código; el rojo forzado de checks nuevos **sigue** siendo obligatorio |
| R30 LOOP-CERRADO | ON (fija) | ON | — |
| R31 ORQUESTACIÓN-CON-ROLES | AUTO | OFF — demasiadas piezas para supervisar | Un solo agente + reviewer en sesión nueva |
| R32 PRODUCCIÓN-CON-OK | ON (fija) | ON | — |

Modo LITE: el arnés se reduce a `harness.config.json` + `verify.py` + evidencia en el HANDBACK; sin `cards/` ni `progress/`.

---

## Historial

| Versión | Fecha | Cambio |
|---|---|---|
| 0.30.1 | 2026-10-02 | DRIFT resuelto al implementar `harness/` (opción A): §2 suma `lint_ext`, `cited_paths_docs`, `{files}` y la regla de `lint_file` sin shell (S32); §3 suma `--e2e` con registro, la primera línea como evidencia, CI con HEAD detached, monorepo y proyecto sin git; §7.2 acota las rutas citadas a los docs declarados y las tarjetas `done`. Lo de macOS/Linux pasa a «pensado para», hasta que corra el CI. |
| 0.30 | 2026-10-02 | Primera versión, destilada de Relay (chat-commerce-ai, rama `dev`): config por proyecto, verificación por niveles, evidencia con hash, TDD con rojo medido, rojo forzado de checks, drift fuente↔realidad, memoria en disco por rama, checkpoints del reviewer, auto-mejora por nivel mecánico, degradación por herramienta. |
