-- Tibo Business + Tibo Ads
create type public.business_status as enum ('active','suspended');
create type public.business_member_role as enum ('owner','admin','analyst');
create type public.ad_campaign_status as enum ('draft','pending','active','paused','completed','rejected');
create type public.ad_objective as enum ('awareness','traffic','engagement','leads');
create type public.ad_event_type as enum ('impression','click','engagement');

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  slug text not null unique,
  legal_name text,
  category text,
  description text,
  website text,
  email text,
  phone text,
  city text,
  state text,
  country text,
  avatar_path text,
  cover_path text,
  status public.business_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.business_members (
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.business_member_role not null default 'analyst',
  created_at timestamptz not null default now(),
  primary key (business_id, user_id)
);

create table public.ad_campaigns (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  objective public.ad_objective not null default 'awareness',
  status public.ad_campaign_status not null default 'draft',
  daily_budget numeric(12,2) not null default 0 check (daily_budget >= 0),
  total_budget numeric(12,2) not null default 0 check (total_budget >= 0),
  spent numeric(12,2) not null default 0 check (spent >= 0),
  start_at timestamptz,
  end_at timestamptz,
  target_age_min smallint check (target_age_min is null or target_age_min between 13 and 100),
  target_age_max smallint check (target_age_max is null or target_age_max between 13 and 100),
  target_gender text,
  target_locations text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (target_age_max is null or target_age_min is null or target_age_min <= target_age_max)
);

create table public.ad_creatives (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.ad_campaigns(id) on delete cascade,
  headline text not null,
  body text,
  cta_label text not null default 'Saiba mais',
  destination_url text,
  image_path text,
  video_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (destination_url is null or destination_url ~* '^https?://'),
  check (image_path is not null or video_path is not null)
);

create table public.ad_events (
  id uuid primary key default gen_random_uuid(),
  creative_id uuid not null references public.ad_creatives(id) on delete cascade,
  viewer_id uuid references public.profiles(id) on delete set null,
  event_type public.ad_event_type not null,
  created_at timestamptz not null default now()
);

create index businesses_owner_idx on public.businesses(owner_id);
create index business_members_user_idx on public.business_members(user_id);
create index ad_campaigns_business_idx on public.ad_campaigns(business_id);
create index ad_campaigns_active_idx on public.ad_campaigns(status, start_at, end_at);
create index ad_creatives_campaign_idx on public.ad_creatives(campaign_id);
create index ad_events_creative_idx on public.ad_events(creative_id, event_type, created_at);

create or replace function public.is_business_member(_business_id uuid, _uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.business_members bm
    where bm.business_id = _business_id and bm.user_id = _uid
  );
$$;

create or replace function public.can_manage_business(_business_id uuid, _uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.businesses b where b.id = _business_id and b.owner_id = _uid
  ) or exists (
    select 1 from public.business_members bm
    where bm.business_id = _business_id and bm.user_id = _uid and bm.role in ('owner','admin')
  );
$$;

create or replace function public.get_active_ads(_limit integer default 3)
returns table (
  creative_id uuid,
  campaign_id uuid,
  business_id uuid,
  business_name text,
  business_avatar_path text,
  headline text,
  body text,
  cta_label text,
  destination_url text,
  image_path text,
  video_path text
)
language plpgsql stable security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  return query
  select c.id, c.campaign_id, c.business_id, b.name, b.avatar_path,
         c.headline, c.body, c.cta_label, c.destination_url, c.image_path, c.video_path
  from public.ad_creatives c
  join public.ad_campaigns ac on ac.id = c.campaign_id
  join public.businesses b on b.id = ac.business_id
  join public.profiles p on p.id = uid
  where uid is not null
    and b.status = 'active'
    and ac.status = 'active'
    and (ac.start_at is null or ac.start_at <= now())
    and (ac.end_at is null or ac.end_at >= now())
    and (ac.total_budget = 0 or ac.spent < ac.total_budget)
    and (ac.target_age_min is null or p.data_nascimento is null or date_part('year', age(current_date, p.data_nascimento)) >= ac.target_age_min)
    and (ac.target_age_max is null or p.data_nascimento is null or date_part('year', age(current_date, p.data_nascimento)) <= ac.target_age_max)
    and (cardinality(ac.target_locations) = 0 or lower(coalesce(p.cidade,'') || ', ' || coalesce(p.estado,'')) = any(select lower(x) from unnest(ac.target_locations) x))
  order by ac.created_at desc
  limit greatest(1, least(coalesce(_limit,3), 10));
