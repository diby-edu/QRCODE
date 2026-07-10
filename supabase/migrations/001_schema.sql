-- ============================================================
-- QRHub — schéma complet (tables, RLS, triggers, storage, seed)
-- ============================================================

-- ------------------------------------------------------------
-- Tables
-- ------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'admin')),
  language text not null default 'fr',
  is_suspended boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price_monthly numeric not null default 0,
  currency text not null default 'XOF',
  limits jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.plans(id),
  status text not null default 'active' check (status in ('active', 'expired', 'cancelled')),
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz,
  gateway text,
  created_at timestamptz not null default now()
);
create index if not exists subscriptions_user_id_idx on public.subscriptions (user_id);
create unique index if not exists subscriptions_one_active_idx
  on public.subscriptions (user_id) where status = 'active';

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  gateway text not null default 'paydunya',
  gateway_ref text,
  amount numeric not null,
  currency text not null default 'XOF',
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed', 'cancelled')),
  raw_response jsonb,
  created_at timestamptz not null default now()
);
create index if not exists payments_user_id_idx on public.payments (user_id);
create unique index if not exists payments_gateway_ref_idx
  on public.payments (gateway, gateway_ref) where gateway_ref is not null;

create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null default '#6366f1',
  created_at timestamptz not null default now()
);
create index if not exists folders_user_id_idx on public.folders (user_id);

create table if not exists public.qr_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  folder_id uuid references public.folders(id) on delete set null,
  type text not null,
  title text not null,
  slug text not null unique,
  qr_image text,
  is_dynamic boolean not null default true,
  is_active boolean not null default true,
  expires_at timestamptz,
  password text,
  scan_count bigint not null default 0,
  design jsonb not null default '{"fgColor":"#0f172a","bgColor":"#ffffff","dotStyle":"square","cornerStyle":"square","logoUrl":null}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists qr_codes_user_id_idx on public.qr_codes (user_id, created_at desc);
create index if not exists qr_codes_slug_idx on public.qr_codes (slug);

create table if not exists public.qr_code_data (
  id uuid primary key default gen_random_uuid(),
  qr_code_id uuid not null references public.qr_codes(id) on delete cascade,
  data jsonb not null default '{}'::jsonb
);
create unique index if not exists qr_code_data_qr_idx on public.qr_code_data (qr_code_id);

create table if not exists public.qr_scans (
  id uuid primary key default gen_random_uuid(),
  qr_code_id uuid not null references public.qr_codes(id) on delete cascade,
  country text,
  city text,
  device text,
  browser text,
  operating_system text,
  ip_address text,
  scanned_at timestamptz not null default now()
);
create index if not exists qr_scans_qr_idx on public.qr_scans (qr_code_id, scanned_at desc);

create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb
);

-- ------------------------------------------------------------
-- Fonctions & triggers
-- ------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Profil + abonnement Free créés automatiquement à l'inscription
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  free_plan_id uuid;
begin
  insert into public.profiles (id, full_name, language)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'language', 'fr')
  );

  select id into free_plan_id
  from public.plans
  where price_monthly = 0 and is_active
  order by sort_order
  limit 1;

  if free_plan_id is not null then
    insert into public.subscriptions (user_id, plan_id, status)
    values (new.id, free_plan_id, 'active');
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists qr_codes_updated_at on public.qr_codes;
create trigger qr_codes_updated_at
  before update on public.qr_codes
  for each row execute function public.set_updated_at();

-- Insertion d'un scan + incrément atomique du compteur
create or replace function public.record_scan(
  p_qr_code_id uuid,
  p_country text default null,
  p_city text default null,
  p_device text default null,
  p_browser text default null,
  p_os text default null,
  p_ip text default null
)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.qr_scans (qr_code_id, country, city, device, browser, operating_system, ip_address)
  values (p_qr_code_id, p_country, p_city, p_device, p_browser, p_os, p_ip);

  update public.qr_codes
  set scan_count = scan_count + 1
  where id = p_qr_code_id;
end;
$$;

-- Réservée au service_role (route de scan) : aucun accès client
revoke execute on function public.record_scan from public, anon, authenticated;

-- ------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.folders enable row level security;
alter table public.qr_codes enable row level security;
alter table public.qr_code_data enable row level security;
alter table public.qr_scans enable row level security;
alter table public.site_settings enable row level security;

-- profiles : chacun voit/modifie le sien, l'admin voit et modifie tout
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles
  for update using (id = auth.uid() or public.is_admin());

-- plans : lecture publique, écriture admin
drop policy if exists "plans_select" on public.plans;
create policy "plans_select" on public.plans for select using (true);
drop policy if exists "plans_admin_write" on public.plans;
create policy "plans_admin_write" on public.plans
  for all using (public.is_admin()) with check (public.is_admin());

