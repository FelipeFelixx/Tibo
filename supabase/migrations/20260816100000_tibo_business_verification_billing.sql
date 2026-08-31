-- Tibo Business 2.0: verification, ad accounts and billing foundation.
-- Card data is NEVER stored in Tibo. Only provider references/tokens are stored.

create type public.business_verification_status as enum ('pending','under_review','verified','rejected');
create type public.ad_account_status as enum ('pending','active','suspended','closed');
create type public.billing_status as enum ('incomplete','active','past_due','suspended');
create type public.billing_transaction_status as enum ('pending','authorized','paid','failed','refunded');

alter table public.businesses
  add column if not exists verification_status public.business_verification_status not null default 'pending',
  add column if not exists tax_id text,
  add column if not exists legal_country text,
  add column if not exists legal_address text,
  add column if not exists verification_notes text,
  add column if not exists verified_at timestamptz;

create table if not exists public.business_verifications (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null unique references public.businesses(id) on delete cascade,
  legal_name text not null,
  tax_id text not null,
  country text not null,
  legal_address text not null,
  contact_email text not null,
  website text,
  document_paths text[] not null default '{}',
  status public.business_verification_status not null default 'pending',
  reviewer_notes text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ad_accounts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null unique references public.businesses(id) on delete cascade,
  account_name text not null,
  status public.ad_account_status not null default 'pending',
  currency text not null default 'USD',
  timezone text not null default 'UTC',
  daily_spend_limit numeric(12,2) not null default 0 check (daily_spend_limit >= 0),
  lifetime_spend_limit numeric(12,2) not null default 0 check (lifetime_spend_limit >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.billing_profiles (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null unique references public.businesses(id) on delete cascade,
  provider text not null default 'stripe',
  provider_customer_id text,
  provider_payment_method_id text,
  status public.billing_status not null default 'incomplete',
  default_currency text not null default 'USD',
  country text,
  last4 text,
  brand text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ad_billing_transactions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  ad_account_id uuid not null references public.ad_accounts(id) on delete cascade,
  campaign_id uuid references public.ad_campaigns(id) on delete set null,
  provider text not null,
  provider_transaction_id text,
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'USD',
  status public.billing_transaction_status not null default 'pending',
  description text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists business_verifications_status_idx on public.business_verifications(status);
create index if not exists ad_accounts_business_idx on public.ad_accounts(business_id);
create index if not exists billing_profiles_business_idx on public.billing_profiles(business_id);
create index if not exists ad_billing_transactions_business_idx on public.ad_billing_transactions(business_id, created_at desc);

insert into public.ad_accounts (business_id, account_name, currency)
select b.id, b.name || ' Ads', case when upper(coalesce(b.country, '')) = 'BR' then 'BRL' else 'USD' end
from public.businesses b
on conflict (business_id) do nothing;

insert into public.billing_profiles (business_id, country)
select b.id, b.country
from public.businesses b
on conflict (business_id) do nothing;

create or replace function public.touch_business_updated_at_v2()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;

drop trigger if exists businesses_updated_at_v2 on public.businesses;
create trigger businesses_updated_at_v2 before update on public.businesses for each row execute function public.touch_business_updated_at_v2();

drop trigger if exists business_verifications_updated_at on public.business_verifications;
create trigger business_verifications_updated_at before update on public.business_verifications for each row execute function public.touch_business_updated_at_v2();

drop trigger if exists ad_accounts_updated_at on public.ad_accounts;
create trigger ad_accounts_updated_at before update on public.ad_accounts for each row execute function public.touch_business_updated_at_v2();

drop trigger if exists billing_profiles_updated_at on public.billing_profiles;
create trigger billing_profiles_updated_at before update on public.billing_profiles for each row execute function public.touch_business_updated_at_v2();

create or replace function public.handle_business_commercial_setup()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.business_members(business_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (business_id, user_id) do update set role = 'owner';

  insert into public.ad_accounts(business_id, account_name, currency)
  values (new.id, new.name || ' Ads', case when upper(coalesce(new.country, '')) = 'BR' then 'BRL' else 'USD' end)
  on conflict (business_id) do nothing;

  insert into public.billing_profiles(business_id, country)
  values (new.id, new.country)
  on conflict (business_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_business_created_commercial_setup on public.businesses;
create trigger on_business_created_commercial_setup after insert on public.businesses for each row execute function public.handle_business_commercial_setup();

create or replace function public.submit_business_verification(
  _business_id uuid,
  _legal_name text,
  _tax_id text,
  _country text,
  _legal_address text,
  _contact_email text,
  _website text default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  verification_id uuid;
begin
  if uid is null or not public.can_manage_business(_business_id, uid) then raise exception 'Sem permissão'; end if;
  if length(trim(_legal_name)) < 2 or length(trim(_tax_id)) < 3 or length(trim(_country)) < 2 or length(trim(_legal_address)) < 5 then
    raise exception 'Preencha os dados legais obrigatórios';
  end if;
  insert into public.business_verifications(business_id, legal_name, tax_id, country, legal_address, contact_email, website, status, submitted_at, reviewed_at)
  values (_business_id, trim(_legal_name), trim(_tax_id), upper(trim(_country)), trim(_legal_address), trim(_contact_email), nullif(trim(_website), ''), 'pending', now(), null)
  on conflict (business_id) do update set legal_name = excluded.legal_name, tax_id = excluded.tax_id, country = excluded.country, legal_address = excluded.legal_address, contact_email = excluded.contact_email, website = excluded.website, status = 'pending', submitted_at = now(), reviewed_at = null, reviewer_notes = null
  returning id into verification_id;
  update public.businesses set verification_status = 'pending', tax_id = trim(_tax_id), legal_name = trim(_legal_name), legal_country = upper(trim(_country)), legal_address = trim(_legal_address), email = trim(_contact_email), website = nullif(trim(_website), '') where id = _business_id;
  return verification_id;
end;
$$;

create or replace function public.can_run_ads(_business_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.businesses b where b.id = _business_id and b.status = 'active' and b.verification_status = 'verified')
     and exists (select 1 from public.ad_accounts a where a.business_id = _business_id and a.status = 'active')
     and exists (select 1 from public.billing_profiles bp where bp.business_id = _business_id and bp.status = 'active' and bp.provider_payment_method_id is not null);
$$;

drop trigger if exists validate_campaign_activation on public.ad_campaigns;
create or replace function public.validate_campaign_activation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'active' and not public.can_run_ads(new.business_id) then
    raise exception 'A conta precisa estar verificada, com conta de anúncios ativa e forma de pagamento configurada antes de veicular anúncios.';
  end if;
  return new;
end;
$$;
create trigger validate_campaign_activation before insert or update on public.ad_campaigns for each row execute function public.validate_campaign_activation();

create or replace function public.get_business_billing(_business_id uuid)
returns table (status public.billing_status, provider text, default_currency text, last4 text, brand text, payment_configured boolean)
language sql stable security definer set search_path = public as $$
  select bp.status, bp.provider, bp.default_currency, bp.last4, bp.brand, (bp.provider_payment_method_id is not null)
  from public.billing_profiles bp
  where bp.business_id = _business_id and public.is_business_member(_business_id, auth.uid());
$$;

create or replace function public.get_business_verification(_business_id uuid)
returns table (status public.business_verification_status, legal_name text, tax_id text, country text, legal_address text, contact_email text, reviewer_notes text, submitted_at timestamptz, reviewed_at timestamptz)
language sql stable security definer set search_path = public as $$
  select v.status, v.legal_name, v.tax_id, v.country, v.legal_address, v.contact_email, v.reviewer_notes, v.submitted_at, v.reviewed_at
  from public.business_verifications v
  where v.business_id = _business_id and public.is_business_member(_business_id, auth.uid());
$$;

alter table public.business_verifications enable row level security;
alter table public.ad_accounts enable row level security;
alter table public.billing_profiles enable row level security;
alter table public.ad_billing_transactions enable row level security;

create policy "business verification members read" on public.business_verifications for select to authenticated using (public.is_business_member(business_id, auth.uid()));
create policy "business admins submit verification" on public.business_verifications for insert to authenticated with check (public.can_manage_business(business_id, auth.uid()));
create policy "business admins update verification" on public.business_verifications for update to authenticated using (public.can_manage_business(business_id, auth.uid())) with check (public.can_manage_business(business_id, auth.uid()));

create policy "business ad account members read" on public.ad_accounts for select to authenticated using (public.is_business_member(business_id, auth.uid()));
create policy "business ad account admins update" on public.ad_accounts for update to authenticated using (public.can_manage_business(business_id, auth.uid())) with check (public.can_manage_business(business_id, auth.uid()));

create policy "business billing members read" on public.billing_profiles for select to authenticated using (public.is_business_member(business_id, auth.uid()));
create policy "business billing admins update" on public.billing_profiles for update to authenticated using (public.can_manage_business(business_id, auth.uid())) with check (public.can_manage_business(business_id, auth.uid()));

create policy "business billing transactions read" on public.ad_billing_transactions for select to authenticated using (public.is_business_member(business_id, auth.uid()));

revoke all on function public.submit_business_verification(uuid,text,text,text,text,text,text) from public, anon;
revoke all on function public.can_run_ads(uuid) from public, anon;
revoke all on function public.get_business_billing(uuid) from public, anon;
revoke all on function public.get_business_verification(uuid) from public, anon;
grant execute on function public.submit_business_verification(uuid,text,text,text,text,text,text) to authenticated;
grant execute on function public.can_run_ads(uuid) to authenticated;
grant execute on function public.get_business_billing(uuid) to authenticated;
grant execute on function public.get_business_verification(uuid) to authenticated;


-- Only fully approved, funded ad accounts can enter delivery.
create or replace function public.get_active_ads(_limit integer default 3)
returns table (
  creative_id uuid, campaign_id uuid, business_id uuid, business_name text, business_avatar_path text,
  headline text, body text, cta_label text, destination_url text, image_path text, video_path text
) language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  return query
  select c.id, c.campaign_id, ac.business_id, b.name, b.avatar_path, c.headline, c.body, c.cta_label, c.destination_url, c.image_path, c.video_path
  from public.ad_creatives c
  join public.ad_campaigns ac on ac.id = c.campaign_id
  join public.businesses b on b.id = ac.business_id
  join public.profiles p on p.id = uid
  where uid is not null
    and public.can_run_ads(ac.business_id)
    and ac.status = 'active'
    and (ac.start_at is null or ac.start_at <= now())
    and (ac.end_at is null or ac.end_at >= now())
    and (ac.total_budget = 0 or ac.spent < ac.total_budget)
    and (ac.target_age_min is null or p.data_nascimento is null or date_part('year', age(current_date, p.data_nascimento)) >= ac.target_age_min)
    and (ac.target_age_max is null or p.data_nascimento is null or date_part('year', age(current_date, p.data_nascimento)) <= ac.target_age_max)
    and (cardinality(ac.target_locations) = 0 or lower(coalesce(p.cidade,'') || ', ' || coalesce(p.estado,'')) = any(select lower(x) from unnest(ac.target_locations) x))
  order by ac.created_at desc limit greatest(1, least(coalesce(_limit,3), 10));
end; $$;
