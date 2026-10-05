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

-- v0.32: «no hay ninguna ruta para volverse admin» no era cierto. La política
-- «perfil propio: editar» deja a cada uno editar SU fila entera, admin incluida,
-- y Supabase da UPDATE sobre toda la tabla: un PATCH {admin:true} a tu propio
-- perfil alcanzaba. RLS decide qué filas; qué columnas lo deciden los permisos.
-- Por eso se edita solo lo que la web manda, y el perfil lo crea el trigger.
revoke insert, update on public.perfiles from anon, authenticated;
grant update (nombre, tema, nivel, perfil_sdd, agente, interes, onboarding)
  on public.perfiles to authenticated;

-- ---------------------------------------------------------------------------
-- RLS: cualquiera puede SUMAR un evento, nadie puede LEERLOS salvo un admin.
-- Es la asimetría que hace que esto sea seguro: la clave pública sirve para
-- contar, no para mirar.
-- ---------------------------------------------------------------------------
alter table public.eventos enable row level security;

drop policy if exists "eventos: cualquiera suma"   on public.eventos;
drop policy if exists "eventos: solo admin lee"    on public.eventos;

-- v0.33.2 (R1 de la review): Supabase da INSERT sobre TODAS las columnas, así
-- que un anónimo podía elegir el `id` y ocupar números por delante de la
-- secuencia: el contador legítimo que caía ahí daba 409 y se perdía en
-- silencio. Ahora solo se insertan `tipo` y `detalle`; `id` y `dia` los pone
-- la base. La política de abajo queda como segunda capa para `dia`.
revoke insert on public.eventos from anon, authenticated;
grant insert (tipo, detalle) on public.eventos to anon, authenticated;

-- El día lo pone la base (v0.33, M4): con `with check (true)` se podía
-- mandar dia = 2099 y la vista de 30 días lo contaba para siempre.
create policy "eventos: cualquiera suma" on public.eventos
  for insert to anon, authenticated
  with check (dia = (now() at time zone 'utc')::date);

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

-- ---------------------------------------------------------------------------
-- v0.33 (D3): el reporte de outcomes del panel. O4 («entra desde el celular»)
-- necesita saber si la visita vino de un celular, y eso se guarda como una
-- CLASE GRUESA pegada al detalle de la visita: «#/combinador|movil» o
-- «/web/|escritorio». Nunca el user-agent, ni el modelo, ni el tamaño exacto
-- de pantalla: dos valores posibles no distinguen a nadie, un user-agent sí.
-- La web la calcula con matchMedia("(pointer: coarse)"), sin leer el agente.
--
-- v0.33, review R30 (M4): el primer check solo miraba lo que iba DESPUÉS de
-- una barra, y la política de alta era `with check (true)`: con la clave
-- pública se podía guardar «juan.perez@gmail.com DNI 30123456» como visita, o
-- una visita con dia = 2099 que la vista contaba para siempre. Ahora:
--   · el detalle tiene un formato cerrado POR TIPO (abajo): rutas, nombres de
--     archivo e ids cortos de [A-Za-z0-9._/-]. Sin espacios, sin «@», sin
--     saltos de línea y con largo acotado. Un slug corto igual podría ser un
--     nombre («juanperez»): lo que se garantiza es que no entra texto libre,
--     no que sea imposible abusar de un campo de 30 letras;
--   · el día lo pone la base: la política de alta (arriba) exige dia = hoy (UTC);
--   · la vista de 30 días además acota dia <= hoy.
-- NOT VALID: las filas viejas no se revisan (las visitas de antes de 0.33 no
-- tienen clase y no se pierden); todo INSERT nuevo sí.
-- ---------------------------------------------------------------------------
alter table public.eventos drop constraint if exists eventos_detalle_visita_check;
alter table public.eventos drop constraint if exists eventos_detalle_formato_check;
alter table public.eventos add constraint eventos_detalle_formato_check check (
  case tipo
    when 'visita'      then detalle ~ '^((/[A-Za-z0-9._/-]{0,80}|#/[a-z]{1,20})\|(movil|escritorio)|md:[A-Za-z0-9._-]{1,80})$'
    when 'descarga'    then detalle ~ '^[A-Za-z0-9._-]{1,60}$'
    when 'combinacion' then detalle ~ '^[a-z0-9-]{1,30}/[a-z0-9-]{1,20}/(NOVATO|PRO)/(nuevo|brownfield)$'
    when 'paquete'     then detalle ~ '^(sueltos|skills|(proyecto|rapido):[a-z0-9-]{1,30})$'
    when 'perfil'      then detalle ~ '^(nivel|interes|agente):[A-Za-z0-9-]{1,30}$'
    else false
  end) not valid;


-- Los últimos 30 días (hoy incluido), por tipo y detalle: lo que lee el
-- reporte de O1, O2 y O4. Misma RLS que el resto: un no-admin ve vacío.
create or replace view public.metricas_30_dias
with (security_invoker = true) as
  select tipo, detalle, count(*)::bigint as total
  from public.eventos
  where dia >  (now() at time zone 'utc')::date - 30
    and dia <= (now() at time zone 'utc')::date
  group by tipo, detalle;
