-- Tibo Support Tickets
-- Estrutura inicial de atendimento e suporte administrativo.

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references public.profiles(id)
    on delete cascade,

  assigned_to uuid
    references public.profiles(id)
    on delete set null,

  category text not null default 'general'
    check (category in (
      'general',
      'account',
      'security',
      'reports',
      'technical',
      'business',
      'ads',
      'shop',
      'other'
    )),

  subject text not null
    check (char_length(trim(subject)) between 3 and 160),

  description text not null
    check (char_length(trim(description)) between 3 and 5000),

  status text not null default 'open'
    check (status in (
      'open',
      'in_progress',
      'waiting_user',
      'resolved',
      'closed'
    )),

  priority text not null default 'normal'
    check (priority in (
      'low',
      'normal',
      'high',
      'urgent'
    )),

  internal_notes text,
  resolution text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists idx_support_tickets_user
  on public.support_tickets(user_id, created_at desc);

create index if not exists idx_support_tickets_status
  on public.support_tickets(status, created_at desc);

create index if not exists idx_support_tickets_assigned
  on public.support_tickets(assigned_to, status, created_at desc);

create index if not exists idx_support_tickets_priority
  on public.support_tickets(priority, created_at desc);

alter table public.support_tickets enable row level security;

revoke all on public.support_tickets from anon;
revoke all on public.support_tickets from authenticated;

grant select, insert on public.support_tickets to authenticated;

-- Usuário pode consultar somente os próprios chamados.
drop policy if exists "users read own support tickets"
on public.support_tickets;

create policy "users read own support tickets"
on public.support_tickets
for select
to authenticated
using (user_id = auth.uid());

-- Usuário pode abrir chamado somente em seu próprio nome.
drop policy if exists "users create own support tickets"
on public.support_tickets;

create policy "users create own support tickets"
on public.support_tickets
for insert
to authenticated
with check (user_id = auth.uid());

-- Atualização administrativa ocorre somente através das funções SECURITY DEFINER.
revoke update, delete on public.support_tickets from authenticated;

-- ============================================================
-- Função: usuário cria chamado
-- ============================================================

