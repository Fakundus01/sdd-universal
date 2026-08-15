# sdd/ · La especificación **de este proyecto**

> **Ojo, que es fácil confundirse.** Esta carpeta **no es el paquete SDD**.
>
> - **¿Venís a llevarte el SDD para tu proyecto?** Lo que buscás es [`../SDD-MASTER.md`](../SDD-MASTER.md), en la raíz. Ese es el paquete.
> - **¿Querés ver el SDD aplicado a un proyecto real?** Estás en el lugar correcto: esto es el `sdd/` de la web del catálogo, escrito con las mismas reglas que el paquete distribuye.

## Por qué existe

Sería raro publicar una metodología y no usarla. La web del catálogo (`web/`) es una aplicación de verdad — tiene features, decisiones, deuda técnica y una base de datos — así que tiene su `sdd/`, igual que cualquier otro proyecto.

Sirve de dos maneras: nos obliga a comer nuestra propia comida, y es un **segundo ejemplo real** además de [`examples/turnos/`](../examples/turnos/sdd/) — este con la diferencia de que el código *sí* está en el repo y lo podés cruzar contra la spec.

## Qué hay acá

| Archivo | |
|---|---|
| [`spec.md`](spec.md) | Qué es la web, qué no va a ser, y cómo se verifica |
| [`design.md`](design.md) | Por qué es HTML sin build, y cómo está partida |
| [`contracts.md`](contracts.md) | Los archivos de datos y la API de Supabase |
| [`testing.md`](testing.md) | Cómo se verifica algo que no tiene tests automatizados (todavía) |
| [`costs.md`](costs.md) | USD 0/mes, y qué lo rompería |
| [`security.md`](security.md) | La clave pública, la que no, y qué se guarda de cada persona |
| [`decisions.md`](decisions.md) | 7 ADRs, incluido un bug que cambió una decisión |
| [`status.md`](status.md) | Avance real y deuda con fecha |
| [`changelog.md`](changelog.md) | De v0.4 a v0.8 |

Modo **FULL** · perfil **ESTRICTO** · variante **WEB** · 1 persona, así que los archivos van planos, sin sufijo de usuario.
