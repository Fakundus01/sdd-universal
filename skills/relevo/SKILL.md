---
name: relevo
description: Relevo de contexto - guarda el estado completo del trabajo en vuelo en sdd/progress/<rama>/current.md para seguir en una sesión limpia. Usala cuando el arnés avisa que el contexto pasó el umbral, antes de una pausa larga, o cuando la persona lo pide.
---

# Relevo (pasar el testimonio)

La sesión nueva no va a saber nada de esta conversación: solo lo que quede
en disco.

1. Seguí `prompts/relevo.md` (si el proyecto no lo tiene, la plantilla está
   en el paquete SDD Universal): reescribí
   `sdd/progress/<rama-con-guiones>/current.md` **completo** — tarjeta y rol,
   plan con lo hecho, decisiones con su porqué, lo que se probó y no anduvo,
   última verificación con su hash, tarjetas en vuelo y un **próximo paso**
   concreto.
2. Código a medio hacer: commitealo en la rama como `wip: <qué>` (con R01=ON,
   pedí el OK antes).
3. Respondé en dos líneas: dónde quedó el relevo, y que la persona puede
   hacer `/clear` (o abrir otra sesión en la carpeta) — el hook de inicio del
   arnés le muestra `current.md` a la sesión nueva.

No resumas la conversación entera ni pegues salidas largas: comando + una
línea de resultado alcanza.
