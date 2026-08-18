---
name: revisar-antes
description: Pasada de revisión sobre el cambio actual antes de commitear - bugs, casos borde, secretos y qué falta testear. Usala antes de cerrar cualquier cambio importante.
---

# Revisar antes de cerrar

Sobre el diff actual (no sobre el repo entero), buscá en este orden:

1. **Bugs de verdad**: casos borde sin manejar (vacío, null, cero,
   duplicado, unicode), condiciones al revés, off-by-one, promesas sin
   await, errores tragados en silencio.
2. **Secretos**: claves, tokens o URLs internas que se estén por
   commitear.
3. **Lo que el cambio rompe afuera**: quién más usa lo que tocaste
   (buscá los usos antes de afirmarlo).
4. **Qué falta probar**: el caso feliz seguro está; nombrá los dos o
   tres casos que romperían esto en producción.

Reportá solo lo que encontraste con archivo y línea, lo más grave
primero. Si no encontraste nada, decilo en una línea — no inventes
observaciones para justificar la pasada.
