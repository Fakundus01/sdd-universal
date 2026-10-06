-- ============================================================================
-- Lo mínimo de Supabase que necesitan supabase/schema.sql y metricas.sql para
-- correr tal cual en un Postgres local (ADR-012). Idempotente.
--
-- No es Supabase: es la parte de la que dependen las políticas RLS. auth.uid()
-- lee los claims igual que en la nube, así que las políticas se comportan igual.
-- ============================================================================

create extension if not exists pgcrypto;

do $$ begin
  if not exists (select from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
end $$;

create schema if not exists auth;

create table if not exists auth.users (
  id                 uuid primary key default gen_random_uuid(),
  email              text not null unique,
  encrypted_password text not null,
  created_at         timestamptz not null default now()
);

create table if not exists auth.refresh_tokens (
  token      text primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  revoked    boolean not null default false,
  created_at timestamptz not null default now()
);

-- El servidor deja los claims del JWT en request.jwt.claims, como PostgREST.
create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(nullif(current_setting('request.jwt.claims', true), '')::json ->> 'sub', '')::uuid
$$;

create or replace function auth.role() returns text
language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true), '')::json ->> 'role'
$$;

-- Los roles pueden llamar a auth.uid() desde las políticas, pero no leer auth.users.
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid(), auth.role() to anon, authenticated;
revoke all on auth.users, auth.refresh_tokens from anon, authenticated;

-- Supabase da todos los permisos sobre public y deja que RLS decida. Igual acá:
-- si RLS falla, tiene que fallar en local también.
grant usage on schema public to anon, authenticated;
alter default privileges in schema public grant all on tables    to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
alter default privileges in schema public grant execute on functions to anon, authenticated;

-- Lo que ya existía de un arranque anterior no lo alcanzan los default
-- privileges. Va antes de los .sql del repo, así sus revoke quedan últimos.
grant all on all tables    in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;
