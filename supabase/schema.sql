-- ============================================================================
-- SDD Hub · esquema de Supabase
-- Se corre una sola vez desde SQL Editor → New query → Run.
-- Es idempotente: podés volver a correrlo sin romper nada.
-- Playbook: playbooks/supabase-auth.md
-- ============================================================================

-- ---------------------------------------------------------------------------
-- perfiles: una fila por usuario. auth.users es de Supabase y no se toca.
-- ---------------------------------------------------------------------------
create table if not exists public.perfiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  nombre      text,
  tema        text not null default 'dark' check (tema in ('dark', 'light')),
  nivel       text not null default 'PRO'  check (nivel in ('NOVATO', 'PRO')),
  creado_en   timestamptz not null default now()
);

comment on table  public.perfiles is 'Preferencias por usuario del catálogo SDD.';
comment on column public.perfiles.tema  is 'Tema elegido. El default del producto es oscuro.';
comment on column public.perfiles.nivel is 'NOVATO activa R23 (pensar-por-tres) en los prompts generados.';

-- ---------------------------------------------------------------------------
-- combinaciones: lo que arma cada persona en el combinador.
-- Las tecnologías van como arreglo de texto: son una lista de nombres del
-- catálogo, no entidades con vida propia. Una tabla aparte solo agregaría
-- joins sin resolver ningún problema real.
-- ---------------------------------------------------------------------------
create table if not exists public.combinaciones (
  id            uuid primary key default gen_random_uuid(),
  usuario_id    uuid not null references auth.users(id) on delete cascade,
  nombre        text not null check (char_length(nombre) between 1 and 80),
  tipo          text not null,
  stack         text not null default 'reco',
  nivel         text not null default 'PRO'      check (nivel in ('NOVATO', 'PRO')),
  perfil        text not null default 'ESTRICTO' check (perfil in ('ESTRICTO', 'CONFIANZA')),
  playbooks     text[] not null default '{}',
  tecnologias   text[] not null default '{}',
  creado_en     timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index if not exists combinaciones_usuario_idx
  on public.combinaciones (usuario_id, actualizado_en desc);

-- No dos combinaciones con el mismo nombre para la misma persona: al guardar
-- de nuevo se pisa la anterior (upsert) en vez de acumular duplicados.
create unique index if not exists combinaciones_usuario_nombre_idx
  on public.combinaciones (usuario_id, lower(nombre));

-- ---------------------------------------------------------------------------
-- RLS: sin esto, la clave pública deja leer los datos de todo el mundo.
-- Es el paso que no se puede saltear.
-- ---------------------------------------------------------------------------
alter table public.perfiles      enable row level security;
alter table public.combinaciones enable row level security;

drop policy if exists "perfil propio: leer"     on public.perfiles;
drop policy if exists "perfil propio: crear"    on public.perfiles;
drop policy if exists "perfil propio: editar"   on public.perfiles;

create policy "perfil propio: leer"   on public.perfiles
  for select using (auth.uid() = id);
create policy "perfil propio: crear"  on public.perfiles
  for insert with check (auth.uid() = id);
create policy "perfil propio: editar" on public.perfiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "combinaciones propias: leer"    on public.combinaciones;
drop policy if exists "combinaciones propias: crear"   on public.combinaciones;
drop policy if exists "combinaciones propias: editar"  on public.combinaciones;
drop policy if exists "combinaciones propias: borrar"  on public.combinaciones;

create policy "combinaciones propias: leer"   on public.combinaciones
  for select using (auth.uid() = usuario_id);
create policy "combinaciones propias: crear"  on public.combinaciones
  for insert with check (auth.uid() = usuario_id);
create policy "combinaciones propias: editar" on public.combinaciones
  for update using (auth.uid() = usuario_id) with check (auth.uid() = usuario_id);
create policy "combinaciones propias: borrar" on public.combinaciones
  for delete using (auth.uid() = usuario_id);

-- ---------------------------------------------------------------------------
-- El perfil se crea solo al registrarse, para que el front nunca tenga que
-- preguntarse si existe.
-- ---------------------------------------------------------------------------
create or replace function public.crear_perfil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists al_crear_usuario on auth.users;
create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function public.crear_perfil();

-- Mantiene actualizado_en sin que el front tenga que mandarlo.
create or replace function public.tocar_actualizado_en()
returns trigger language plpgsql as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$;

drop trigger if exists al_editar_combinacion on public.combinaciones;
create trigger al_editar_combinacion
  before update on public.combinaciones
  for each row execute function public.tocar_actualizado_en();
