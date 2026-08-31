-- ============================================================
-- TIBO — CENTRAL DE MODERAÇÃO DA PLATAFORMA
-- ============================================================
-- Não substitui post_reports, comment_reports ou community_reports.
-- Esta tabela acompanha administrativamente cada denúncia.
-- ============================================================

create table if not exists public.moderation_cases (
  id uuid primary key default gen_random_uuid(),

  report_type text not null
    check (report_type in ('post', 'comment', 'community')),

  report_id uuid not null,

  status text not null default 'pending'
    check (status in ('pending', 'under_review', 'resolved', 'dismissed')),

  assigned_to uuid
    references public.profiles(id)
    on delete set null,

  decision text
    check (
      decision is null
      or decision in (
        'no_action',
        'content_removed',
        'content_restricted',
        'account_restricted',
        'account_suspended',
        'account_banned',
        'community_action',
        'other'
      )
    ),

  internal_notes text
    check (
      internal_notes is null
      or char_length(internal_notes) <= 5000
    ),

  created_at timestamptz not null default now(),

  reviewed_at timestamptz,

  updated_at timestamptz not null default now(),

  unique (report_type, report_id)
);

create index if not exists idx_moderation_cases_status
  on public.moderation_cases(status);

create index if not exists idx_moderation_cases_assigned_to
  on public.moderation_cases(assigned_to);

create index if not exists idx_moderation_cases_created_at
  on public.moderation_cases(created_at desc);

create index if not exists idx_moderation_cases_type_report
  on public.moderation_cases(report_type, report_id);

alter table public.moderation_cases enable row level security;

revoke all on public.moderation_cases from anon;
revoke all on public.moderation_cases from authenticated;

grant select, insert, update on public.moderation_cases to authenticated;

-- ============================================================
-- RLS
-- Somente administradores da plataforma podem acessar.
-- ============================================================

drop policy if exists "Platform admins read moderation cases"
on public.moderation_cases;

create policy "Platform admins read moderation cases"
on public.moderation_cases
for select
to authenticated
using (
  public.is_platform_admin(auth.uid())
);

drop policy if exists "Platform admins create moderation cases"
on public.moderation_cases;

create policy "Platform admins create moderation cases"
on public.moderation_cases
for insert
to authenticated
with check (
  public.is_platform_admin(auth.uid())
);

drop policy if exists "Platform admins update moderation cases"
on public.moderation_cases;

create policy "Platform admins update moderation cases"
on public.moderation_cases
for update
to authenticated
using (
  public.is_platform_admin(auth.uid())
)
with check (
  public.is_platform_admin(auth.uid())
);

-- ============================================================
-- UPDATED_AT
-- ============================================================

create or replace function public.update_moderation_case_timestamp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists moderation_cases_updated_at
on public.moderation_cases;

create trigger moderation_cases_updated_at
before update on public.moderation_cases
for each row
execute function public.update_moderation_case_timestamp();

-- ============================================================
-- CRIAÇÃO AUTOMÁTICA DE CASO DE MODERAÇÃO
-- ============================================================

