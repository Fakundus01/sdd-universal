# Sesión actual — rama `v0.36-C-5`

- **Tarjeta:** C-5 (importar-sdd + deuda de C-2) · **Rol:** implementer (MEDIO)

## Plan
- Tests rojos contra la base 6c1a023 con stubs que importan; luego `cerebro/importar.py` y el subcomando.
- Criterio 7: `listar` con os.walk sin entrar en enlaces; `.roto` numerado.
- Corrida real en CEREBRO_DIR temporal, mutantes, handback.

## Verificación
- unittest cerebro: OK (99 tests). verify.py --changed: 1 FAIL previo (cita de `cerebro/requirements.txt` en la tarjeta C-2, fuera de zona).
