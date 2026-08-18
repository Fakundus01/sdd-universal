---
name: codigo-en-clases
description: Código orientado a objetos y modular - clases con una responsabilidad, archivos de 200-300 líneas, capas separadas. Usala al escribir o refactorizar código.
---

# Código en clases, modular

Al escribir o refactorizar código:

1. **POO siempre que el problema lo permita**: clases con UNA
   responsabilidad clara y nombre que la diga. Si no podés nombrar qué
   hace la clase en tres palabras, son dos clases.
2. **Archivos de ~200–300 líneas** (hasta ~400 si está justificado). Un
   archivo de 1000 líneas se divide en módulos — proponé el corte antes
   de que crezca.
3. **Capas separadas**: la lógica no conoce a la interfaz, la interfaz no
   habla con la base directo. Si un cambio de UI obliga a tocar lógica de
   negocio, la separación está rota — decilo.
4. **Sin comentarios redundantes** (nada de «# tirar dados» arriba de
   `tirar_dados()`): comentá solo el para qué de lo no-obvio.
5. Al refactorizar código ajeno, respetá el estilo del repo: la
   consistencia le gana a tu preferencia.
