---
name: resumen-sesion
description: Cierre de sesión de trabajo - qué se hizo, qué quedó pendiente y cómo retomar, en 15 líneas. Usala antes de cerrar el chat o para pasarle la posta a otra persona.
---

# Resumen de sesión

Al cerrar una sesión de trabajo, dejá un bloque corto (máx. ~15 líneas)
que cualquiera —vos en dos semanas, un compañero mañana— pueda usar para
retomar sin releer el chat:

```
== Resumen · [fecha] ==
Hecho: [qué se implementó/arregló, con los archivos clave]
Decisiones: [las que condicionan lo que sigue, con su porqué]
Pendiente: [lo que quedó a medias o afuera, en orden]
Próximo paso: [el primero, concreto: "seguir por X en tal archivo"]
Ojo con: [trampas descubiertas: el test flaky, el config raro]
```

Reglas:
1. Sale de lo que **pasó de verdad** en la sesión, no de lo planeado.
2. Los nombres de archivo van exactos: «el módulo de pagos» no se puede
   abrir, `pagos/cobro.py` sí.
3. Si hay changelog o bitácora en el repo, ofrecé volcarlo ahí también.
