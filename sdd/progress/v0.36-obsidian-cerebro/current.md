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

## Próximo paso
C-3, C-4 y C-5 en paralelo, cada una en su worktree desde la rama del loop. C-3 y C-4 instalan en `cerebro/.venv` de su worktree (OK dado). Después: C-6 (tras C-3), C-7.
