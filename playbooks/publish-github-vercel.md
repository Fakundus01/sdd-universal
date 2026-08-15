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

5. Seguí el playbook `deploy-vercel` importando el repo `sdd-universal`, con un ajuste en la config del proyecto:
   - **Framework Preset:** Other · **Root Directory:** `web` · Build Command y Output: vacíos (es HTML puro).
6. Deploy → tu catálogo queda en `sdd-universal.vercel.app` (o el nombre libre que te dé).
7. Desde ahora: cada vez que actualicemos el paquete y hagas `git add . && git commit -m "..." && git push`, la web se actualiza sola.

## Parte C · Que las cards descarguen de verdad

8. Los botones de la web apuntan a los MD del repo (`../SDD-MASTER.md`, `../playbooks/...`). En Vercel con root `web/` esos archivos quedan fuera del sitio, así que elegí una:
   - **Opción simple (recomendada):** en Vercel dejá Root Directory vacío (raíz del repo) — la web queda en `/web/` (ej. `sdd-universal.vercel.app/web/`) y TODOS los MD son descargables por URL directa.
   - **Opción prolija:** botones apuntando al raw de GitHub (`https://raw.githubusercontent.com/<usuario>/sdd-universal/main/SDD-MASTER.md`). Un buscar-y-reemplazar del prefijo en `index.html` y listo.

## Verificación

- El repo se ve completo en GitHub y la web abre desde el celular.
- El botón "SDD Universal" de la web descarga/abre el MD real.

## Errores comunes

- **`git push` rechazado (repo no vacío)** → creaste el repo con README: `git pull origin main --allow-unrelated-histories`, resolvé y pusheá de nuevo.
- **OneDrive molestando con archivos bloqueados** → cerrá apps que tengan archivos abiertos; si persiste, mover la carpeta fuera de OneDrive es la solución de fondo.
- **La web carga sin estilos** → estás sirviendo la carpeta equivocada: revisá Root Directory.

## Nota para agentes

Ejecutar con R01 activa: mostrar cada comando y esperar OK antes de correrlo (es el repo público del usuario). Con R23-NOVATO: un paso por mensaje.
