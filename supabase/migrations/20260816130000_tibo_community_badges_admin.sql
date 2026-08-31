-- Tibo: community media/editing, profile badges, platform admin team and overview.

-- Community media bucket already has policies in earlier migrations; make sure the bucket exists.
insert into storage.buckets (id, name, public)
values ('community-media', 'community-media', false)
on conflict (id) do nothing;

-- Private communities remain discoverable so non-members can request entry.
drop policy if exists "Comunidades publicas visiveis; privadas so para membros" on public.communities;
create policy "Comunidades publicas e privadas sao descobriveis"
on public.communities for select
using (visibility = 'publica' or auth.uid() is not null);

-- Platform badges.
create table if not exists public.tibo_badges (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 80),
  description text,
  image_path text not null,
  category text,
  level integer not null default 1 check (level between 1 and 999),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_id uuid not null references public.tibo_badges(id) on delete cascade,
  granted_by uuid references public.profiles(id) on delete set null,
  granted_at timestamptz not null default now(),
  is_visible boolean not null default true,
  display_order integer not null default 0,
  unique (user_id, badge_id)
);

alter table public.tibo_badges enable row level security;
alter table public.user_badges enable row level security;
grant select on public.tibo_badges to authenticated;
grant select, update on public.user_badges to authenticated;
grant all on public.tibo_badges, public.user_badges to service_role;

drop policy if exists "badges active visible" on public.tibo_badges;
create policy "badges active visible" on public.tibo_badges for select to authenticated using (active or public.is_platform_admin(auth.uid()));

drop policy if exists "users read badges" on public.user_badges;
create policy "users read badges" on public.user_badges for select to authenticated using (true);

drop policy if exists "users manage own badge display" on public.user_badges;
create policy "users manage own badge display" on public.user_badges for update to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

insert into storage.buckets (id, name, public)
values ('tibo-badges', 'tibo-badges', false)
on conflict (id) do nothing;

drop policy if exists "badge images admin read" on storage.objects;
create policy "badge images admin read" on storage.objects for select to authenticated
using (bucket_id = 'tibo-badges' and (public.is_platform_admin(auth.uid()) or exists (
  select 1 from public.tibo_badges b where b.image_path = storage.objects.name and b.active
)));

drop policy if exists "badge images admin write" on storage.objects;
create policy "badge images admin write" on storage.objects for insert to authenticated
with check (bucket_id = 'tibo-badges' and public.is_platform_admin(auth.uid()));

drop policy if exists "badge images admin update" on storage.objects;
create policy "badge images admin update" on storage.objects for update to authenticated
using (bucket_id = 'tibo-badges' and public.is_platform_admin(auth.uid()));

drop policy if exists "badge images admin delete" on storage.objects;
create policy "badge images admin delete" on storage.objects for delete to authenticated
using (bucket_id = 'tibo-badges' and public.is_platform_admin(auth.uid()));

-- Admin team management. Only the platform owner can add/remove/change staff roles.
create or replace function public.admin_list_platform_team()
returns table (user_id uuid, username text, display_name text, role text, created_at timestamptz)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not exists (select 1 from public.platform_admins where user_id = auth.uid() and role = 'owner') then
    raise exception 'Acesso de proprietário administrativo negado';
  end if;
  return query
  select pa.user_id, p.username,
         trim(coalesce(p.nome,'') || ' ' || coalesce(p.sobrenome,'')),
         pa.role, pa.created_at
  from public.platform_admins pa
  join public.profiles p on p.id = pa.user_id
  order by pa.created_at asc;
end;
$$;

grant execute on function public.admin_list_platform_team() to authenticated;

create or replace function public.admin_upsert_platform_team(_user_id uuid, _role text)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not exists (select 1 from public.platform_admins where user_id = auth.uid() and role = 'owner') then
    raise exception 'Acesso de proprietário administrativo negado';
  end if;
  if _role not in ('owner','reviewer','support') then raise exception 'Função administrativa inválida'; end if;
  insert into public.platform_admins(user_id, role) values (_user_id, _role)
  on conflict (user_id) do update set role = excluded.role;
end;
$$;

grant execute on function public.admin_upsert_platform_team(uuid,text) to authenticated;

