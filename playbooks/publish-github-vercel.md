BLOQUE: playbook · ID: publish-github-vercel · CATEGORÍA: infra · NIVEL: novato+pro
TIEMPO: 20–30 min · REQUISITOS: la carpeta sdd completa (este paquete) + cuenta de GitHub · RESULTADO: el repositorio público del SDD online y la web del catálogo publicada en Vercel

# Publicar el SDD Universal: repo en GitHub + web en Vercel

Este playbook publica **este mismo paquete** para la comunidad. La web (`web/index.html`) es front puro: no necesita backend.

## Parte A · Subir el repo a GitHub

1. Entrá a `github.com` → **New repository** → nombre sugerido: `sdd-universal` → **Public** → sin README (ya tenemos uno) → **Create repository**.
2. Abrí la terminal en tu carpeta sdd: en el Explorador de Windows, andá a la carpeta `sdd` del Desktop → clic en la barra de dirección → escribí `powershell` → Enter.
3. Corré, una línea por vez (poné tu usuario donde dice `<usuario>`):
   ```
   git init
   git add .
   git commit -m "SDD Universal v0.4 - núcleo, playbooks, bloques y web"
   git branch -M main
   git remote add origin https://github.com/<usuario>/sdd-universal.git
   git push -u origin main
   ```
   [NOVATO] Si es tu primera vez con git, antes corré: `git config --global user.name "Tu Nombre"` y `git config --global user.email "tu@email.com"`. Si `git` no se reconoce, instalalo desde `git-scm.com` (todo Next) y reabrí la terminal. Al pushear, GitHub te va a pedir loguearte en una ventanita: aceptá.
4. Recargá la página del repo en GitHub: tienen que verse todos los archivos.

## Parte B · Publicar la web en Vercel

5. Seguí el playbook `deploy-vercel` importando el repo `sdd-universal`, con esta config exacta:
   - **Framework Preset:** Other
   - **Root Directory:** *vacío* (la raíz del repo) ← importante, ver Parte C
   - **Build Command / Install Command / Output Directory:** vacíos (es HTML puro, sin build)
6. Deploy → tu catálogo queda en `sdd-universal.vercel.app` (o el nombre libre que te dé).
7. Desde ahora: cada vez que actualicemos el paquete y hagas `git add . && git commit -m "..." && git push`, la web se actualiza sola.

## Parte C · Por qué el Root Directory va vacío (y qué hace `vercel.json`)

8. Los botones de la web apuntan a los MD del repo (`../SDD-MASTER.md`, `../playbooks/...`). Si en Vercel ponés Root Directory `web`, esos archivos quedan **fuera** del sitio y todas las descargas dan 404. Por eso se deploya la raíz completa y el archivo `vercel.json` del paquete se encarga del resto:
   - **Redirect `/` → `/web/`**: quien entra al dominio pelado cae directo en el catálogo, sin pantalla de "redirigiendo…".
   - **`Content-Type: text/markdown; charset=utf-8` en los `.md`**: los acentos y las ñ se ven bien en vez de aparecer como `Ã±`.
   - **`Cache-Control: must-revalidate`** en `.md` y en `web/`: cuando actualizás el paquete, la gente ve la versión nueva en el acto y no una cacheada de hace una semana.
   - **Headers de seguridad** (`nosniff`, `X-Frame-Options`, `Referrer-Policy`): básicos de higiene para un sitio público (R17).
   - **`.skill` como zip con `Content-Disposition: attachment`**: el skill de Claude se descarga en vez de intentar abrirse en el navegador.
9. `vercel.json` y `.vercelignore` ya vienen en el paquete: no hay que configurar nada a mano en el dashboard más allá del paso 5.

## Verificación

- El repo se ve completo en GitHub y la web abre desde el celular.
- Entrar al dominio pelado (`sdd-universal.vercel.app`) lleva al catálogo.
- El botón "SDD Universal" de la web descarga el MD real, con los acentos bien.
- `sdd-universal.vercel.app/SDD-MASTER.md` responde 200 (no 404).

## Errores comunes

- **`git push` rechazado (repo no vacío)** → creaste el repo con README: `git pull origin main --allow-unrelated-histories`, resolvé y pusheá de nuevo.
- **OneDrive molestando con archivos bloqueados** → cerrá apps que tengan archivos abiertos; si persiste, mover la carpeta fuera de OneDrive es la solución de fondo.
- **La web carga sin estilos** → estás sirviendo la carpeta equivocada: revisá que Root Directory esté vacío.
- **Las descargas dan 404** → mismo síntoma del punto anterior: pusiste `web` como Root Directory. Vaciálo y redeployá.
- **Los acentos se ven rotos al abrir un `.md`** → `vercel.json` no llegó al deploy: confirmá que está en la raíz del repo y commiteado.

## Nota para agentes

Ejecutar con R01 activa: mostrar cada comando y esperar OK antes de correrlo (es el repo público del usuario). Con R23-NOVATO: un paso por mensaje.