create or replace function public.create_moderation_case(
  _report_type text,
  _report_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_case_id uuid;
begin

  if not public.is_platform_admin(auth.uid()) then
    raise exception 'Acesso administrativo negado';
  end if;

  if _report_type not in ('post', 'comment', 'community') then
    raise exception 'Tipo de denúncia inválido';
  end if;

  if _report_id is null then
    raise exception 'ID da denúncia obrigatório';
  end if;

  insert into public.moderation_cases (
    report_type,
    report_id
  )
  values (
    _report_type,
    _report_id
  )
  on conflict (report_type, report_id)
  do nothing
  returning id into new_case_id;

  if new_case_id is null then
    select id
    into new_case_id
    from public.moderation_cases
    where report_type = _report_type
      and report_id = _report_id;
  end if;

  return new_case_id;
end;
$$;

revoke all on function public.create_moderation_case(text, uuid)
from public, anon;

grant execute
on function public.create_moderation_case(text, uuid)
to authenticated;

-- ============================================================
-- LISTAGEM ADMINISTRATIVA
-- ============================================================

create or replace function public.admin_list_moderation_cases(
  _status text default null
)
returns table (
  id uuid,
  report_type text,
  report_id uuid,
  status text,
  assigned_to uuid,
  assigned_username text,
  assigned_display_name text,
  decision text,
  internal_notes text,
  created_at timestamptz,
  reviewed_at timestamptz,
  updated_at timestamptz
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

  if _status is not null
     and _status not in (
       'pending',
       'under_review',
       'resolved',
       'dismissed'
     ) then
    raise exception 'Status de moderação inválido';
  end if;

  return query
  select
    mc.id,
    mc.report_type,
    mc.report_id,
    mc.status,
    mc.assigned_to,
    p.username,
    trim(
      coalesce(p.nome, '') || ' ' ||
      coalesce(p.sobrenome, '')
    ),
    mc.decision,
    mc.internal_notes,
    mc.created_at,
    mc.reviewed_at,
    mc.updated_at
  from public.moderation_cases mc
  left join public.profiles p
    on p.id = mc.assigned_to
  where (
    _status is null
    or mc.status = _status
  )
  order by
    case mc.status
      when 'pending' then 0
      when 'under_review' then 1
      when 'resolved' then 2
      when 'dismissed' then 3
      else 4
    end,
    mc.created_at desc;

end;
$$;

revoke all on function public.admin_list_moderation_cases(text)
from public, anon;

grant execute
on function public.admin_list_moderation_cases(text)
to authenticated;

-- ============================================================
-- ATUALIZAÇÃO DE CASO
-- ============================================================

create or replace function public.admin_update_moderation_case(
  _case_id uuid,
  _status text,
  _decision text default null,
  _internal_notes text default null
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
    'pending',
    'under_review',
    'resolved',
    'dismissed'
  ) then
    raise exception 'Status de moderação inválido';
  end if;

  if _decision is not null
     and _decision not in (
       'no_action',
       'content_removed',
       'content_restricted',
       'account_restricted',
       'account_suspended',
       'account_banned',
       'community_action',
       'other'
     ) then
    raise exception 'Decisão de moderação inválida';
  end if;

  update public.moderation_cases
  set
    status = _status,
    assigned_to = case
      when _status = 'pending'
        then assigned_to
      else auth.uid()
    end,
    decision = _decision,
    internal_notes = nullif(
      trim(coalesce(_internal_notes, '')),
      ''
    ),
    reviewed_at = case
      when _status in ('resolved', 'dismissed')
        then now()
      else null
    end
  where id = _case_id;

  if not found then
    raise exception 'Caso de moderação não encontrado';
  end if;

end;
$$;

revoke all on function public.admin_update_moderation_case(
  uuid,
  text,
  text,
  text
)
from public, anon;

grant execute
on function public.admin_update_moderation_case(
  uuid,
  text,
  text,
  text
)
to authenticated;

-- ============================================================
-- ATRIBUIÇÃO DE MODERADOR
-- ============================================================

create or replace function public.admin_assign_moderation_case(
  _case_id uuid,
  _assigned_to uuid
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
     and not public.is_platform_admin(_assigned_to) then
    raise exception 'Usuário não pertence à equipe administrativa';
  end if;

  update public.moderation_cases
  set
    assigned_to = _assigned_to
  where id = _case_id;

  if not found then
    raise exception 'Caso de moderação não encontrado';
  end if;

end;
$$;

revoke all on function public.admin_assign_moderation_case(
  uuid,
  uuid
)
from public, anon;

grant execute
on function public.admin_assign_moderation_case(
  uuid,
  uuid
)
to authenticated;

-- ============================================================
-- COMENTÁRIOS
-- ============================================================

comment on table public.moderation_cases is
'Tibo platform moderation cases linked to existing report tables.';

comment on column public.moderation_cases.report_type is
'Original report source: post, comment or community.';

comment on column public.moderation_cases.report_id is
'ID of the original report row.';

comment on column public.moderation_cases.internal_notes is
'Private administrative notes. Never exposed to regular users.';

