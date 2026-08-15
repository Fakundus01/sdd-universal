# _template.md · Formato estándar de un playbook

Un playbook es una receta paso a paso que el agente **sigue al pie de la letra en vez de re-descubrirla** (R24): ahorra tokens y errores. Las anotaciones `[NOVATO]` solo se leen si R23 está en modo novato.

```
BLOQUE: playbook · ID: <nombre> · CATEGORÍA: <infra|datos|herramientas|código> · NIVEL: novato+pro
TIEMPO: <estimado> · REQUISITOS: <qué hace falta antes> · RESULTADO: <qué queda funcionando>

## Pasos
1. <acción concreta, con el comando exacto si lo hay>
   [NOVATO] <explicación llana: qué es esto, dónde se hace clic/tipea>
2. …

## Verificación
- <cómo saber que salió bien, observable>

## Errores comunes
- <síntoma> → <causa> → <solución>

## Secretos (obligatorio si el playbook toca claves, tokens o conexiones)
- Qué va al `.env` y qué al `.env.example`, y confirmar que `.env` esté en `.gitignore` ANTES de generar la primera clave.
- Si alguna clave es pública a propósito, decirlo y explicar qué la protege en su lugar.

## Nota para agentes
Seguir literal. No re-derivar comandos. Si un paso falla dos veces, frenar y mostrar el error al humano (no improvisar). Versiones de herramientas: verificar con R19 si el playbook tiene más de ~6 meses.
```
