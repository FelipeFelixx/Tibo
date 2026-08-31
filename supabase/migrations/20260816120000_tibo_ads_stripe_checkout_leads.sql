-- Tibo Ads 3.0: prepaid campaign funding + Stripe Checkout + CPL lead billing.
-- Stripe card data never enters the Tibo database.

alter type public.ad_event_type add value if not exists 'lead';

alter table public.ad_campaigns
  add column if not exists currency text not null default 'USD',
  add column if not exists funded_amount numeric(12,2) not null default 0 check (funded_amount >= 0),
  add column if not exists cost_per_lead numeric(12,2) not null default 0 check (cost_per_lead >= 0),
  add column if not exists last_payment_at timestamptz;

alter table public.ad_campaigns
  drop constraint if exists ad_campaigns_currency_supported;
alter table public.ad_campaigns
  add constraint ad_campaigns_currency_supported check (upper(currency) in ('BRL','USD'));

alter table public.ad_accounts
  drop constraint if exists ad_accounts_currency_supported;
alter table public.ad_accounts
  add constraint ad_accounts_currency_supported check (upper(currency) in ('BRL','USD'));

create table if not exists public.ad_checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  ad_account_id uuid not null references public.ad_accounts(id) on delete cascade,
  campaign_id uuid not null references public.ad_campaigns(id) on delete cascade,
  stripe_session_id text not null unique,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null check (upper(currency) in ('BRL','USD')),
  status text not null default 'created' check (status in ('created','paid','failed','expired')),
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists ad_checkout_sessions_campaign_idx on public.ad_checkout_sessions(campaign_id, created_at desc);
create index if not exists ad_checkout_sessions_business_idx on public.ad_checkout_sessions(business_id, created_at desc);

create table if not exists public.stripe_webhook_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text not null unique,
  event_type text not null,
  processed_at timestamptz not null default now()
);

create table if not exists public.ad_leads (
  id uuid primary key default gen_random_uuid(),
  creative_id uuid not null references public.ad_creatives(id) on delete cascade,
  campaign_id uuid not null references public.ad_campaigns(id) on delete cascade,
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  name text,
  email text,
  phone text,
  consent_at timestamptz not null default now(),
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  check (email is not null or phone is not null)
);

create index if not exists ad_leads_campaign_idx on public.ad_leads(campaign_id, created_at desc);
create index if not exists ad_leads_viewer_idx on public.ad_leads(viewer_id, created_at desc);

alter table public.ad_checkout_sessions enable row level security;
alter table public.stripe_webhook_events enable row level security;
alter table public.ad_leads enable row level security;

create policy "business members read checkout sessions"
on public.ad_checkout_sessions for select to authenticated
using (public.is_business_member(business_id, auth.uid()));

create policy "business members read leads"
on public.ad_leads for select to authenticated
using (exists (
  select 1 from public.ad_campaigns ac
  where ac.id = campaign_id and public.is_business_member(ac.business_id, auth.uid())
));

revoke all on public.stripe_webhook_events from anon, authenticated;
revoke all on public.ad_checkout_sessions from anon;
revoke all on public.ad_leads from anon;

-- Only verified businesses with active ad accounts may create/activate campaigns.
create or replace function public.can_run_ads(_business_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.businesses b
    where b.id = _business_id
      and b.status = 'active'
      and b.verification_status = 'verified'
  )
  and exists (
    select 1 from public.ad_accounts a
    where a.business_id = _business_id and a.status = 'active'
  );
$$;

create or replace function public.validate_campaign_activation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'active' then
    if not public.can_run_ads(new.business_id) then
      raise exception 'A empresa precisa estar verificada e com a conta de anúncios ativa.';
    end if;
    if coalesce(new.funded_amount, 0) <= coalesce(new.spent, 0) then
      raise exception 'A campanha precisa ter saldo pago antes de ser ativada.';
    end if;
    if not exists (select 1 from public.ad_creatives c where c.campaign_id = new.id) then
      raise exception 'Adicione pelo menos um criativo antes de ativar a campanha.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists validate_campaign_activation on public.ad_campaigns;
create trigger validate_campaign_activation
before insert or update on public.ad_campaigns
for each row execute function public.validate_campaign_activation();

