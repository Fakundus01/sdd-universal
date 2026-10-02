---
name: harness-fix
description: Mejora el arnés cuando un agente falló por culpa del entorno - faltaba contexto, una regla era ambigua o no se controlaba, o un check no existía o mentía. Usala tras un CHANGES_REQUESTED repetido, una corrección de la persona, un check que no atrapó algo, o un agente perdido.
---

# /harness-fix — que el error no se repita

La pregunta no es «¿qué hizo mal el agente?» sino **«¿qué le faltó al
entorno para no equivocarse?»**. Es el rol `prompter` de
`orchestration.md`; el protocolo completo está en `agents/prompter.md`.

1. La falla en una línea: qué, dónde, cómo se detectó.
2. Causa: contexto faltante · regla ambigua · regla sin control ·
   verificación ausente o mentirosa · herramienta o permiso.
3. Arreglo en el nivel más mecánico posible: **test → lint → hook o permiso
   → check en `harness/verify.py` → regla escrita** (último recurso).
4. **Rojo forzado (R29):** rompé a propósito lo que el arreglo tiene que
   atrapar, pegá la salida con el `FAIL`, y después `verify.py --quick` en
   verde.
5. Registrá en `sdd/progress/<rama>/harness_fixes.md` (falla · causa ·
   arreglo y nivel · evidencia) y commit separado `chore(harness): …` con OK
   (R01).

Nunca cambies requisitos ni alcance: eso es un `DRIFT` (R25) y decide la
persona. Nada de reglas genéricas tipo «tené cuidado con X».
