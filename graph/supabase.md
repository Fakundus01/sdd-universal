---
id: supabase
rutas: [supabase/**]
hash: c8e1db6193e9930b28e8391c3a492a33658ed6572b48c597c0139ae97e8e8f7a
---

# supabase

El esquema de producción de la web del catálogo (proyecto `sdd-universal` en Supabase), aparte del
emulador local de `dev/` (ver `graph/dev.md`): esto es lo que corre de verdad en la nube cuando el
proyecto está activo.

- `schema.sql` — perfiles, cuentas, combinaciones guardadas y permisos (RLS); idempotente, se corre
  desde el SQL Editor (playbook `supabase-auth.md`). `auth.users` es de Supabase y no se toca.
- `metricas.sql` — la vista `metricas_30_dias` que alimenta el panel de outcomes (O1, O2, O4).

**Estado (ver `sdd/status.md` → Bloqueos):** el proyecto Supabase está pausado por decisión del
owner (2 proyectos gratis de la organización ya usados); al reactivarlo hay que volver a correr
ambos `.sql` ahí, porque los arreglos locales no se reflejaron en la nube.
