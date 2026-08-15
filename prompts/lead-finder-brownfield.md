# lead-finder-brownfield.md · Prompt a medida para tu buscador de prospectos

Para pegar en Claude Code (u otro agente) parado en el repo del proyecto, junto con el SDD-MASTER.

```
Adjunto el SDD-MASTER. Este repo existente NO tiene SDD. Aplicá R15
en modo FULL, perfil ESTRICTO, variante WEB.

Contexto del proyecto (lo que sé yo; verificalo contra el código):
- Es un buscador de prospectos para ofrecer páginas web a clientes.
- Pipeline actual: un buscador genera Excels con prospectos → este
  código toma esos Excels, parsea la información en crudo y la carga
  en la base de datos → queda la lista de clientes contactables.

Pasos:
1. Analizá el repo con subagentes económicos (R11): estructura,
   git log, estilo, dependencias. No toques código.
2. Generá sdd/ completo reflejando lo que EXISTE. Prestá especial
   atención a:
   - contracts.md: el contrato del pipeline — columnas/formato
     esperado del Excel de entrada, esquema de la tabla de destino,
     validaciones y qué pasa con filas inválidas o duplicadas.
   - security.md: sección de datos personales — qué campos de
     prospectos guardamos, de qué fuente salen, cuánto tiempo se
     retienen, y el recordatorio de cumplir la normativa de datos
     local antes de contactarlos.
   - status.md: las features reales con su % (parser, carga a DB,
     deduplicación, etc.) y qué está a medias.
   - costs.md: qué infra usa hoy (¿DB local o hosteada?) y
     alternativas free-tier si conviene.
3. Redactá la "prompt de arranque sintética" que reconstruye el
   contexto como si este proyecto hubiera nacido con SDD.
4. Presentame todo, esperá mi OK, commiteá los MD (R01).
5. Recién después: proponeme las 3 mejoras que más valor agregan
   (marcadas [MEJORA PROPUESTA], R03) y las trabajamos por ciclos
   con HANDBACK.
```
