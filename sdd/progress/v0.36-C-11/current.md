# Sesión actual — rama `v0.36-C-11`

- **Feature / tarjeta:** C-11 (el ZIP de la web reescribe los links de los MD)
- **Rol:** implementer (MEDIO)
- **Última actualización:** entregado, ver `handback_C-11.md`

## Plan
- Test rojo con los tres ZIP reales; unitarios; `Paquete.reescribirLinks`/`enlazar`; visor sin `[` suelto; `?v=37`; mutantes.

## Verificación
- web tests 60/60, smoke PASS; `verify.py --quick` ROJO solo por «C-10 in_progress» (orden de despacho).