-- subscriptions : lecture par le propriétaire ou l'admin ;
-- écriture uniquement admin (les activations passent par le service_role)
drop policy if exists "subscriptions_select" on public.subscriptions;
create policy "subscriptions_select" on public.subscriptions
  for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "subscriptions_admin_write" on public.subscriptions;
create policy "subscriptions_admin_write" on public.subscriptions
  for all using (public.is_admin()) with check (public.is_admin());

-- payments : lecture par le propriétaire ou l'admin
drop policy if exists "payments_select" on public.payments;
create policy "payments_select" on public.payments
  for select using (user_id = auth.uid() or public.is_admin());

-- folders : tout par le propriétaire
drop policy if exists "folders_all" on public.folders;
create policy "folders_all" on public.folders
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- qr_codes : tout par le propriétaire, lecture + suppression admin
drop policy if exists "qr_codes_owner" on public.qr_codes;
create policy "qr_codes_owner" on public.qr_codes
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "qr_codes_admin_select" on public.qr_codes;
create policy "qr_codes_admin_select" on public.qr_codes
  for select using (public.is_admin());
drop policy if exists "qr_codes_admin_delete" on public.qr_codes;
create policy "qr_codes_admin_delete" on public.qr_codes
  for delete using (public.is_admin());

-- qr_code_data : via la propriété du QR parent
drop policy if exists "qr_code_data_owner" on public.qr_code_data;
create policy "qr_code_data_owner" on public.qr_code_data
  for all using (
    exists (
      select 1 from public.qr_codes qc
      where qc.id = qr_code_id and qc.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.qr_codes qc
      where qc.id = qr_code_id and qc.user_id = auth.uid()
    )
  );
drop policy if exists "qr_code_data_admin_select" on public.qr_code_data;
create policy "qr_code_data_admin_select" on public.qr_code_data
  for select using (public.is_admin());

-- qr_scans : lecture par le propriétaire du QR ou l'admin.
-- Aucune politique d'insertion : seul le service_role écrit (route de scan).
drop policy if exists "qr_scans_select" on public.qr_scans;
create policy "qr_scans_select" on public.qr_scans
  for select using (
    public.is_admin() or exists (
      select 1 from public.qr_codes qc
      where qc.id = qr_code_id and qc.user_id = auth.uid()
    )
  );

-- site_settings : lecture publique, écriture admin
drop policy if exists "site_settings_select" on public.site_settings;
create policy "site_settings_select" on public.site_settings for select using (true);
drop policy if exists "site_settings_admin_write" on public.site_settings;
create policy "site_settings_admin_write" on public.site_settings
  for all using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------
-- Storage : buckets + politiques (fichiers rangés par user_id/)
-- ------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('logos', 'logos', true), ('uploads', 'uploads', true), ('qr-previews', 'qr-previews', true)
on conflict (id) do nothing;

drop policy if exists "storage_user_insert" on storage.objects;
create policy "storage_user_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('logos', 'uploads', 'qr-previews')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "storage_user_update" on storage.objects;
create policy "storage_user_update" on storage.objects
  for update to authenticated
  using (
    bucket_id in ('logos', 'uploads', 'qr-previews')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "storage_user_delete" on storage.objects;
create policy "storage_user_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id in ('logos', 'uploads', 'qr-previews')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "storage_public_read" on storage.objects;
create policy "storage_public_read" on storage.objects
  for select using (bucket_id in ('logos', 'uploads', 'qr-previews'));

-- ------------------------------------------------------------
-- Seed : plans Free/Pro (modifiables ensuite dans /admin/plans)
-- ------------------------------------------------------------

insert into public.plans (name, description, price_monthly, currency, limits, sort_order)
select 'Free', 'Pour découvrir', 0, 'XOF',
  '{"max_qr_codes": 5, "max_dynamic": 3, "max_scans_month": 300, "logo_enabled": false, "formats": ["png"], "stats_level": "basic", "folders_enabled": false, "password_enabled": false}'::jsonb,
  0
where not exists (select 1 from public.plans);

insert into public.plans (name, description, price_monthly, currency, limits, sort_order)
select 'Pro', 'Pour les professionnels', 5000, 'XOF',
  '{"max_qr_codes": -1, "max_dynamic": -1, "max_scans_month": -1, "logo_enabled": true, "formats": ["png", "svg", "pdf"], "stats_level": "full", "folders_enabled": true, "password_enabled": true}'::jsonb,
  1
where not exists (select 1 from public.plans where price_monthly > 0);

insert into public.site_settings (key, value)
values ('general', '{"site_name": "QRHub", "support_email": "", "logo_url": ""}'::jsonb)
on conflict (key) do nothing;