create or replace function public.create_support_ticket(
  _category text,
  _subject text,
  _description text,
  _priority text default 'normal'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado';
  end if;

  if _category not in (
    'general',
    'account',
    'security',
    'reports',
    'technical',
    'business',
    'ads',
    'shop',
    'other'
  ) then
    raise exception 'Categoria inválida';
  end if;

  if _priority not in ('low','normal','high','urgent') then
    raise exception 'Prioridade inválida';
  end if;

  insert into public.support_tickets (
    user_id,
    category,
    subject,
    description,
    priority
  )
  values (
    auth.uid(),
    _category,
    trim(_subject),
    trim(_description),
    _priority
  )
  returning id into new_id;

  return new_id;
end;
$$;

revoke all on function public.create_support_ticket(
  text,
  text,
  text,
  text
) from public, anon;

grant execute on function public.create_support_ticket(
  text,
  text,
  text,
  text
) to authenticated;

-- ============================================================
-- Função: usuário lista próprios chamados
-- ============================================================

create or replace function public.list_my_support_tickets()
returns table (
  id uuid,
  category text,
  subject text,
  description text,
  status text,
  priority text,
  resolution text,
  created_at timestamptz,
  updated_at timestamptz,
  resolved_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    t.id,
    t.category,
    t.subject,
    t.description,
    t.status,
    t.priority,
    t.resolution,
    t.created_at,
    t.updated_at,
    t.resolved_at
  from public.support_tickets t
  where t.user_id = auth.uid()
  order by t.created_at desc;
$$;

revoke all on function public.list_my_support_tickets()
from public, anon;

grant execute on function public.list_my_support_tickets()
to authenticated;

-- ============================================================
-- Função administrativa: listar chamados
-- ============================================================

create or replace function public.admin_list_support_tickets(
  _status text default 'all'
)
returns table (
  id uuid,
  user_id uuid,
  username text,
  display_name text,
  assigned_to uuid,
  assigned_username text,
  assigned_display_name text,
  category text,
  subject text,
  description text,
  status text,
  priority text,
  internal_notes text,
  resolution text,
  created_at timestamptz,
  updated_at timestamptz,
  resolved_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin(auth.uid()) then
    raise exception 'Acesso administrativo negado';
  end if;

  if _status not in (
    'all',
    'open',
    'in_progress',
    'waiting_user',
    'resolved',
    'closed'
  ) then
    raise exception 'Status inválido';
  end if;

  return query
  select
    t.id,
    t.user_id,
    p.username,
    trim(coalesce(p.nome,'') || ' ' || coalesce(p.sobrenome,'')),
    t.assigned_to,
    ap.username,
    trim(coalesce(ap.nome,'') || ' ' || coalesce(ap.sobrenome,'')),
    t.category,
    t.subject,
    t.description,
    t.status,
    t.priority,
    t.internal_notes,
    t.resolution,
    t.created_at,
    t.updated_at,
    t.resolved_at
  from public.support_tickets t
  join public.profiles p
    on p.id = t.user_id
  left join public.profiles ap
    on ap.id = t.assigned_to
  where _status = 'all'
     or t.status = _status
  order by
    case t.priority
      when 'urgent' then 0
      when 'high' then 1
      when 'normal' then 2
      else 3
    end,
    t.created_at desc;
end;
$$;

revoke all on function public.admin_list_support_tickets(text)
from public, anon;

grant execute on function public.admin_list_support_tickets(text)
to authenticated;

-- ============================================================
-- Função administrativa: atualizar chamado
-- ============================================================

create or replace function public.admin_update_support_ticket(
  _ticket_id uuid,
  _status text,
  _priority text default null,
  _internal_notes text default null,
  _resolution text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin(auth.uid()) then
    raise exception 'Acesso administrativo negado';
  end if;

  if _status not in (
    'open',
    'in_progress',
    'waiting_user',
    'resolved',
    'closed'
  ) then
    raise exception 'Status inválido';
  end if;

  if _priority is not null
     and _priority not in ('low','normal','high','urgent') then
    raise exception 'Prioridade inválida';
  end if;

  update public.support_tickets
  set
    status = _status,
    priority = coalesce(_priority, priority),
    internal_notes = case
      when _internal_notes is null then internal_notes
      else nullif(trim(_internal_notes), '')
    end,
    resolution = case
      when _resolution is null then resolution
      else nullif(trim(_resolution), '')
    end,
    resolved_at = case
      when _status in ('resolved','closed') then coalesce(resolved_at, now())
      else null
    end,
    updated_at = now()
  where id = _ticket_id;

  if not found then
    raise exception 'Chamado não encontrado';
  end if;
end;
$$;

revoke all on function public.admin_update_support_ticket(
  uuid,
  text,
  text,
  text,
  text
) from public, anon;

grant execute on function public.admin_update_support_ticket(
  uuid,
  text,
  text,
  text,
  text
) to authenticated;

-- ============================================================
-- Função administrativa: atribuir chamado
-- ============================================================

create or replace function public.admin_assign_support_ticket(
  _ticket_id uuid,
  _assigned_to uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin(auth.uid()) then
    raise exception 'Acesso administrativo negado';
  end if;

  if _assigned_to is not null
     and not exists (
       select 1
       from public.platform_admins
       where user_id = _assigned_to
     ) then
    raise exception 'Usuário não pertence à equipe administrativa';
  end if;

  update public.support_tickets
  set
    assigned_to = _assigned_to,
    updated_at = now()
  where id = _ticket_id;

  if not found then
    raise exception 'Chamado não encontrado';
  end if;
end;
$$;

revoke all on function public.admin_assign_support_ticket(
  uuid,
  uuid
) from public, anon;

grant execute on function public.admin_assign_support_ticket(
  uuid,
  uuid
) to authenticated;

-- ============================================================
-- updated_at
-- ============================================================

drop trigger if exists support_tickets_updated_at
on public.support_tickets;

create trigger support_tickets_updated_at
before update on public.support_tickets
for each row
execute function public.update_updated_at_column();

comment on table public.support_tickets is
'Tibo user support tickets and administrative atendimento.';
