# relevo.md · Relevo de contexto (pasar el testimonio)

Cuándo: el arnés avisa que la sesión pasó `context_threshold` tokens de trabajo, antes de una pausa larga, o cuando el humano lo pide. El chat nuevo no va a saber nada de esta conversación: **solo lo que quede en disco**. Detalle: `harness.md` §6.

## Instrucción (la ejecuta el agente)

```
Hacé el relevo:
1. Ubicá la rama (git rev-parse --abbrev-ref HEAD) y el archivo
   sdd/progress/<rama-con-guiones>/current.md (si no existe, creálo
   desde la plantilla de abajo).
2. Reescribilo COMPLETO con la plantilla.
3. Si hay código a medio hacer, commitealo en la rama como
   "wip: <qué>" (con R01=ON, pedí el OK antes).
4. Respondeme en dos líneas: dónde quedó el relevo y que puedo limpiar
   el contexto o abrir una sesión nueva en esta carpeta.
```

## Plantilla de `current.md`

```markdown
# Sesión actual — rama `<rama>`

- **Feature / tarjeta:** <ID y título>
- **Rol:** <leader | implementer | sesión aparte>
- **Última actualización:** <YYYY-MM-DD HH:MM>

## Plan
- [x] <paso hecho>
- [ ] <paso pendiente>

## Bitácora
- <archivo tocado / decisión tomada — con el porqué que no está en el código>

## Lo que se probó y no anduvo
- <intento → por qué falló> (para que la sesión nueva no lo repita)

## Verificación
- <último verify.py corrido, nivel, resultado en una línea, @ hash>

## Tarjetas en vuelo
- <sdd/cards/H-2.md → handback pendiente / review pendiente>

## Próximo paso
<Lo PRIMERO que hace la sesión nueva. Concreto: archivo, función, comando o decisión pendiente.>
```

**No:** resumir la conversación entera, ni pegar salidas largas (comando + una línea de resultado alcanza). La sesión nueva arranca con: *«Leé `sdd/SDD-MASTER.md` y después `sdd/progress/<rama>/current.md`, y seguí desde el próximo paso.»* — en Claude Code, el hook de inicio se lo muestra solo.
