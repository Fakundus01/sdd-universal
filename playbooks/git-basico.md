BLOQUE: playbook · ID: git-basico · CATEGORÍA: herramientas · NIVEL: novato
TIEMPO: 25 min la primera vez · REQUISITOS: una carpeta con archivos y ganas · RESULTADO: entendés qué es git, tenés tu proyecto versionado y sabés volver atrás sin miedo

# Git desde cero, sin miedo

## Qué es, con una analogía que sí sirve

Git es **el historial de versiones de tu proyecto**, como el "deshacer" de Word pero para toda la carpeta y para siempre.

La diferencia con guardar `proyecto_final_v2_ESTE_SI.zip`: git guarda **solo lo que cambió**, le pone tu comentario a cada cambio, y te deja volver a cualquier momento anterior sin perder nada de lo que vino después.

> **[NOVATO] Git ≠ GitHub.** Git es el programa que corre en tu compu. GitHub es una web donde podés guardar una copia de eso para que no se pierda y para compartirlo. Se puede usar git sin GitHub perfectamente.

## Las 4 palabras que hay que entender (y ninguna más, por ahora)

| Palabra | Qué es, en criollo |
|---|---|
| **repositorio** (repo) | Tu carpeta, pero con historial. Se crea una vez |
| **commit** | Una foto del proyecto en este momento, con un comentario tuyo. Es la unidad de todo |
| **staging** | La antesala: elegís qué cambios entran en la próxima foto |
| **remoto** | La copia que vive en GitHub |

El ciclo de todos los días es siempre el mismo: **cambiás archivos → elegís cuáles entran (`add`) → sacás la foto (`commit`) → la subís (`push`)**.

---

## Parte A · Instalarlo y presentarte (una sola vez en tu vida)

1. Bajá git de `git-scm.com` → **Download for Windows** → instalador → **Next** a todo. Los valores por defecto están bien.
2. Abrí una terminal en la carpeta de tu proyecto: en el Explorador, clic en la barra de dirección, escribí `powershell` y Enter.
3. Comprobá que quedó instalado:
   ```
   git --version
   ```
   Si dice un número, listo. Si dice que no reconoce el comando, **cerrá y reabrí la terminal** — es lo que le pasa a todo el mundo.
4. Decile quién sos. Esto va en cada commit que hagas:
   ```
   git config --global user.name "Tu Nombre"
   git config --global user.email "tu@email.com"
   ```
   [NOVATO] `--global` significa "para todos mis proyectos". Se hace una vez y nunca más.

---

## Parte B · Tu primer repositorio

5. Parada obligatoria antes de nada (R17): **creá el `.gitignore` primero.** Si usaste el catálogo del SDD, tu carpeta ya lo trae.
   ```
   notepad .gitignore
   ```
   Y adentro, como mínimo:
   ```
   .env
   node_modules/
   ```
   > **Por qué antes y no después:** git guarda historial. Si commiteás un archivo con una contraseña y lo borrás mañana, **la contraseña sigue en el historial** y cualquiera que clone el repo la puede leer. Sacarla de ahí es reescribir la historia del proyecto — mucho más difícil que ponerlo antes.

6. Convertí la carpeta en repositorio:
   ```
   git init
   ```
   No pasa nada visible: se creó una carpeta oculta `.git` con el historial. Eso es todo.

7. Mirá qué ve git:
   ```
   git status
   ```
   [NOVATO] **`git status` es tu mejor amigo.** Ante cualquier duda, corrélo: te dice en qué estado está todo y qué te conviene hacer. No rompe nada, solo mira.

8. Elegí qué entra en la primera foto y sacala:
   ```
   git add .
   git commit -m "Primer commit: estructura del proyecto"
   ```
   [NOVATO] El `.` de `git add .` significa "todos los cambios". El texto del `-m` es tu comentario: escribí **qué cambiaste**, que tu yo de dentro de tres meses lo va a agradecer.

9. Mirá tu historial:
   ```
   git log --oneline
   ```
   Una línea por commit. Si te queda la pantalla trabada mostrando el historial, salí con **`q`**.

---

## Parte C · El día a día

Esto es el 90% de tu uso de git, para siempre:

