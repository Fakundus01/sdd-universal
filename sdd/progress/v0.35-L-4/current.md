# v0.35-L-4 · current

Tarjeta: `sdd/cards/L-4.md` — smoke de la interfaz por CDP en el repo y en CI (cierra D2).

Plan:
- Servidor estático mínimo propio del smoke (dev/servidor.mjs exige Postgres al levantar), con las rutas reales `/web/<vista>` y una config de Supabase vacía (sin red).
- Chrome headless con `--remote-debugging-port=0` y `DevToolsActivePort`; CDP con el `WebSocket` nativo de Node.
- Pasos: generar, archivos y árbol, nivel, checkbox del arnés, vistas por ruta, descarga rápida («Proyectos», `Zip.descargar` interceptado); falla con excepciones o errores de consola.
- Job nuevo `smoke` en `.github/workflows/web.yml`.
- Rojo forzado con un `throw` en `combinador.js` (sin commitear) y handback.