-- Delivery only uses campaigns with prepaid balance. Ranking is intentionally simple:
-- audience match first, then remaining balance, then freshness, with a small deterministic
-- per-viewer rotation so one campaign does not monopolize the feed.
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
  video_path text,
  objective public.ad_objective,
  cost_per_lead numeric,
  currency text
)
language plpgsql stable security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then return; end if;
  return query
  with candidates as (
    select
      c.id,
      c.campaign_id,
      ac.business_id,
      b.name,
      b.avatar_path,
      c.headline,
      c.body,
      c.cta_label,
      c.destination_url,
      c.image_path,
      c.video_path,
      ac.objective,
      ac.cost_per_lead,
      ac.currency,
      greatest(ac.funded_amount - ac.spent, 0) as remaining,
      case when cardinality(ac.target_locations) = 0 then 1
           when lower(coalesce(p.cidade,'') || ', ' || coalesce(p.estado,'')) = any(select lower(x) from unnest(ac.target_locations) x) then 3
           else 0 end as location_match,
      extract(epoch from (now() - ac.created_at)) as age_seconds,
      abs(hashtextextended(c.id::text || ':' || uid::text, 0)) as rotation
    from public.ad_creatives c
    join public.ad_campaigns ac on ac.id = c.campaign_id
    join public.businesses b on b.id = ac.business_id
    join public.profiles p on p.id = uid
    where public.can_run_ads(ac.business_id)
      and ac.status = 'active'
      and (ac.start_at is null or ac.start_at <= now())
      and (ac.end_at is null or ac.end_at >= now())
      and ac.funded_amount > ac.spent
      and (ac.target_age_min is null or p.data_nascimento is null or date_part('year', age(current_date, p.data_nascimento)) >= ac.target_age_min)
      and (ac.target_age_max is null or p.data_nascimento is null or date_part('year', age(current_date, p.data_nascimento)) <= ac.target_age_max)
      and (cardinality(ac.target_locations) = 0 or lower(coalesce(p.cidade,'') || ', ' || coalesce(p.estado,'')) = any(select lower(x) from unnest(ac.target_locations) x))
  )
  select
    id, campaign_id, business_id, name, avatar_path, headline, body, cta_label,
    destination_url, image_path, video_path, objective, cost_per_lead, currency
  from candidates
  order by location_match desc,
           remaining desc,
           age_seconds asc,
           rotation asc
  limit greatest(1, least(coalesce(_limit,3), 10));
end;
$$;

-- Normal engagement events do not spend budget. Lead events are handled atomically below.
create or replace function public.track_ad_event(_creative_id uuid, _event_type public.ad_event_type)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  new_id uuid;
begin
  if uid is null then raise exception 'Não autenticado'; end if;
  if _event_type = 'lead' then
    raise exception 'Use track_ad_lead para registrar leads.';
  end if;
  if not exists (
    select 1 from public.ad_creatives c
    join public.ad_campaigns ac on ac.id = c.campaign_id
    join public.businesses b on b.id = ac.business_id
    where c.id = _creative_id
      and b.status = 'active'
      and ac.status = 'active'
      and ac.funded_amount > ac.spent
  ) then
    raise exception 'Anúncio indisponível';
  end if;
  insert into public.ad_events(creative_id, viewer_id, event_type)
  values (_creative_id, uid, _event_type)
  returning id into new_id;
  return new_id;
end;
$$;

