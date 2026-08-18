---
name: commit-prolijo
description: Arma el mensaje de commit desde el diff real - título imperativo, cuerpo con el porqué - y espera el OK antes de commitear. Usala al cerrar cada cambio.
---

# Commit prolijo

1. Mirá el diff real (`git diff --staged`, o `git diff` si no hay nada
   en stage) — el mensaje sale de lo que CAMBIÓ, no de lo que se
   intentó hacer.
2. Armá el mensaje:
   - **Título** (≤72 caracteres, imperativo): qué hace el commit.
   - **Cuerpo**: el porqué y lo no-obvio. Lo que el diff ya muestra no
     se repite.
3. Un commit = un cambio. Si el diff mezcla dos cosas sin relación,
   proponé separarlo en dos commits.
4. **Revisá el diff buscando secretos** (claves, tokens, .env) antes de
   commitear. Si aparece uno, frenás y avisás — ese commit no sale.
5. Mostrá el mensaje y el resumen del diff, y **esperá el OK** antes de
   `git commit`. Nunca `push --force` sin pedido explícito.
