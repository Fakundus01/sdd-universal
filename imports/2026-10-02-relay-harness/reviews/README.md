# Reviews del scaffold harness/ (2026-10-02)

Las siete vueltas del reviewer independiente sobre `harness/` antes del commit 0.30.1 (R30 aplicado al propio arnés). Son la traza de por qué el arnés es como es: cada vuelta tiene la salida literal de lo que encontró, y las vueltas 2–6 la verificación de que lo anterior quedó cerrado. Resumen en `scenarios.md` S32.

| Vuelta | Veredicto | Lo central |
|---|---|---|
| 1 | CHANGES_REQUESTED | 11 bugs: inyección por nombre de archivo, tildes, `__pycache__`, BOM, veredicto mal parseado… |
| 2 | CHANGES_REQUESTED | La inyección vuelve con `"{file}"` |
| 3 | CHANGES_REQUESTED | …y con `{file}` dentro de `sh -c "…"`: se escala al humano, que elige `lint_file` sin shell |
| 4 | CHANGES_REQUESTED | Un nombre que empieza con `-` es una opción del linter |
| 5 | CHANGES_REQUESTED | `@opts.java` es un response file (javac real) → invariante `./` |
| 6 | CHANGES_REQUESTED | Regresión: linter con ruta relativa en Windows |
| 7 | APPROVED | Deuda declarada: timeout en Windows, CI sin correr, globs, pre-commit en monorepo |
