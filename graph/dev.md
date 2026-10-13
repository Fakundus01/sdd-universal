---
id: dev
rutas: [dev/**]
hash: d43fe89d2f1bcd58070737985d39dbdc0640e1af5799b9cdd692f1b534e4ef3d
---

# dev

El entorno local sin nube (ADR-012): la web completa corriendo en la máquina, con login y base de
datos, sin depender de Supabase ni Vercel mientras se desarrolla.

- `dev.mjs` — arranca todo (`node dev/dev.mjs`); la primera vez crea la base y tres cuentas de
  prueba (`facundo@sdd.local` admin, `ana@sdd.local`/`beto@sdd.local` usuarias). Vive en `dev/.data/`,
  que no se commitea.
- `postgres.mjs` — levanta un Postgres propio (no Supabase) para correr contra el esquema real.
- `auth.mjs` / `rest.mjs` — un emulador liviano de la API de Supabase (auth + REST) para que el
  frontend hable con algo compatible sin cuenta en la nube.
- `servidor.mjs` — sirve la web en `http://127.0.0.1:4321/web/`.
- `supabase-local.sql` — el esquema aplicado a este Postgres local.
- `tests/` — suite E2E (`node --test dev/tests/*.test.mjs`) que corre contra este entorno.
