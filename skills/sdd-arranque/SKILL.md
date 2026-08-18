---
name: sdd-arranque
description: Arranca un proyecto bajo SDD Universal - lee el master, hace el cuestionario socrático (R04), propone la estructura y espera el OK antes de escribir código. Usala al iniciar un proyecto nuevo o al adoptar el SDD en un repo que ya existe.
---

# Arranque SDD

Esta skill no reemplaza al núcleo: es el atajo para no pegar el START-PROMPT a
mano. La fuente de verdad siempre es `sdd/SDD-MASTER.md`.

1. Leé `sdd/SDD-MASTER.md`. Si no existe en el repo, pedile a la persona el
   paquete (o que pegue `SDD-COMPACT.md`). Después leé `sdd/custom.md` si
   existe: pisa al master.
2. Si el repo **ya tiene código**, aplicá la variante brownfield (R15):
   analizá sin tocar nada y proponé el `sdd/` que refleje lo que ya existe.
3. Seguí el START-PROMPT (§6 del master): cuestionario socrático (R04),
   clasificación de tamaño y modo (R18), superficie de seguridad (R27),
   propuesta de estructura y de MDs iniciales.
4. **Esperá el OK antes de escribir una línea de código.** Con el OK: generá
   los MD, commiteá con R01, y ofrecé seguir con `/sdd-ciclo`.
