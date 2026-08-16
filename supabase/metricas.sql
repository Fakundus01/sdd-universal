-- ============================================================================
-- SDD Hub · métricas anónimas
-- Se corre una sola vez desde SQL Editor → New query → Run. Es idempotente.
--
-- DECISIÓN DE DISEÑO (sdd/spec.md §3: "sin analytics de terceros"):
-- esta tabla NO identifica a nadie. Sin usuario, sin IP, sin user-agent, sin
-- cookie, sin sesión. Solo qué pasó y qué día. Con eso alcanza para contestar
-- "qué se descarga" y "qué combinaciones se arman", que es lo que se quería
-- saber — y no activa el nivel N2 de seguridad.md, porque no hay datos
-- personales que proteger.
--
-- La fecha se guarda por DÍA, no con hora: una marca de tiempo exacta más el
-- detalle del evento puede reidentificar a una persona si hay poco tráfico.
-- ============================================================================

create table if not exists public.eventos (
  id       bigserial primary key,
  tipo     text not null check (tipo in ('visita','descarga','combinacion','paquete')),
  detalle  text not null default '' check (char_length(detalle) <= 120),
  dia      date not null default (now() at time zone 'utc')::date
);

comment on table  public.eventos is 'Contadores anónimos. Prohibido agregar columnas que identifiquen a alguien.';
comment on column public.eventos.detalle is 'Qué se descargó o qué tipo de proyecto se combinó. Nunca texto libre del usuario.';

create index if not exists eventos_dia_idx  on public.eventos (dia desc);
create index if not exists eventos_tipo_idx on public.eventos (tipo, detalle);

-- ---------------------------------------------------------------------------
-- Marca de admin en el perfil. Se prende a mano desde el Table Editor:
-- no hay ninguna ruta desde la aplicación para volverse admin.
-- ---------------------------------------------------------------------------
alter table public.perfiles add column if not exists admin boolean not null default false;

-- ---------------------------------------------------------------------------
-- RLS: cualquiera puede SUMAR un evento, nadie puede LEERLOS salvo un admin.
-- Es la asimetría que hace que esto sea seguro: la clave pública sirve para
-- contar, no para mirar.
-- ---------------------------------------------------------------------------
alter table public.eventos enable row level security;

drop policy if exists "eventos: cualquiera suma"   on public.eventos;
drop policy if exists "eventos: solo admin lee"    on public.eventos;

create policy "eventos: cualquiera suma" on public.eventos
  for insert to anon, authenticated with check (true);

create policy "eventos: solo admin lee" on public.eventos
  for select using (
    exists (select 1 from public.perfiles p where p.id = auth.uid() and p.admin)
  );

-- ---------------------------------------------------------------------------
-- Vistas agregadas para el panel. Se consultan igual con RLS de por medio:
-- la política de arriba se aplica al leer `eventos`, así que un no-admin ve
-- vacío también acá.
-- ---------------------------------------------------------------------------
create or replace view public.metricas_resumen
with (security_invoker = true) as
  select tipo, detalle, count(*)::bigint as total, max(dia) as ultimo
  from public.eventos
  group by tipo, detalle;

create or replace view public.metricas_por_dia
with (security_invoker = true) as
  select dia, tipo, count(*)::bigint as total
  from public.eventos
  group by dia, tipo;

-- ---------------------------------------------------------------------------
-- Retención: los eventos viejos no aportan y acumularlos para siempre
-- contradice la minimización. Se borra lo de más de 18 meses.
-- Correr a mano cada tanto, o programar con pg_cron si algún día hace falta.
-- ---------------------------------------------------------------------------
create or replace function public.limpiar_eventos_viejos()
returns integer language plpgsql security definer set search_path = public as $$
declare borrados integer;
begin
  delete from public.eventos where dia < current_date - interval '18 months';
  get diagnostics borrados = row_count;
  return borrados;
end;
$$;

-- ---------------------------------------------------------------------------
-- v0.18: se suma el tipo 'perfil' — las respuestas del onboarding, agregadas
-- y anonimas (nivel:NOVATO, interes:webapp, agente:claude...). Permite saber
-- QUE clase de gente llega, nunca quien. Volver a correr este archivo alcanza.
-- ---------------------------------------------------------------------------
alter table public.eventos drop constraint if exists eventos_tipo_check;
alter table public.eventos add constraint eventos_tipo_check
  check (tipo in ('visita','descarga','combinacion','paquete','perfil'));
