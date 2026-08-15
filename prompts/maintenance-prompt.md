# maintenance-prompt.md · Auditoría de mantenimiento (R19)

Usala cuando retomás un proyecto dormido, una vez por mes en proyectos activos, o cuando el agente la proponga solo (R19 se dispara si el git log muestra >30 días sin actividad).

```
Aplicá R19 sobre este repo: auditoría de mantenimiento.

1. Leé sdd/SDD-MASTER.md + costs.md + el git log completo reciente.
2. Detectá el stack real del código (lenguaje, frameworks, librerías
   con sus versiones en los archivos de dependencias).
3. Buscá en la web el estado actual de cada pieza: última versión
   estable, deprecaciones anunciadas, vulnerabilidades conocidas,
   cambios de pricing en la infra usada (costs.md).
4. Revisá la salud del repo: branches muertas, archivos gigantes,
   secretos fuera de .env, tests que ya no corren.
5. Presentame un PLAN DE ACTUALIZACIÓN priorizado:
   [crítico: seguridad] → [importante: deprecado] → [opcional: mejora]
   con esfuerzo estimado por ítem.
6. Esperá mi OK ítem por ítem. Con cada OK: actualizás código Y los
   MD afectados (design, costs, testing), corrés los tests, y lo
   registrás en el changelog como PATCH o MINOR según corresponda.

No actualices nada sin OK. Si todo está al día, decímelo y listo.
```