```
git status                          ver cómo viene la mano
git add .                           preparar todos los cambios
git commit -m "qué hice"            sacar la foto
git push                            subirlo a GitHub (si tenés remoto)
```

**¿Cada cuánto commitear?** Cada vez que terminás algo que funciona. No al final del día: al final de *una cosa*. Un commit que dice "cambios varios" no sirve para volver atrás, que es justamente para lo que existe.

Si trabajás con el SDD, el agente te propone el commit y espera tu OK (regla R01) — así que este ciclo lo vas a ver, aunque no lo escribas vos.

---

## Parte D · Deshacer cosas (la parte que da miedo y no debería)

| Lo que querés | El comando |
|---|---|
| Ver qué cambié y todavía no commiteé | `git diff` |
| **Descartar** los cambios de un archivo y volver a como estaba | `git restore archivo.txt` |
| Sacar un archivo del staging (me arrepentí del `add`) | `git restore --staged archivo.txt` |
| Cambiar el mensaje del último commit | `git commit --amend -m "mensaje nuevo"` |
| Volver a ver cómo estaba todo en un commit viejo | `git checkout <hash>` y para volver: `git switch -` |

> **La regla que te salva:** todo lo que ya está **commiteado** se puede recuperar. Lo que nunca commiteaste, no. Por eso conviene commitear seguido: es tu red de seguridad.
>
> ⚠️ El único que borra de verdad es `git reset --hard`: **tira a la basura los cambios no commiteados y no hay vuelta atrás**. Si no estás seguro, no lo uses. Casi siempre lo que buscabas era `git restore`.

---

## Parte E · Conectarlo a GitHub (opcional)

Si querés una copia online o compartirlo, seguí el playbook [`publish-github-vercel`](publish-github-vercel.md), que va paso a paso desde acá.

En resumen: creás el repo vacío en GitHub, y después:
```
git remote add origin https://github.com/<usuario>/<repo>.git
git branch -M main
git push -u origin main
```
De ahí en más, `git push` a secas alcanza.

---

## Ramas: qué son y cuándo te van a importar

Una **rama** es una línea de trabajo paralela: probás algo sin tocar lo que funciona, y si sale bien lo unís.

```
git switch -c mi-prueba      crear una rama y moverme a ella
git switch main              volver a la principal
git merge mi-prueba          traer lo de la rama a main
```

**Si estás solo y recién arrancás, no las necesitás.** Trabajá en `main` y listo. Empiezan a valer cuando sos más de uno, o cuando querés probar algo grande sin romper lo que anda. Que no te hagan sentir que estás haciendo las cosas mal por no usarlas.

---

## Verificación

- `git log --oneline` muestra tus commits.
- Tocás un archivo, `git status` lo marca como modificado.
- `git restore` sobre ese archivo lo deja como estaba.
- `git status` **no** muestra tu `.env` en ningún momento. Si aparece, revisá el `.gitignore` antes de seguir.

## Errores comunes

- **`git` no se reconoce como comando** → no reabriste la terminal después de instalar. Cerrala y abrila de nuevo.
- **"Please tell me who you are"** → falta el paso 4.
- **Commiteaste el `.env` sin querer** → sacarlo del repo con `git rm --cached .env`, agregarlo al `.gitignore` y commitear. **Y rotar la clave igual**: sigue en el historial.
- **`fatal: not a git repository`** → estás en otra carpeta, o falta `git init`.
- **Se abrió un editor raro que no sabés cerrar** (vim) → `Esc`, después `:wq` y Enter. Para evitarlo: usá siempre `-m "mensaje"` en el commit.
- **La terminal queda trabada mostrando el log** → `q`.
- **`git push` rechazado** → alguien subió algo antes: `git pull` primero, resolvés si hay choque, y pusheás.

## Nota para agentes

Con R23-NOVATO: **un comando por mensaje**, esperando que la persona confirme que ve lo mismo en pantalla. Antes de cualquier comando destructivo (`reset --hard`, `checkout` de archivos, borrar ramas) aplicar pensar-por-tres y explicar en criollo qué se pierde. Nunca correr `git push --force` en un repo compartido. R01 sigue mandando: mostrar el diff y esperar el OK antes de commitear.