create or replace function public.admin_remove_platform_team(_user_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not exists (select 1 from public.platform_admins where user_id = auth.uid() and role = 'owner') then
    raise exception 'Acesso de proprietário administrativo negado';
  end if;
  if _user_id = auth.uid() then raise exception 'O proprietário atual nao pode remover a si mesmo'; end if;
  delete from public.platform_admins where user_id = _user_id;
end;
$$;

grant execute on function public.admin_remove_platform_team(uuid) to authenticated;

create or replace function public.admin_overview()
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare result jsonb;
begin
  if not public.is_platform_admin(auth.uid()) then raise exception 'Acesso administrativo negado'; end if;
  select jsonb_build_object(
    'users', (select count(*) from public.profiles),
    'active_users_30d', (select count(*) from public.profiles where updated_at >= now() - interval '30 days'),
    'posts', (select count(*) from public.posts),
    'clips', (select count(*) from public.post_videos),
    'communities', (select count(*) from public.communities),
    'businesses', (select count(*) from public.businesses),
    'verified_businesses', (select count(*) from public.businesses where verification_status = 'verified'),
    'pending_business_reviews', (select count(*) from public.business_verifications where status in ('pending','under_review')),
    'active_campaigns', (select count(*) from public.ad_campaigns where status = 'active'),
    'leads', (select count(*) from public.ad_leads),
    'badges', (select count(*) from public.tibo_badges),
    'badge_grants', (select count(*) from public.user_badges),
    'reports', (select count(*) from public.post_reports)
  ) into result;
  return result;
end;
$$;

grant execute on function public.admin_overview() to authenticated;

create or replace function public.admin_grant_badge(_user_id uuid, _badge_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_platform_admin(auth.uid()) then raise exception 'Acesso administrativo negado'; end if;
  if not exists (select 1 from public.tibo_badges where id = _badge_id) then raise exception 'Emblema nao encontrado'; end if;
  insert into public.user_badges(user_id,badge_id,granted_by)
  values (_user_id,_badge_id,auth.uid())
  on conflict (user_id,badge_id) do update set is_visible = true;
end;
$$;

grant execute on function public.admin_grant_badge(uuid,uuid) to authenticated;

create or replace function public.admin_revoke_badge(_user_id uuid, _badge_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_platform_admin(auth.uid()) then raise exception 'Acesso administrativo negado'; end if;
  delete from public.user_badges where user_id = _user_id and badge_id = _badge_id;
end;
$$;

grant execute on function public.admin_revoke_badge(uuid,uuid) to authenticated;

create or replace function public.admin_create_badge(_name text, _description text, _image_path text, _category text, _level integer)
returns uuid language plpgsql security definer set search_path = public
as $$
declare new_id uuid;
begin
  if not public.is_platform_admin(auth.uid()) then raise exception 'Acesso administrativo negado'; end if;
  insert into public.tibo_badges(name,description,image_path,category,level)
  values (trim(_name), nullif(trim(coalesce(_description,'')),''), _image_path, nullif(trim(coalesce(_category,'')),''), coalesce(_level,1))
  returning id into new_id;
  return new_id;
end;
$$;

grant execute on function public.admin_create_badge(text,text,text,text,integer) to authenticated;

create or replace function public.get_my_badges()
returns table (id uuid, badge_id uuid, name text, description text, image_path text, category text, level integer, is_visible boolean, display_order integer, granted_at timestamptz)
language sql stable security definer set search_path = public
as $$
  select ub.id,b.id,b.name,b.description,b.image_path,b.category,b.level,ub.is_visible,ub.display_order,ub.granted_at
  from public.user_badges ub join public.tibo_badges b on b.id = ub.badge_id
  where ub.user_id = auth.uid() and b.active
  order by ub.is_visible desc, ub.display_order asc, ub.granted_at desc;
$$;

grant execute on function public.get_my_badges() to authenticated;

create or replace function public.set_my_badge_visibility(_user_badge_id uuid, _is_visible boolean, _display_order integer default 0)
returns void language plpgsql security definer set search_path = public
as $$
begin
  update public.user_badges
  set is_visible = _is_visible, display_order = greatest(coalesce(_display_order,0),0)
  where id = _user_badge_id and user_id = auth.uid();
  if not found then raise exception 'Emblema nao encontrado'; end if;
end;
$$;

grant execute on function public.set_my_badge_visibility(uuid,boolean,integer) to authenticated;

-- Keep updated_at on badge definitions.
drop trigger if exists tibo_badges_updated_at on public.tibo_badges;
create trigger tibo_badges_updated_at before update on public.tibo_badges
for each row execute function public.update_updated_at_column();

create or replace function public.get_user_badges(_user_id uuid)
returns table (id uuid, badge_id uuid, name text, description text, image_path text, category text, level integer, is_visible boolean, display_order integer, granted_at timestamptz)
language sql stable security definer set search_path = public
as $$
  select ub.id,b.id,b.name,b.description,b.image_path,b.category,b.level,ub.is_visible,ub.display_order,ub.granted_at
  from public.user_badges ub join public.tibo_badges b on b.id = ub.badge_id
  where ub.user_id = _user_id and ub.is_visible and b.active
  order by ub.display_order asc, ub.granted_at desc;
$$;

grant execute on function public.get_user_badges(uuid) to authenticated;

create or replace function public.admin_find_users(_query text default '')
returns table (user_id uuid, username text, display_name text)
language sql stable security definer set search_path = public
as $$
  select p.id,p.username,trim(coalesce(p.nome,'') || ' ' || coalesce(p.sobrenome,''))
  from public.profiles p
  where public.is_platform_admin(auth.uid())
    and (trim(coalesce(_query,'')) = '' or p.username ilike '%' || trim(_query) || '%' or p.nome ilike '%' || trim(_query) || '%')
  order by p.username
  limit 20;
$$;

grant execute on function public.admin_find_users(text) to authenticated;
