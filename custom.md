# custom.md · Overrides personales

El núcleo universal (`SDD-MASTER.md`, `SDD-COMPACT.md`, `scenarios.md`) **no se edita**: así podés actualizarlo cuando salga una versión nueva sin perder tu configuración. Todo lo tuyo va acá. El agente lee el master primero y después este archivo, que pisa lo que haga falta.

## Sintaxis

```
R01=OFF                  # apagar una regla
R05.max=500              # cambiar un parámetro de una regla
R14.stack=aws            # preferencia propia (aunque no sea free-tier)
+R21-NOMBRE: descripción # agregar una regla propia (formato estándar de R20)
PERFIL=CONFIANZA         # perfil por defecto para mis proyectos
MODO=FULL                # modo por defecto
VARIANTE=WEB
```

## Mis overrides

```
PERFIL=ESTRICTO
MODO=FULL
VARIANTE=WEB
# (sin overrides todavía)
```

## Notas personales

- (espacio libre: convenciones tuyas, stacks favoritos, cosas que el agente debe saber de vos)
