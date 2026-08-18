---
name: sdd-ciclo
description: Un ciclo del loop SDD - implementa el próximo paso acordado, corre los tests, actualiza los MD y cierra con el bloque HANDBACK esperando OK. Usala en cada iteración de un proyecto que ya tiene su sdd/.
---

# Ciclo SDD (LOOP + HANDBACK)

1. Leé `sdd/status.md` y el último HANDBACK para saber dónde está parado el
   proyecto. **No releas el paquete entero**: el Protocolo de Lectura (§2 del
   master) dice qué slice trae cada tarea — releer todo es el error #1 de
   gasto de tokens.
2. Implementá el próximo paso propuesto (o la edición que hizo la persona).
3. Tests según R07. Actualizá los MD que correspondan: `status.md` y
   `changelog-<usuario>.md` siempre; `features`/`contracts`/`testing` si la
   tarea los tocó.
4. Cerrá con el bloque HANDBACK (§7, máximo ~20 líneas) y esperá la
   respuesta: **OK** (ejecutás el próximo paso propuesto), una edición del
   próximo paso, o **STOP**.

Si a mitad del código descubrís que la spec está mal: frená y emití el bloque
DRIFT (R25). Corregirla en silencio está prohibido — decide la persona.
