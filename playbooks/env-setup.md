BLOQUE: playbook · ID: env-setup · CATEGORÍA: código · NIVEL: novato+pro
TIEMPO: 15 min · REQUISITOS: un proyecto (Python o Node) · RESULTADO: credenciales seguras, un `.env` por ambiente y entorno virtual armado

# Variables de entorno, credenciales y entornos virtuales

## Parte A · Los archivos .env

1. En la raíz del proyecto creá tres archivos:
   - `.env` → valores locales tuyos (tu máquina)
   - `.env.development` → valores del ambiente de desarrollo compartido
   - `.env.production` → valores reales de producción (este casi nunca vive en tu máquina: se carga en el hosting, ej. Vercel/servidor)
   [NOVATO] Un `.env` es un archivito de texto con pares `CLAVE=valor` (ej. `API_KEY=abc123`). Sirve para que las contraseñas no queden pegadas dentro del código.
2. Agregá **YA MISMO** esta línea a `.gitignore`: `.env*` y debajo `!.env.example` (R17: los secretos jamás se commitean).
3. Creá `.env.example` con las mismas claves pero SIN valores (`API_KEY=`). Este sí se commitea: es el mapa de qué claves necesita el proyecto.
4. Cargar los valores en el código:
   - **Node:** `npm install dotenv` → arriba de todo: `require('dotenv').config()` → usás `process.env.API_KEY`. (Vite: las claves deben empezar con `VITE_` y se leen con `import.meta.env.VITE_API_KEY` — y quedan visibles en el navegador: nunca pongas secretos reales en un front.)
   - **Python:** `pip install python-dotenv` → `from dotenv import load_dotenv; load_dotenv()` → `os.getenv("API_KEY")`.

## Parte B · Entorno virtual (Python)

5. En la raíz: `python -m venv .venv`
   [NOVATO] El entorno virtual es una cajita con las librerías de ESTE proyecto, para no ensuciar tu compu ni chocar con otros proyectos.
6. Activarlo — Windows: `.venv\Scripts\activate` · Mac/Linux: `source .venv/bin/activate`. Sabés que está activo porque aparece `(.venv)` al inicio de la línea.
7. Instalá dependencias con el entorno activo (`pip install …`) y congelalas: `pip freeze > requirements.txt` (este sí se commitea; `.venv/` va al `.gitignore`).
8. En Node el equivalente ya existe solo: `node_modules/` (al `.gitignore`) + `package.json`/`package-lock.json` (se commitean).

## Verificación

- `git status` NO muestra `.env` ni `.venv/` ni `node_modules/`.
- El proyecto corre en una carpeta recién clonada con solo: clonar → crear `.env` desde `.env.example` → instalar deps → correr.

## Errores comunes

- **"Funciona en mi máquina y en el server no"** → falta cargar una variable del `.env.example` en el hosting.
- **Subí una clave por accidente** → rotala YA (generá una nueva en el servicio): borrarla del código no alcanza, quedó en el historial de git.
- **PowerShell no deja activar el venv** → correr una vez: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

## Nota para agentes

Antes del primer commit de cualquier proyecto, verificar Parte A pasos 2–3 SIEMPRE (R17). Con R23-NOVATO: mostrar el contenido esperado de `.gitignore` y esperar confirmación.
