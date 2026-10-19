# current — v0.37-L-9

Tarjeta: L-9 (ciclo.py no commitea donde no hay identidad de git).

Plan:
- Reproducir el rojo sin identidad (GIT_CONFIG_GLOBAL/SYSTEM a un archivo inexistente) contra la base b300044.
- support.py: identidad local al repo del fixture (git config user.* dentro del repo).
- test_no_commitea_en_rojo: con algo para commitear, afirmar que no hubo commit ni intento.
- ciclo.py: el mensaje del fallo lleva lo que devolvio git, sin adivinar la causa; test con hook que falla.
- Verde en el mismo entorno y verify.py completo.
