# Cómo contribuir al SDD Universal

Gracias por venir hasta acá. Este paquete crece de una sola manera: **casos reales**.

## La regla que ordena todo (R20)

> Nada entra "porque suena bien".

Toda regla, tecnología, playbook o control de seguridad nace de alguien que se comió un problema concreto. No es burocracia: es lo que evita que en seis meses esto sea un documento de 2000 líneas que nadie lee y que quema tokens en cada sesión — exactamente lo contrario de para qué existe.

Por eso los formularios te piden **el caso**, no solo la idea.

## Qué querés hacer

| | Dónde |
|---|---|
| Algo no funcionó | [Abrir issue de error](https://github.com/Fakundus01/sdd-universal/issues/new?template=1-error.yml) |
| El SDD no cubre tu caso | [Abrir issue de escenario](https://github.com/Fakundus01/sdd-universal/issues/new?template=2-escenario.yml) |
| Falta algo en el catálogo | [Abrir issue de catálogo](https://github.com/Fakundus01/sdd-universal/issues/new?template=3-catalogo.yml) |
| Preguntar o mostrar lo que hiciste | [Discussions](https://github.com/Fakundus01/sdd-universal/discussions) |
| **Encontraste una vulnerabilidad** | [Canal privado](https://github.com/Fakundus01/sdd-universal/security/advisories/new) — **no** una issue pública |

## El recorrido de una idea

```
Tu caso  →  issue de escenario  →  fila en scenarios.md  →  si aplica a muchos, regla nueva
```

Una fila en `scenarios.md` ya es una contribución completa. **No hace falta que propongas la solución**: el caso bien contado vale más que una solución apurada, porque la solución se diseña una vez y el caso no se puede inventar.

Si tu propuesta llega a regla, entra con el formato estándar y tiene que pasar el checklist de `scenarios.md §4`: caso real, formato, eje al que pertenece, costo en tokens, y entrada en el historial.

## Si querés mandar código o texto

1. **Fijate primero si va en `custom.md`.** Si es un gusto personal (apagar R01, cambiar el máximo de líneas), eso ya se resuelve sin tocar el núcleo — armalo desde [Mis reglas](https://sdd-universal.vercel.app/web/) en la web.
2. **El núcleo no se edita para casos particulares.** `SDD-MASTER.md` no puede pasar las ~400 líneas (R20): si tu aporte es detalle, va a un archivo ruteado, no al master.
3. **Un cambio, un PR**, con el caso que lo justifica en la descripción.
4. **Si tocás la web:** cero dependencias nuevas en el front. Es un constraint del proyecto (`sdd/spec.md`, C2), no una preferencia — traer una librería para algo que se resuelve en 40 líneas se rechaza aunque funcione.
5. **Si tocás algo con datos o login:** pasá por `seguridad.md` y decí en el PR qué niveles toca tu cambio (R27).

## Los archivos generados no se editan a mano

`web/tecnologias.js` y `web/reglas.js` **se generan** desde la planilla de tecnologías y desde la §4 del master. Editarlos a mano crea una segunda fuente de verdad que se va a desincronizar — es cuestión de tiempo. Si necesitás cambiarlos, cambiá la fuente y regeneralos.

## Estilo

- **Español rioplatense**, como todo el paquete. Nombres de archivo en inglés.
- Cada cosa dice **por qué**, no solo qué. Un control sin su motivo no se cumple: se tilda.
- Decir de frente lo que no funciona. La sección honesta de la guía ("el día 1 tiene fricción real") vale más que cualquier promesa.

## Licencia

Al contribuir aceptás que tu aporte se publique bajo la [licencia MIT](LICENSE) del proyecto.
