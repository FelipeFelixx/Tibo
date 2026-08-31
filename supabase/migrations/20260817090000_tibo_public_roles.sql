-- ============================================================
-- TIBO — CARGOS PÚBLICOS
-- Etapa 1
--
-- IMPORTANTE:
-- platform_admins = acesso interno ao painel administrativo
-- tibo_user_roles = cargo público exibido no Tibo
-- ============================================================

create table if not exists public.tibo_user_roles (
  user_id uuid primary key
    references public.profiles(id)
    on delete cascade,

  role text not null
    check (
      role in (
        'founder',
        'manager',
        'admin',
        'moderator',
        'ambassador',
        'staff'
      )
    ),

  granted_by uuid
    references public.profiles(id)
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tibo_user_roles_role
  on public.tibo_user_roles(role);

alter table public.tibo_user_roles enable row level security;

-- ============================================================
-- LEITURA
-- O cargo público pode ser visto por usuários autenticados.
-- ============================================================

drop policy if exists "tibo roles public read" on public.tibo_user_roles;

create policy "tibo roles public read"
on public.tibo_user_roles
for select
to authenticated
using (true);

-- ============================================================
-- NINGUÉM pode inserir/alterar/excluir diretamente pelo cliente.
--
-- As alterações serão feitas somente por funções SECURITY DEFINER
-- com as permissões corretas.
-- ============================================================

revoke insert, update, delete
on public.tibo_user_roles
from authenticated;

-- ============================================================
-- FUNÇÃO PARA OBTER O CARGO PÚBLICO
-- ============================================================

create or replace function public.get_tibo_user_role(
  _user_id uuid
)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.tibo_user_roles
  where user_id = _user_id
  limit 1;
$$;

revoke all
on function public.get_tibo_user_role(uuid)
from public, anon;

grant execute
on function public.get_tibo_user_role(uuid)
to authenticated;

-- ============================================================
-- ALTERAÇÃO DE CARGO
-- SOMENTE OWNER DO TIBO ADMINISTRATIVO
-- ============================================================

create or replace function public.admin_set_tibo_user_role(
  _user_id uuid,
  _role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin

  if not exists (
    select 1
    from public.platform_admins
    where user_id = auth.uid()
      and role = 'owner'
  ) then
    raise exception 'Acesso de proprietário administrativo negado';
  end if;

  if _role not in (
    'founder',
    'manager',
    'admin',
    'moderator',
    'ambassador',
    'staff'
  ) then
    raise exception 'Cargo público inválido';
  end if;

  insert into public.tibo_user_roles (
    user_id,
    role,
    granted_by
  )
  values (
    _user_id,
    _role,
    auth.uid()
  )
  on conflict (user_id)
  do update set
    role = excluded.role,
    granted_by = auth.uid(),
    updated_at = now();

end;
$$;

revoke all
on function public.admin_set_tibo_user_role(uuid,text)
from public, anon;

grant execute
on function public.admin_set_tibo_user_role(uuid,text)
to authenticated;

-- ============================================================
-- REMOVER CARGO
-- SOMENTE OWNER
-- ============================================================

create or replace function public.admin_remove_tibo_user_role(
  _user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin

  if not exists (
    select 1
    from public.platform_admins
    where user_id = auth.uid()
      and role = 'owner'
  ) then
    raise exception 'Acesso de proprietário administrativo negado';
  end if;

  delete from public.tibo_user_roles
  where user_id = _user_id;

end;
$$;

revoke all
on function public.admin_remove_tibo_user_role(uuid)
from public, anon;

grant execute
on function public.admin_remove_tibo_user_role(uuid)
to authenticated;

comment on table public.tibo_user_roles is
'Tibo public user roles. Separate from platform_admins.';
