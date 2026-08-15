# start-prompt.md · Prompt de arranque

## Greenfield — proyecto nuevo (copiar, completar y pegar)

```
Adjunto/pegado va el SDD-MASTER. Aplicalo.

Proyecto: [nombre y qué problema resuelve]
Equipo: [solo yo / N personas: nombres] · Branches: [si aplica]
Stack: [elegido, o "recomendame según el proyecto"]
IA en el producto: [no / sí: para qué]
Modo: [FULL / LITE / FEDERADO — o "clasificalo vos (R18)"]
Perfil: [ESTRICTO / CONFIANZA] · Overrides: [ej. R01=OFF / ninguno]

Pasos: hacé el cuestionario socrático (R04) preguntando lo que falte
(forma de trabajar, lenguajes —un solo lenguaje tipo TypeScript
full-stack o Python back + JS front—, frameworks con recomendación
según el proyecto, IA sí/no y qué modelo conviene). Después proponé
estructura + stack, esperá mi OK, creá la carpeta del repo (R10, con
OK), generá los MD de sdd/ y hacé el primer commit (solo los MD)
según R01.
```

## Brownfield — repo existente sin SDD

```
Adjunto/pegado va el SDD-MASTER. Este repo NO tiene SDD.

Aplicá R15: no toques código. Analizá el repo con subagentes
económicos (estructura, git log, estilo y convenciones del equipo),
generá la carpeta sdd/ completa reflejando lo que EXISTE (no lo que
te gustaría que exista), y redactá una "prompt de arranque sintética"
que reconstruya el contexto del proyecto como si lo hubiéramos
arrancado con SDD.

Presentame todo, esperá mi OK, commiteá los MD (R01) y recién ahí
seguimos con features nuevas.
```
