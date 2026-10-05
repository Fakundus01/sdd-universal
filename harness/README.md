# harness/ · El arnés del SDD, listo para copiar

La parte ejecutable de `harness.md` (R29, R30): verificación por niveles, checks de integridad, hooks de Claude Code, pre-commit y CI de ejemplo. **Python 3.10+ y git, sin dependencias** (R28): probado en Windows con 3.11 y 3.14; el workflow `.github/workflows/harness.yml` del repo del SDD Universal (no del proyecto) corre la suite en Linux, macOS y Windows con 3.10 y 3.12.

## Instalar en un proyecto

1. Copiá esta carpeta a la raíz del repo como `harness/` (podés dejar afuera `tests/` si no vas a tocar el arnés).
2. Copiá `harness.config.example.json` a la raíz como **`harness.config.json`** y poné los comandos de tu stack. Solo `test` es obligatorio. El ejemplo usa `oxlint` porque es el que trae `create-vite`; poné el linter que trae la plantilla de tu proyecto (eslint, ruff, golangci-lint…), no instales otro para que coincida con el ejemplo.
3. Corré `python harness/verify.py --quick`. Crea `sdd/progress/<rama>/current.md` y tiene que terminar en `VERDE`. En modo LITE (`MODO=LITE` en `sdd/custom.md`, o `**Modo:** LITE` en `sdd/sdd-lite.md`) no crea nada: el estado vive en `sdd/sdd-lite.md`.
4. **Pre-commit** (lo que hace cumplir el arnés con cualquier herramienta): `git config core.hooksPath harness/git-hooks`. Es por clon: anotalo en el README del proyecto. Si el proyecto se commitea desde Windows, además `git update-index --chmod=+x harness/git-hooks/pre-commit`: Windows no guarda el bit de ejecución y sin él git ignora el hook en Linux/macOS.
5. **CI:** copiá `ci/verify.yml` a `.github/workflows/` y sumale el setup de tu stack.
6. **Claude Code (opcional):** fusioná `hooks/settings.example.json` con tu `.claude/settings.json`. En macOS/Linux, si no tenés `python`, cambialo por `python3`.

[NOVATO] «Raíz del repo» es la carpeta donde está la carpeta `.git` y el `sdd/`. Los comandos se escriben en la terminal parado ahí.

## Uso

| Comando | Qué corre | Cuándo |
|---|---|---|
| `python harness/verify.py --quick` | Integridad del arnés + lint de lo cambiado | Al arrancar; el pre-commit; el hook de cierre |
| `python harness/verify.py --changed` | `--quick` + `test_quick` si hay cambios de código | Mientras trabajás; antes del handback |
| `python harness/verify.py` | `lint` + `test`, igual que CI | Antes de pedir review; el reviewer siempre |
| `… --e2e` | Además el `e2e`; si da verde, lo anota en `sdd/progress/e2e.md` | A demanda, y antes de desplegar |

La primera línea de la salida dice el comando, el hash y la rama: pegada entera en un handback, ya es evidencia (R30).

**Lint de lo cambiado:** `lint_file` con `{file}` corre una vez por archivo; con `{files}` corre una sola vez con todos (más rápido con eslint y similares: el hook de cierre tiene 110 s). **`lint_file` no pasa por un shell:** se parte en argumentos y cada ruta entra como un argumento, así que ningún nombre de archivo (`$(…)`, backticks, `;`) se interpreta. Por eso `{file}` tiene que ser un argumento entero (`eslint {file}`, `eslint "{file}"`) o el valor de una opción (`--stdin-filename={file}`); metido en `sh -c "…"` o `python -c "…"` volvería a ser código, y el arnés lo rechaza con un error de config. Y **toda ruta entra como `./…`**: así el linter nunca toma un nombre de archivo como una opción (`--config=evil.js`), un response file (`@opts.java` en javac, gcc, clang o MSVC) ni nada que su parser invente después. En Windows, el linter se busca **solo en el `PATH`**, nunca en la carpeta actual, para que un `npx.cmd` plantado en la raíz no reemplace al real. Lo que esto no evita: muchos linters (eslint, prettier) tratan los argumentos como globs, y un archivo llamado `src/[ab].js` puede ampliar lo que se lintea. Eso es ruido, no ejecución. Para encadenar linters, un script: `sh scripts/lint.sh {file}`; las rutas le llegan ya seguras, siempre que el script las pase como `"$1"`/`"$@"` y nunca por `eval` ni `sh -c`. En Windows, escribí las rutas del comando con `/` o entre comillas; y si el linter es un `.cmd`/`.bat` (como `npx`), los nombres con `% ! ^ " & | < > ( )` se saltean con un WARN, porque ahí cmd.exe sí interpreta los argumentos. `test`, `lint` y `e2e` sí corren con shell: no llevan rutas que vengan de nombres de archivo.

**CI y monorepos:** en un PR, CI hace checkout en HEAD detached: la rama sale de `GITHUB_HEAD_REF` (o `CI_COMMIT_REF_NAME` en GitLab). Si `harness/` vive en un subdirectorio del repo (`apps/web/harness/`), la raíz del proyecto es ese subdirectorio y los cambios se cuentan relativos a él.

## Qué revisa (`--quick`)

- `harness.config.json` válido y con `test`; claves desconocidas → WARN (atrapa typos).
- `sdd/SDD-MASTER.md` existe; `sdd/progress/<rama>/current.md` existe (si no, lo crea; en modo LITE ni lo crea ni lo pide).
- Tarjetas de `sdd/cards/`: id = nombre del archivo, estado válido, `in_progress` con rama y una sola por rama, `review` sin rama → WARN, `done` con rama + criterios + `review_<ID>.md` en `APPROVED` con el hash en el título.
- `sdd/status.md` no marca al 100% una feature con tarjetas abiertas.
- Rutas citadas en `cited_paths_docs` y en las tarjetas `done` existen (las tarjetas pendientes pueden citar archivos por crear). En una celda de tabla, un nombre suelto entre backticks (`consultas.py`) tiene que existir en alguna carpeta del proyecto.
- Handbacks de la rama: commiteados, con hash, sin TAB literal → WARN.
- `e2e` declarado sin ninguna corrida verde registrada → WARN (S29).

## Tests del arnés

Viven en el repo del SDD Universal: el ZIP del proyecto no trae `tests/`. Si copiaste `harness/` entero:

```
python -m unittest discover -s harness/tests
```

Cada check tiene el caso que lo hace fallar a propósito: el arnés se prueba con las mismas reglas que exige (R29). Si agregás un check, agregá su rojo.
