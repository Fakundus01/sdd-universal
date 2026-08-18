---
name: limpiar-repo
description: Auditoría de limpieza - archivos muertos, ramas viejas, dependencias sin uso y pesos raros. Propone, nunca borra sin OK. Usala cada tanto o al retomar un proyecto.
---

# Limpiar el repo (proponer, no borrar)

1. Relevá, sin tocar nada:
   - **archivos muertos**: nadie los importa ni los referencia (verificalo
     buscando usos, no por el nombre);
   - **ramas viejas**: mergeadas o sin commits en meses (`git branch
     --merged`, fechas de último commit);
   - **dependencias sin uso**: declaradas pero nunca importadas;
   - **pesos raros**: binarios grandes, carpetas de build commiteadas,
     `.env` o secretos que se colaron al historial (esto último es
     urgente, no limpieza).
2. Presentá la lista en dos columnas: **qué** y **por qué creés que
   sobra**, con la evidencia (dónde buscaste los usos).
3. **Esperá el OK ítem por ítem.** Nunca borres en lote porque «parecía
   todo muerto» — el archivo raro sin referencias a veces es el script
   de producción que corre por cron.
4. Lo aprobado se borra con git (recuperable), nunca con borrado
   permanente. Un commit por grupo, con el porqué en el mensaje.
