# Entorno local del SDD Hub

La web completa en tu máquina, con login y base de datos, sin Supabase ni Vercel (ADR-012).

```
node dev/dev.mjs
```

Abrí **http://127.0.0.1:4321/web/** y entrá con una de estas cuentas:

| Mail | Contraseña | Rol |
|---|---|---|
| `facundo@sdd.local` | `facundo-local` | admin (ve el panel de métricas) |
| `ana@sdd.local` | `ana-local` | usuaria |
| `beto@sdd.local` | `beto-local` | usuario |

Solo existen en `dev/.data/`, que no se commitea. Ctrl+C corta el servidor y el Postgres.

## Comandos

| Comando | Qué hace |
|---|---|
| `node dev/dev.mjs` | Arranca todo. La primera vez crea la base y las cuentas |
| `node dev/dev.mjs usuarios` | Lista las cuentas y cuántas combinaciones tiene cada una |
| `node dev/dev.mjs usuario <mail> <clave> [--admin]` | Crea una cuenta o le cambia la clave (no hay mails en local) |
| `node dev/dev.mjs parar` | Para el Postgres si quedó corriendo |
| `node dev/dev.mjs reset` | Borra la base local entera |
| `node --test "dev/tests/*.test.mjs"` | La suite: RLS con dos cuentas, auth y el servidor |

## Qué necesita

- **Node 22+** y los **binarios de Postgres** (`initdb`, `pg_ctl`, `psql`) en el PATH, o la carpeta en `SDD_PG_BIN`.
- Puertos libres: `4321` para la web y `54329` para Postgres (`SDD_PUERTO`, `SDD_PUERTO_PG`). No toca el Postgres que puedas tener en el 5432.

## Cómo funciona

Postgres corre `supabase/schema.sql` y `metricas.sql` **tal cual** en cada arranque, así que lo que pasa acá pasa en la nube. El servidor sirve el repo como Vercel y responde las llamadas de `web/sesion.js` a `/auth/v1` y `/rest/v1`. RLS la aplica Postgres, no el emulador. Detalle en `sdd/design.md` §8.