end;
$$;

create or replace function public.track_ad_event(_creative_id uuid, _event_type public.ad_event_type)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  new_id uuid;
begin
  if uid is null then raise exception 'Não autenticado'; end if;
  if not exists (
    select 1 from public.ad_creatives c
    join public.ad_campaigns ac on ac.id = c.campaign_id
    join public.businesses b on b.id = ac.business_id
    where c.id = _creative_id and b.status = 'active' and ac.status = 'active'
  ) then
    raise exception 'Anúncio indisponível';
  end if;
  insert into public.ad_events(creative_id, viewer_id, event_type) values (_creative_id, uid, _event_type) returning id into new_id;
  return new_id;
end;
$$;

create or replace function public.handle_new_business()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.business_members(business_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (business_id, user_id) do update set role = 'owner';
  return new;
end;
$$;

create trigger on_business_created after insert on public.businesses for each row execute function public.handle_new_business();

create or replace function public.touch_business_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger businesses_updated_at before update on public.businesses for each row execute function public.touch_business_updated_at();
create trigger ad_campaigns_updated_at before update on public.ad_campaigns for each row execute function public.touch_business_updated_at();
create trigger ad_creatives_updated_at before update on public.ad_creatives for each row execute function public.touch_business_updated_at();

alter table public.businesses enable row level security;
alter table public.business_members enable row level security;
alter table public.ad_campaigns enable row level security;
alter table public.ad_creatives enable row level security;
alter table public.ad_events enable row level security;

create policy "business members read" on public.businesses for select to authenticated using (owner_id = auth.uid() or public.is_business_member(id, auth.uid()));
create policy "user creates business" on public.businesses for insert to authenticated with check (owner_id = auth.uid());
create policy "business admins update" on public.businesses for update to authenticated using (public.can_manage_business(id, auth.uid())) with check (public.can_manage_business(id, auth.uid()));
create policy "business owner deletes" on public.businesses for delete to authenticated using (owner_id = auth.uid());

create policy "members read members" on public.business_members for select to authenticated using (public.is_business_member(business_id, auth.uid()));
create policy "admins manage members" on public.business_members for all to authenticated using (public.can_manage_business(business_id, auth.uid())) with check (public.can_manage_business(business_id, auth.uid()));

create policy "business campaigns read" on public.ad_campaigns for select to authenticated using (public.is_business_member(business_id, auth.uid()));
create policy "business admins create campaigns" on public.ad_campaigns for insert to authenticated with check (public.can_manage_business(business_id, auth.uid()));
create policy "business admins update campaigns" on public.ad_campaigns for update to authenticated using (public.can_manage_business(business_id, auth.uid())) with check (public.can_manage_business(business_id, auth.uid()));
create policy "business admins delete campaigns" on public.ad_campaigns for delete to authenticated using (public.can_manage_business(business_id, auth.uid()));

create policy "business creatives read" on public.ad_creatives for select to authenticated using (exists (select 1 from public.ad_campaigns ac where ac.id = campaign_id and public.is_business_member(ac.business_id, auth.uid())));
create policy "business admins create creatives" on public.ad_creatives for insert to authenticated with check (exists (select 1 from public.ad_campaigns ac where ac.id = campaign_id and public.can_manage_business(ac.business_id, auth.uid())));
create policy "business admins update creatives" on public.ad_creatives for update to authenticated using (exists (select 1 from public.ad_campaigns ac where ac.id = campaign_id and public.can_manage_business(ac.business_id, auth.uid()))) with check (exists (select 1 from public.ad_campaigns ac where ac.id = campaign_id and public.can_manage_business(ac.business_id, auth.uid())));
create policy "business admins delete creatives" on public.ad_creatives for delete to authenticated using (exists (select 1 from public.ad_campaigns ac where ac.id = campaign_id and public.can_manage_business(ac.business_id, auth.uid())));

create policy "business events read" on public.ad_events for select to authenticated using (exists (select 1 from public.ad_creatives c join public.ad_campaigns ac on ac.id = c.campaign_id where c.id = creative_id and public.is_business_member(ac.business_id, auth.uid())));
create policy "viewer creates events" on public.ad_events for insert to authenticated with check (viewer_id = auth.uid());

grant execute on function public.get_active_ads(integer) to authenticated;
grant execute on function public.track_ad_event(uuid, public.ad_event_type) to authenticated;
grant execute on function public.is_business_member(uuid, uuid) to authenticated;
grant execute on function public.can_manage_business(uuid, uuid) to authenticated;
