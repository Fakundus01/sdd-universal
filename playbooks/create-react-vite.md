BLOQUE: playbook · ID: create-react-vite · CATEGORÍA: código · NIVEL: novato+pro
TIEMPO: 10 min · REQUISITOS: Node.js LTS instalado · RESULTADO: proyecto React corriendo en tu navegador en `localhost:5173`

# Crear un proyecto React con Vite

## Pasos

1. Verificá Node: abrí la terminal y corré `node -v`. Tiene que responder una versión (idealmente LTS, número par).
   [NOVATO] Terminal en Windows: tecla Windows → escribí "PowerShell" → Enter. Si `node -v` da error, instalá Node desde `nodejs.org` (botón LTS), cerrá y reabrí la terminal.
2. Parate en tu carpeta de repos (R10): `cd C:\Users\<vos>\source\repos` (o la que uses).
3. Creá el proyecto: `npm create vite@latest mi-proyecto` → elegí **React** → elegí **JavaScript** (o **TypeScript** si tu SDD lo definió así).
   [NOVATO] Cuando la terminal te pregunte, te movés con las flechas y confirmás con Enter. "Vite" es la herramienta que arma y sirve el proyecto rapidísimo.
4. `cd mi-proyecto` → `npm install` (descarga las dependencias, tarda un toque la primera vez).
5. `npm run dev` → abrí en el navegador la dirección que te muestra (normalmente `http://localhost:5173`).
   [NOVATO] "localhost" significa "tu propia compu": la página solo la ves vos por ahora. Para frenar el servidor: `Ctrl+C` en la terminal.
6. El archivo para empezar a tocar es `src/App.jsx`. Guardá un cambio y mirá el navegador: se actualiza solo.
7. Para la versión final (cuando toque publicar): `npm run build` genera la carpeta `dist/` — eso es lo que se deploya (ver playbook `deploy-vercel`).

## Verificación

- `npm run dev` levanta sin errores rojos y la página muestra el logo de React+Vite.
- Cambiás un texto en `App.jsx`, guardás, y el navegador lo refleja al instante.

## Errores comunes

- **`npm` no se reconoce** → Node no está instalado o no reabriste la terminal después de instalarlo.
- **Error de versión de Node** → Vite pide Node moderno: actualizá desde `nodejs.org` (LTS).
- **Puerto 5173 ocupado** → Vite salta solo al 5174; usá la URL que muestre la terminal.
- **PowerShell bloquea scripts** → `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` una sola vez.

## Nota para agentes

Seguir literal; no cambiar Vite por otro bundler salvo que el SDD del proyecto lo diga. Inmediatamente después de crear el proyecto: correr playbook `env-setup` (Parte A pasos 2–3) y R02+R01 para el primer commit.
