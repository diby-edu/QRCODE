-- Support des ajouts admin : statut "remboursé" sur les paiements, revenus
-- par jour, stockage par utilisateur dans le listing admin, journal
-- d'activité.

-- ------------------------------------------------------------ Paiements
alter table public.payments drop constraint if exists payments_status_check;
alter table public.payments add constraint payments_status_check
  check (status in ('pending', 'completed', 'failed', 'cancelled', 'refunded'));

-- Revenus (paiements complétés) par jour sur N jours — SECURITY INVOKER :
-- la RLS de payments s'applique (l'admin voit tout, un utilisateur ne
-- verrait que les siens, mais seul l'admin appelle cette RPC en pratique).
create or replace function public.revenue_per_day(p_days int default 30)
returns table(day date, amount numeric)
language sql
stable
set search_path = public
as $$
  select d.day::date, coalesce(sum(p.amount), 0)
  from generate_series(
    current_date - (p_days - 1),
    current_date,
    interval '1 day'
  ) as d(day)
  left join public.payments p
    on p.created_at >= d.day
   and p.created_at < d.day + interval '1 day'
   and p.status = 'completed'
  group by d.day
  order by d.day;
$$;

-- ------------------------------------------------------------ Utilisateurs
-- Ajoute le stockage consommé (Mo) au listing admin existant. DROP requis :
-- Postgres refuse un CREATE OR REPLACE qui change le type de retour.
drop function if exists public.admin_list_users(text, int, int);
create function public.admin_list_users(
  p_search text default null,
  p_limit int default 100,
  p_offset int default 0
)
returns table (
  id uuid,
  email text,
  full_name text,
  role text,
  is_suspended boolean,
  created_at timestamptz,
  plan_id uuid,
  plan_name text,
  qr_count bigint,
  storage_mb numeric
)
language sql
stable
set search_path = public
as $$
  select
    p.id, p.email, p.full_name, p.role, p.is_suspended, p.created_at,
    pl.id, pl.name,
    (select count(*) from public.qr_codes q where q.user_id = p.id),
    round((public.user_storage_bytes(p.id) / 1024.0 / 1024.0)::numeric, 1)
  from public.profiles p
  left join public.subscriptions s on s.user_id = p.id and s.status = 'active'
  left join public.plans pl on pl.id = s.plan_id
  where p_search is null
     or p.email ilike '%' || p_search || '%'
     or p.full_name ilike '%' || p_search || '%'
  order by p.created_at desc
  limit p_limit offset p_offset;
$$;

-- ------------------------------------------------------------ Journal d'activité
create table if not exists public.admin_activity_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users(id) on delete set null,
  admin_email text,
  action text not null,
  target text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_activity_log_created_at_idx
  on public.admin_activity_log (created_at desc);

alter table public.admin_activity_log enable row level security;

drop policy if exists "admin_activity_log_select" on public.admin_activity_log;
create policy "admin_activity_log_select" on public.admin_activity_log
  for select using (public.is_admin());

drop policy if exists "admin_activity_log_insert" on public.admin_activity_log;
create policy "admin_activity_log_insert" on public.admin_activity_log
  for insert to authenticated with check (public.is_admin());
