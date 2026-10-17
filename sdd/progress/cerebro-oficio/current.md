# Sesión actual — rama `cerebro-oficio`

> Mantenelo al día mientras trabajás. Si la sesión se corta o se limpia el contexto, la próxima arranca leyendo esto (plantilla completa: `prompts/relevo.md`).

- **Feature / tarjeta:** ninguna — conocimiento de oficio en el Cerebro, pedido por el owner
- **Rol:** sesión aparte (fuera de loop)
- **Última actualización:** 2026-10-17
- **Sale de `cerebro-demonio`**, no de `main`: comparte la sección 0.37.0 del changelog. Mergear esa primero.

## Plan
- Dos tipos de nota que se repitan entre proyectos, separados de lo que pasó en cada uno.
- Que se puedan **filtrar** (`--tipo patron`), que es lo que los hace distintos de un tag.
- ADR + test que fije el conjunto de tipos + la vista generada del lado del vault.

## Bitácora
- **El caso que lo disparó:** en `andres-bakery`, ADR-016 puso el giro de la tarjeta en el hover y
  ADR-022 lo reemplazó el mismo día por un clic en la foto («querés tocar el Agregar y pum, se da
  vuelta»). ADR-022 es una nota excelente —síntoma, medición antes/después, lo descartado— pero está
  guardada como decisión **de ese proyecto**: en el proyecto siguiente no la encuentra nadie.
  La captura ya funcionaba; lo que faltaba era que se transfiera.
- `notas.py`: `TIPOS` suma `patron` y `problema`. Compatible hacia atrás (las 190 notas siguen
  válidas). El resto del motor no se tocó: el `tipo` ya era un filtro de primera clase.
- `mcp_server.py`: las instrucciones que lee el agente ahora nombran los dos tipos de oficio.
- `importar-sdd` **no** los produce y no se tocó: de un `decisions.md` no se puede deducir si una
  decisión es de oficio o del proyecto. Entran a mano o por el MCP.

## Lo que se probó y no anduvo
- _nada todavía_

## Verificación
- `cerebro/tests` 265 OK (1 nuevo: `test_patron_y_problema_se_escriben_indexan_y_filtran`).
- El test que fija el conjunto de tipos pasó a llamarse `test_los_tipos` y sigue siendo la guarda:
  agregar uno es compatible, sacar uno invalidaría notas que ya existen.

## Tarjetas en vuelo
- ninguna

## Próximo paso
Del lado del vault (fuera de este repo): `generar_mapas.py` genera `Ideas-de-diseño.md`,
`Ideas-de-código.md` y `Problemas.md` a partir de estas notas, y el panel suma los dos tipos a su
filtro. La promoción de una ADR de proyecto a `patron` es un acto humano, a propósito (ADR-020).
