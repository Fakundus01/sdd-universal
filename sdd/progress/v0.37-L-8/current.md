# v0.37-L-8 — memoria de la rama

Tarjeta: L-8 (el smoke acusa de vacios a los .gitkeep). Base main @ ff86f90.

Plan:
- Rojo base: correr el smoke y guardar el FAIL actual.
- smoke.mjs: separar marcadores (.gitkeep, deben estar vacios) de archivos con contenido (no vacios); el mensaje nombra los culpables.
- verify.py: WARN cuando existe web/tests/smoke/smoke.mjs (el smoke no corre ahi) con el comando; test en harness/tests/test_verify.py.
- sdd/testing.md: documentar el WARN y el assert.
- Tres mutantes medidos y restaurados; verify.py y smoke en verde; handback.
