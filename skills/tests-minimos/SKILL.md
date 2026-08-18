---
name: tests-minimos
description: El set mínimo de tests que vale la pena para el código que acabás de tocar - pocos, de alto valor, sin relleno. Usala después de implementar algo.
---

# Tests mínimos que valen

1. Testeá **lo que tocaste**, no el repo entero: la función nueva, el
   camino que cambió, el bug que acabás de arreglar (ese test evita que
   vuelva).
2. Elegí pocos casos de **alto valor**:
   - el caso feliz típico (uno alcanza);
   - los bordes que muerden: vacío, null, cero, negativo, duplicado,
     el límite exacto;
   - el caso de error: qué pasa cuando la entrada es basura.
3. **Nada de relleno**: tests que solo suben cobertura sin poder fallar
   por un bug real no van. Un test que nunca puede fallar es peor que
   no tenerlo — da confianza falsa.
4. Cada test con nombre que diga qué rompe si falla
   (`test_rechaza_turno_fuera_de_horario`, no `test_2`).
5. Corré los tests y mostrá el resultado real. «Deberían pasar» no
   existe: pasan o no pasan.
