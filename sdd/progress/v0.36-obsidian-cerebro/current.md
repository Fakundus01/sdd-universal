# current.md · v0.36-obsidian-cerebro

- **Feature / rol:** loop `obsidian-cerebro` (R33) · leader
- **Loop:** `sdd/loops/obsidian-cerebro.md` — aprobado 2026-10-06, tope 10 vueltas

## Bitácora (vuelta = tarjeta cerrada o bloqueada)
- base · 4cc292e · web/tests 48/49 (conteo de escenarios 40 → 42), verify --quick VERDE
- v1 · C-1 done (review APPROVED, merge); web/tests en verde en la rama del loop
- OK del owner («OK venv», 2026-10-06): C-3, C-4 y C-6 pueden instalar `fastembed`, `mcp` y `openai` en `cerebro/.venv` de su worktree (no en el Python del sistema)

- v2 · C-2 done (review CHANGES_REQUESTED → arreglos → APPROVED @ 8965144, merge bcef738); cerebro/tests 73 OK; deuda menor de la review → criterio 7 de C-5
- deuda (review C-4): el frontmatter guarda `proyecto` tal cual (hasta con caracteres raros) pero la carpeta usa el slug → `buscar --proyecto <slug>` puede no encontrar; va a C-7 o a C-8 (núcleo, `notas.py`)
- review C-3 y C-4: CHANGES_REQUESTED (tests que no atan aviso a stderr/antes de bajar, carga perezosa; R26 con separadores Unicode) → de vuelta a sus implementers
- v3 · C-5 done (review CHANGES_REQUESTED → arreglos → APPROVED @ 8cf57af, merge 3f2a40d); 71 notas reales (42 escenario, 26 hallazgo, 3 leccion). Incidentes: reviewer revirtió cambios sin commitear del implementer (worktree compartido), `taskkill /IM python.exe` de un implementer, scratchpad compartido entre reviewers → reglas nuevas en los prompts
- v4 · C-4 done (review CHANGES_REQUESTED → arreglos → APPROVED @ 12b1bd1, merge 9181c4f); errores de herramienta con isError=true. Deuda (humo stderr, NUL/ , proyecto=slug) → criterio 4 de C-7. Pendiente C-8: playbook §C paso 5 con el Python del venv
- v5 · C-3 done (4 vueltas de review; la 4.ª con implementer ALTO tras 3 CHANGES_REQUESTED; APPROVED @ 1c795aa, merge 548943b, README de C-3 + sección MCP de C-4 unidos a mano); suite 97 con venv, OK sin venv (3 salteados)
- v6 · C-6 done (review en worktree propio; CHANGES_REQUESTED → arreglos → APPROVED @ 9b71e38); openai==3.24.0 (usa httpx2); suite 202 OK; sin llamadas reales
- OK del owner («OK instalar, OK MCP», 2026-10-06): en C-8, instalar el Cerebro en su máquina (`Documents\Cerebro`, venv de `cerebro/`, modelo local) y registrar el MCP con `claude mcp add`. OpenAI sigue pendiente (clave en `.env` la pone el owner + OK de la primera llamada)
- v7 · C-7 done (3 vueltas; review en worktree propio; APPROVED @ 7d95dbf); default sin OneDrive, `mcp add -s user`, índice con slug de proyecto y versión de esquema 2; suite 219
- C-8 (leader): instalado con `instalar.ps1` en `%USERPROFILE%\Documents\Cerebro` (71 notas, local). Objetivo 3: S39 1.º ✓; S42 10.º ✗ (FTS 1.º, coseno de MiniLM fuera del top 15; párrafos no lo arreglan; con mpnet queda 3.º por coseno). DRIFT (R25) → owner eligió «Cambiar a mpnet» (2026-10-06) → tarjeta C-9
- C-8: MCP registrado (`claude mcp add -s user cerebro …` con el Python del venv; `claude mcp list` → `cerebro … Connected`). Playbook §C al día (instalar.ps1, venv, importar-sdd, `-s user`, mpnet, esquema/slug); web/tests 49/49
- C-9: implementer + review APPROVED @ d71641b, pero la review con paráfrasis mostró que mpnet solo gana con la frase exacta y empeora S39 → el leader se corrige ante el owner; owner eligió «MiniLM + objetivo nuevo» → C-9 `blocked` (descartada, sin merge), objetivo 3 = 5 consultas fijas por escenario, top 5 en ≥3 de 5; playbook vuelve a MiniLM

## Próximo paso
C-8 (leader): instalar con `cerebro/instalar.ps1` en `%USERPROFILE%\Documents\Cerebro` (OK dado), objetivo 3 con embeddings locales, registrar el MCP con `-s user` (OK dado), playbook §C al día (venv, `-s user`, instalar.ps1), texto de `mcp_server.py:84`. OpenAI: espera la clave del owner en `.env` y su OK.
