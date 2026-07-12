-- Trafic du site SaaS (pages marketing/tarifs/inscription/app), distinct
-- des scans de QR qui existent déjà (qr_scans). Table volontairement
-- anonyme : ni IP, ni user-agent complet, ni identifiant utilisateur — même
-- pour un visiteur connecté. TODO rétention : purger au-delà de ~18 mois
-- une fois le volume réel connu (pas de job à construire maintenant).
create table if not exists public.site_visits (
  id uuid primary key default gen_random_uuid(),
  path text not null,
  referrer_host text,
  device text,
  country text,
  visited_at timestamptz not null default now()
);
create index if not exists site_visits_visited_at_idx
  on public.site_visits (visited_at desc);

alter table public.site_visits enable row level security;

-- Lecture réservée à l'admin. Aucune policy INSERT pour authenticated/anon :
-- seul service_role (proxy.ts, via createAdminClient) peut écrire — même
-- principe que qr_scans/record_scan.
drop policy if exists "site_visits_select" on public.site_visits;
create policy "site_visits_select" on public.site_visits
  for select using (public.is_admin());

-- Visites par jour sur les N derniers jours (jours vides inclus, à 0) —
-- miroir de scans_per_day().
create or replace function public.site_visits_per_day(p_days int default 30)
returns table(day date, visits bigint)
language sql
stable
security definer
set search_path = public
as $$
  select d.day::date, count(v.id)
  from generate_series(
    current_date - (p_days - 1),
    current_date,
    interval '1 day'
  ) as d(day)
  left join public.site_visits v
    on v.visited_at >= d.day
   and v.visited_at < d.day + interval '1 day'
  where public.is_admin()
  group by d.day
  order by d.day;
$$;

-- Répartitions (pages, référents, appareils) sur N jours — miroir de
-- scan_breakdowns().
create or replace function public.site_visits_breakdowns(
  p_days int default 30,
  p_limit int default 8
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with visits as (
    select path, referrer_host, device
    from public.site_visits
    where visited_at >= current_date - (p_days - 1)
      and public.is_admin()
  ),
  agg as (
    select
      (select count(*) from visits) as total,
      (select coalesce(jsonb_agg(jsonb_build_object('label', label, 'count', c) order by c desc), '[]'::jsonb)
       from (select path as label, count(*) as c from visits group by 1 order by 2 desc limit p_limit) x) as paths,
      (select coalesce(jsonb_agg(jsonb_build_object('label', label, 'count', c) order by c desc), '[]'::jsonb)
       from (select referrer_host as label, count(*) as c from visits where referrer_host is not null group by 1 order by 2 desc limit p_limit) x) as referrers,
      (select coalesce(jsonb_agg(jsonb_build_object('label', label, 'count', c) order by c desc), '[]'::jsonb)
       from (select device as label, count(*) as c from visits where device is not null group by 1 order by 2 desc limit p_limit) x) as devices
  )
  select jsonb_build_object('total', total, 'paths', paths, 'referrers', referrers, 'devices', devices)
  from agg;
$$;
