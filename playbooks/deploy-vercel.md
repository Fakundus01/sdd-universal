BLOQUE: playbook · ID: deploy-vercel · CATEGORÍA: infra · NIVEL: novato+pro
TIEMPO: 15–20 min la primera vez · REQUISITOS: proyecto front en un repo de GitHub · RESULTADO: tu página online con URL propia `tuproyecto.vercel.app`, que se actualiza sola con cada push

# Deploy de un front en Vercel

## Pasos

1. Asegurate de que el proyecto esté subido a GitHub (si no, corré primero el playbook `git-basico` o `publish-github-vercel`).
   [NOVATO] GitHub es donde vive tu código en internet; Vercel es quien lo convierte en una página visitable. Se conectan una vez y después todo es automático.
2. Entrá a `vercel.com` → **Sign Up** → elegí **Continue with GitHub** y autorizá.
   [NOVATO] Usá la misma cuenta de GitHub del paso 1. El plan gratuito (Hobby) alcanza y sobra para empezar.
3. En el dashboard: **Add New… → Project** → aparece la lista de tus repos → **Import** en el repo del proyecto.
4. Vercel detecta el framework solo (Vite, Next, React…). No toques nada salvo que sepas por qué.
   - Si el front NO está en la raíz del repo: en **Root Directory** poné la carpeta (ej. `web/`).
5. Si tu app usa variables de entorno: **Environment Variables** → cargá cada clave de tu `.env` de producción (ver playbook `env-setup`). Nunca subas el `.env` al repo.
6. **Deploy** → esperá 1–2 minutos → te da la URL `tuproyecto.vercel.app`.
7. Desde ahora, cada `git push` a la rama principal redeploya solo. Las otras ramas generan URLs de preview.

## Verificación

- La URL abre tu página desde el celular (no solo desde tu compu).
- Hacé un cambio chico, `git push`, esperá 1 min y recargá: se ve el cambio.

## Errores comunes

- **Build failed** → abrí el log del deploy en Vercel: casi siempre es una dependencia que falta (`npm install` local y commiteá el `package-lock.json`) o una env variable no cargada.
- **Página en blanco con app React (SPA) al recargar una ruta** → agregá `vercel.json` con rewrite de todas las rutas a `/index.html`.
- **404 al importar** → el Root Directory no apunta a donde está el `package.json` (o el `index.html` si es estático puro).

## Costos

Hobby es gratis para proyectos personales (límites generosos de banda y builds). Se factura solo si pasás a plan Pro o metés funciones serverless pesadas. Alternativas gratuitas equivalentes: Netlify, Cloudflare Pages, GitHub Pages (solo estático).

## Nota para agentes

Seguir literal. Si un paso falla dos veces, frenar y mostrar el error al humano. Con R23-NOVATO: hacer un paso por mensaje y esperar confirmación de que lo ve en pantalla.
