-- Tibo safety + legal baseline + platform Business review.
-- This migration intentionally does NOT invent legal advice. It records consent/versioning
-- and enforces a minimum signup age of 13 at the database trigger level.
-- Final legal texts and jurisdiction-specific age/parental-consent rules must be reviewed
-- by qualified counsel before commercial launch.

create table if not exists public.account_consents (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  terms_version text not null,
  privacy_version text not null,
  accepted_at timestamptz not null default now(),
  birth_date date not null,
  source text not null default 'signup_web',
  created_at timestamptz not null default now()
);

alter table public.account_consents enable row level security;
grant select on public.account_consents to authenticated;
grant all on public.account_consents to service_role;

drop policy if exists "users read own account consent" on public.account_consents;
create policy "users read own account consent"
on public.account_consents for select to authenticated
using (user_id = auth.uid());

create table if not exists public.platform_admins (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role text not null default 'reviewer' check (role in ('owner','reviewer','support')),
  created_at timestamptz not null default now()
);

alter table public.platform_admins enable row level security;
grant all on public.platform_admins to service_role;

create or replace function public.is_platform_admin(_uid uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.platform_admins
    where user_id = coalesce(_uid, auth.uid())
  );
$$;

revoke all on function public.is_platform_admin(uuid) from public, anon;
grant execute on function public.is_platform_admin(uuid) to authenticated;

create or replace function public.admin_list_business_verifications()
returns table (
  verification_id uuid,
  business_id uuid,
  business_name text,
  owner_id uuid,
  legal_name text,
  tax_id text,
  country text,
  legal_address text,
  contact_email text,
  website text,
  status public.business_verification_status,
  reviewer_notes text,
  submitted_at timestamptz,
  reviewed_at timestamptz
)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_platform_admin(auth.uid()) then
    raise exception 'Acesso administrativo negado';
  end if;

  return query
  select
    v.id,
    v.business_id,
    b.name,
    b.owner_id,
    v.legal_name,
    v.tax_id,
    v.country,
    v.legal_address,
    v.contact_email,
    v.website,
    v.status,
    v.reviewer_notes,
    v.submitted_at,
    v.reviewed_at
  from public.business_verifications v
  join public.businesses b on b.id = v.business_id
  order by
    case v.status
      when 'pending' then 0
      when 'under_review' then 1
      when 'verified' then 2
      else 3
    end,
    v.submitted_at desc;
end;
$$;

create or replace function public.admin_review_business_verification(
  _business_id uuid,
  _status public.business_verification_status,
  _reviewer_notes text default null
)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_platform_admin(auth.uid()) then
    raise exception 'Acesso administrativo negado';
  end if;

  if _status not in ('under_review','verified','rejected','pending') then
    raise exception 'Status inválido';
  end if;

  update public.business_verifications
  set status = _status,
      reviewer_notes = nullif(trim(coalesce(_reviewer_notes, '')), ''),
      reviewed_at = case when _status in ('verified','rejected') then now() else null end,
      updated_at = now()
  where business_id = _business_id;

  if not found then
    raise exception 'Verificação não encontrada';
  end if;

  update public.businesses
  set verification_status = _status,
      verification_notes = nullif(trim(coalesce(_reviewer_notes, '')), ''),
      verified_at = case when _status = 'verified' then now() else null end,
      updated_at = now()
  where id = _business_id;

  if _status = 'rejected' then
    update public.ad_accounts set status = 'suspended', updated_at = now()
    where business_id = _business_id;
  end if;
end;
$$;

revoke all on function public.admin_list_business_verifications() from public, anon;
revoke all on function public.admin_review_business_verification(uuid, public.business_verification_status, text) from public, anon;
grant execute on function public.admin_list_business_verifications() to authenticated;
grant execute on function public.admin_review_business_verification(uuid, public.business_verification_status, text) to authenticated;

-- Rebuild the signup trigger so new accounts must carry an age/consent record.
-- Existing accounts are not modified by this trigger.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  base_username text;
  final_username text;
  suffix int := 0;
  birth_date date;
  terms_version text;
  privacy_version text;
begin
  begin
    birth_date := nullif(NEW.raw_user_meta_data->>'data_nascimento','')::date;
  exception when others then
    raise exception 'Data de nascimento inválida';
  end;

  terms_version := nullif(trim(NEW.raw_user_meta_data->>'terms_version'), '');
  privacy_version := nullif(trim(NEW.raw_user_meta_data->>'privacy_version'), '');

  if birth_date is null then
    raise exception 'Data de nascimento é obrigatória';
  end if;

  if birth_date > current_date - interval '13 years' then
    raise exception 'O Tibo exige idade mínima de 13 anos nesta versão. Menores de 13 anos não podem criar conta sem um fluxo de consentimento parental aprovado.';
  end if;

  if terms_version is null or privacy_version is null then
    raise exception 'É necessário aceitar os Termos de Uso e a Política de Privacidade';
  end if;

  base_username := coalesce(
    NEW.raw_user_meta_data->>'username',
    regexp_replace(split_part(NEW.email, '@', 1), '[^a-zA-Z0-9_]', '', 'g')
  );

  if base_username is null or length(base_username) < 3 then
    base_username := 'user' || substr(NEW.id::text, 1, 8);
  end if;

  final_username := base_username;
  while exists (select 1 from public.profiles where username = final_username) loop
    suffix := suffix + 1;
    final_username := base_username || suffix::text;
  end loop;

  insert into public.profiles (id, username, nome, sobrenome, data_nascimento)
  values (
    NEW.id,
    final_username,
    NEW.raw_user_meta_data->>'nome',
    NEW.raw_user_meta_data->>'sobrenome',
    birth_date
  );

  insert into public.account_consents (
    user_id, terms_version, privacy_version, accepted_at, birth_date, source
  )
  values (
    NEW.id, terms_version, privacy_version, now(), birth_date, coalesce(NEW.raw_user_meta_data->>'consent_source','signup_web')
  );

  return NEW;
end;
$$;

revoke execute on function public.handle_new_user() from anon, authenticated, public;

comment on table public.account_consents is
'Records the signup legal-document versions and age declaration. Final legal/compliance review required before launch.';


create or replace function public.validate_profile_birth_date()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.data_nascimento is null then
    raise exception 'Data de nascimento é obrigatória';
  end if;

  if new.data_nascimento > current_date - interval '13 years' then
    raise exception 'A conta exige idade mínima de 13 anos';
  end if;

  if tg_op = 'UPDATE'
     and old.data_nascimento is not null
     and new.data_nascimento <> old.data_nascimento
     and auth.uid() is not null then
    raise exception 'A data de nascimento não pode ser alterada diretamente após o cadastro';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_profile_birth_date_trigger on public.profiles;
create trigger validate_profile_birth_date_trigger
before insert or update of data_nascimento on public.profiles
for each row execute function public.validate_profile_birth_date();

revoke execute on function public.validate_profile_birth_date() from anon, authenticated, public;
