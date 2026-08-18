---
name: arreglar-error
description: Diagnóstico antes que parche - reproduce el error, encuentra la causa raíz y recién ahí toca código. Usala cuando algo se rompe o pegues un stack trace.
---

# Arreglar un error (sin escopetazos)

1. **Reproducí primero.** Si no podés ver el error fallar, no sabés si
   lo arreglaste. Pedí el mensaje exacto, el stack trace o los pasos.
2. **Leé el error de verdad**: la línea, el archivo, el tipo. El 80% de
   las veces el error dice dónde está el problema; el otro 20% dice
   dónde explotó, que no es lo mismo — seguí la cadena hacia atrás.
3. **Una hipótesis por vez.** Enunciala («creo que X porque Y»),
   verificala con una lectura o un print, y recién después tocá código.
   Prohibido el escopetazo de cambiar cinco cosas a ver si alguna anda.
4. **El arreglo va a la causa, no al síntoma.** Un `try/catch` que
   esconde el error o un `if` que esquiva el caso no es un arreglo: es
   una deuda con disfraz.
5. Después del fix, **volvé a correr lo que fallaba** y decí el
   resultado real. Si podés, dejá un test que hubiera atrapado esto.