create or replace function public.track_ad_lead(
  _creative_id uuid,
  _name text default null,
  _email text default null,
  _phone text default null,
  _idempotency_key text default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  creative_row record;
  campaign_row record;
  lead_id uuid;
  charge numeric(12,2);
begin
  if uid is null then raise exception 'Não autenticado'; end if;
  if nullif(trim(coalesce(_email,'')), '') is null and nullif(trim(coalesce(_phone,'')), '') is null then
    raise exception 'Informe e-mail ou telefone';
  end if;
  if nullif(trim(coalesce(_idempotency_key,'')), '') is null then
    raise exception 'Chave de envio inválida';
  end if;

  select c.id, c.campaign_id into creative_row
  from public.ad_creatives c where c.id = _creative_id;
  if creative_row.id is null then raise exception 'Anúncio indisponível'; end if;

  select ac.* into campaign_row
  from public.ad_campaigns ac
  where ac.id = creative_row.campaign_id
  for update;

  if campaign_row.objective <> 'leads' or campaign_row.status <> 'active' then
    raise exception 'Este anúncio não está recebendo leads agora';
  end if;
  if not public.can_run_ads(campaign_row.business_id) then raise exception 'Anúncio indisponível'; end if;

  select id into lead_id from public.ad_leads where idempotency_key = _idempotency_key;
  if lead_id is not null then return lead_id; end if;

  charge := greatest(coalesce(campaign_row.cost_per_lead, 0), 0);
  if charge <= 0 then raise exception 'Custo por lead não configurado'; end if;
  if campaign_row.funded_amount - campaign_row.spent < charge then
    raise exception 'O orçamento desta campanha acabou';
  end if;

  insert into public.ad_leads(creative_id, campaign_id, viewer_id, name, email, phone, idempotency_key)
  values (
    _creative_id, campaign_row.id, uid,
    nullif(trim(_name), ''), nullif(trim(_email), ''), nullif(trim(_phone), ''), trim(_idempotency_key)
  ) returning id into lead_id;

  insert into public.ad_events(creative_id, viewer_id, event_type)
  values (_creative_id, uid, 'lead');

  update public.ad_campaigns
  set spent = spent + charge,
      status = case when spent + charge >= funded_amount then 'completed'::public.ad_campaign_status else status end,
      updated_at = now()
  where id = campaign_row.id;

  return lead_id;
end;
$$;

revoke all on function public.track_ad_lead(uuid,text,text,text,text) from public, anon;
grant execute on function public.track_ad_lead(uuid,text,text,text,text) to authenticated;
revoke all on function public.track_ad_event(uuid,public.ad_event_type) from public, anon;
grant execute on function public.track_ad_event(uuid,public.ad_event_type) to authenticated;
revoke all on function public.get_active_ads(integer) from public, anon;
grant execute on function public.get_active_ads(integer) to authenticated;

-- A verified business receives an active ad account; payment is still required per campaign.
create or replace function public.admin_review_business_verification(
  _business_id uuid,
  _status public.business_verification_status,
  _reviewer_notes text default null
)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_platform_admin(auth.uid()) then raise exception 'Acesso administrativo negado'; end if;
  if _status not in ('under_review','verified','rejected','pending') then raise exception 'Status inválido'; end if;
  update public.business_verifications
  set status = _status,
      reviewer_notes = nullif(trim(coalesce(_reviewer_notes, '')), ''),
      reviewed_at = case when _status in ('verified','rejected') then now() else null end,
      updated_at = now()
  where business_id = _business_id;
  if not found then raise exception 'Verificação não encontrada'; end if;
  update public.businesses
  set verification_status = _status,
      verification_notes = nullif(trim(coalesce(_reviewer_notes, '')), ''),
      verified_at = case when _status = 'verified' then now() else null end,
      updated_at = now()
  where id = _business_id;
  update public.ad_accounts
  set status = case when _status = 'verified' then 'active'::public.ad_account_status
                    when _status = 'rejected' then 'suspended'::public.ad_account_status
                    else status end,
      updated_at = now()
  where business_id = _business_id;
end;
$$;

create or replace function public.get_business_billing(_business_id uuid)
returns table (
  status public.billing_status,
  provider text,
  default_currency text,
  last4 text,
  brand text,
  payment_configured boolean
)
language sql stable security definer set search_path = public as $$
  select
    bp.status,
    bp.provider,
    bp.default_currency,
    bp.last4,
    bp.brand,
    exists (
      select 1 from public.ad_billing_transactions t
      where t.business_id = bp.business_id and t.status = 'paid'
    ) as payment_configured
  from public.billing_profiles bp
  where bp.business_id = _business_id and public.is_business_member(_business_id, auth.uid());
$$;

revoke all on function public.get_business_billing(uuid) from public, anon;
grant execute on function public.get_business_billing(uuid) to authenticated;

create or replace function public.settle_ad_checkout(
  _stripe_session_id text,
  _provider_transaction_id text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  checkout_row public.ad_checkout_sessions%rowtype;
  campaign_row public.ad_campaigns%rowtype;
  business_row public.businesses%rowtype;
  account_row public.ad_accounts%rowtype;
  has_creative boolean;
  new_funded numeric(12,2);
begin
  select * into checkout_row
  from public.ad_checkout_sessions
  where stripe_session_id = _stripe_session_id
  for update;
  if checkout_row.id is null or checkout_row.status = 'paid' then return false; end if;

  select * into campaign_row from public.ad_campaigns where id = checkout_row.campaign_id for update;
  select * into business_row from public.businesses where id = checkout_row.business_id;
  select * into account_row from public.ad_accounts where id = checkout_row.ad_account_id;
  select exists(select 1 from public.ad_creatives where campaign_id = campaign_row.id) into has_creative;

  new_funded := coalesce(campaign_row.funded_amount, 0) + checkout_row.amount;

  update public.ad_checkout_sessions
  set status = 'paid', paid_at = now()
  where id = checkout_row.id;

  insert into public.ad_billing_transactions(
    business_id, ad_account_id, campaign_id, provider, provider_transaction_id,
    amount, currency, status, description, processed_at
  ) values (
    checkout_row.business_id, checkout_row.ad_account_id, checkout_row.campaign_id,
    'stripe', _provider_transaction_id, checkout_row.amount, checkout_row.currency,
    'paid', 'Crédito pré-pago Tibo Ads — ' || campaign_row.name, now()
  );

  update public.billing_profiles
  set provider = 'stripe', status = 'active', default_currency = checkout_row.currency, updated_at = now()
  where business_id = checkout_row.business_id;

  update public.ad_campaigns
  set funded_amount = new_funded,
      last_payment_at = now(),
      status = case
        when business_row.status = 'active'
         and business_row.verification_status = 'verified'
         and account_row.status = 'active'
         and has_creative
         and campaign_row.status in ('draft','pending') then 'active'::public.ad_campaign_status
        else 'pending'::public.ad_campaign_status
      end,
      updated_at = now()
  where id = campaign_row.id;

  return true;
end;
$$;

revoke all on function public.settle_ad_checkout(text,text) from public, anon, authenticated;
