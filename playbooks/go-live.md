# go-live.md · Antes de desplegar: datos, capacidad y quién aprieta el botón

```
BLOQUE: playbook · ID: go-live · CATEGORÍA: infra · NIVEL: novato+pro
TIEMPO: 20–40 min la primera vez, ~10 después · REQUISITOS: harness.config.json con prod_readonly_query; acceso de solo lectura a prod
RESULTADO: un deploy que miró los datos reales, entra en la capacidad contratada, tiene monitoreo, y lo ejecutó (o aprobó) el humano (R32)
```

Nace de dos incidentes reales (S31): un cambio de lógica de negocio que iba a bloquear 14 suscripciones activas —lo atrapó una consulta de solo lectura, no el review del código— y una base en el tier más chico que se colgó por memoria al reactivar los jobs periódicos.

## Pasos

1. **Verificación completa en verde, re-ejecutada por el reviewer** (R30): `python harness/verify.py` @ el hash que se va a desplegar. Si hay `e2e` declarado, que haya corrido en verde contra ese hash — no contra uno anterior.
   [NOVATO] El «hash» es el código corto que identifica una versión exacta del proyecto (`git rev-parse --short HEAD`). Desplegar otro hash que el verificado es desplegar algo que nadie probó.
2. **Mirar los datos de producción (solo lectura).** Por cada regla de negocio que cambia, una consulta que cuente **a quién afecta**: «¿cuántas suscripciones activas quedarían bloqueadas con la regla nueva?». Se corre con `prod_readonly_query` y se pega la salida en el handback.
   [NOVATO] Solo lectura quiere decir un usuario de base que *no puede* modificar nada: aunque el agente se equivoque de comando, no rompe. Si no tenés ese usuario, crealo antes (o que lo haga quien administra la base).
3. **Si el número sorprende, frenar.** Afectar a más registros de los que la spec previó es un `DRIFT` (R25), no un detalle de deploy.
4. **Migraciones:** idempotentes, probadas contra una copia o un esquema igual al de prod, y con el plan para volver atrás escrito **antes** de correrlas. El esquema que deja la migración coincide con los modelos (check de drift, `harness.md` §5).
5. **Capacidad.** Si el deploy suma carga (jobs periódicos que se reactivan, una feature que multiplica consultas, más usuarios):
   - memoria y conexiones del plan actual de la base vs. lo que va a pedir el cambio;
   - cantidad de workers/jobs concurrentes × conexiones que abre cada uno ≤ límite de conexiones del plan;
   - si está cerca del límite, subir de tier **antes**, no después del cuelgue.
6. **Monitoreo encendido antes del deploy:** alertas de memoria, conexiones y errores 5xx, y saber dónde se miran los logs. Una alerta que se configura después del incidente llega tarde.
7. **El humano ejecuta o aprueba explícitamente** (R32): el merge a `prod_branch` o el comando `deploy` de `harness.config.json`. El agente prepara, verifica y muestra; no aprieta el botón.
8. **Después del deploy:** repetir la consulta del paso 2 y comparar con lo esperado. Anotar el resultado en el changelog (R13).

## Verificación
- Handback con: verify en verde @ hash desplegado, la consulta de datos con su salida, la cuenta de capacidad, y quién aprobó el deploy.
- A los 15–30 minutos: memoria y conexiones estables en el panel del proveedor, sin alertas.

## Errores comunes
- «El review del código no encontró nada» → el código estaba bien, los datos no eran los supuestos → paso 2 siempre, aunque el cambio parezca chico.
- La base se cuelga horas después del deploy → jobs reactivados que acumulan conexiones o memoria → paso 5 antes de reactivar jobs.
- El E2E «está en verde» pero nunca corrió → el workflow vive en una rama que no es la por defecto → paso 1: verificar la corrida contra el hash, no el badge.
- El agente intenta mergear a la rama de producción → bien que el permiso lo bloquee → la escritura en prod es del humano (R32), no se pelea el permiso.

## Costos
- Subir de tier la base es el costo más común de este playbook: anotarlo en `costs.md` con el antes y el después (R14).
- Monitoreo: los paneles de Supabase, Railway, Render, Fly.io y Vercel traen métricas de memoria y conexiones gratis; las alertas por mail suelen estar incluidas en el plan gratuito o el primero pago.

## Secretos
- La cadena de conexión de solo lectura va en `.env` (`PROD_RO_URL`) y su nombre, sin valor, en `.env.example`. Nunca la de escritura en la máquina del agente.

## Nota para agentes
Seguir literal. No re-derivar comandos. Si un paso falla dos veces, frenar y mostrar el error al humano (no improvisar). Nunca ejecutar `deploy` ni escribir en producción: preparar, verificar y pedir (R32).
